import { createClient } from "./supabase/client"
import { ComputeEngine, type ComputeTask, type TaskResult } from "./compute-engine"

export interface TaskQueue {
  pending_tasks: ComputeTask[]
  active_tasks: ComputeTask[]
  completed_tasks: string[]
}

export class TaskCoordinator {
  private computeEngine: ComputeEngine
  private supabase = createClient()
  private isActive = false
  private taskQueue: TaskQueue = {
    pending_tasks: [],
    active_tasks: [],
    completed_tasks: [],
  }

  constructor() {
    this.computeEngine = new ComputeEngine()
  }

  public async startCoordination(userId: string, deviceId: string): Promise<void> {
    if (this.isActive) return

    this.isActive = true
    console.log("[v0] Task coordinator started")

    // Start the coordination loop
    this.coordinationLoop(userId, deviceId)
  }

  public async stopCoordination(): Promise<void> {
    this.isActive = false
    this.computeEngine.stop()
    console.log("[v0] Task coordinator stopped")
  }

  private async coordinationLoop(userId: string, deviceId: string): Promise<void> {
    while (this.isActive) {
      try {
        // Fetch available tasks from the network
        await this.fetchAvailableTasks(userId)

        // Execute next task if available and not currently running
        if (this.taskQueue.pending_tasks.length > 0 && !this.computeEngine.isCurrentlyRunning()) {
          const nextTask = this.taskQueue.pending_tasks.shift()
          if (nextTask) {
            await this.executeTask(nextTask, userId, deviceId)
          }
        }

        // Wait before next coordination cycle
        await new Promise((resolve) => setTimeout(resolve, 10000)) // 10 seconds
      } catch (error) {
        console.error("[v0] Coordination loop error:", error)
        await new Promise((resolve) => setTimeout(resolve, 30000)) // Wait 30 seconds on error
      }
    }
  }

  private async fetchAvailableTasks(userId: string): Promise<void> {
    try {
      // Get user's unlock threshold from their stats
      const { data: userStats } = await this.supabase.from("users").select("*").eq("id", userId).maybeSingle()

      if (!userStats) return

      // Fetch operations that user has access to
      const { data: operations, error } = await this.supabase
        .from("operations")
        .select("*")
        .eq("is_active", true)
        .lte("unlock_threshold", userStats.total_operations || 0)
        .limit(5)

      if (error) {
        console.error("[v0] Error fetching operations:", error)
        return
      }

      // Convert operations to compute tasks
      const newTasks: ComputeTask[] = (operations || []).map((op: any) => ({
        id: crypto.randomUUID(),
        operation_id: op.id,
        type: this.mapOperationType(op.name),
        parameters: op.parameters || {},
        hash: op.task_hash,
        signature: op.task_signature,
        priority: 1,
        estimated_duration: op.required_compute_power * 1000, // Convert to milliseconds
        created_at: new Date().toISOString(),
      }))

      // Add new tasks to queue (avoid duplicates)
      const existingOperationIds = new Set(this.taskQueue.pending_tasks.map((t) => t.operation_id))
      const uniqueNewTasks = newTasks.filter((task) => !existingOperationIds.has(task.operation_id))

      this.taskQueue.pending_tasks.push(...uniqueNewTasks)

      console.log(`[v0] Fetched ${uniqueNewTasks.length} new tasks, queue size: ${this.taskQueue.pending_tasks.length}`)
    } catch (error) {
      console.error("[v0] Error in fetchAvailableTasks:", error)
    }
  }

  private mapOperationType(operationName: string): ComputeTask["type"] {
    switch (operationName) {
      case "OPERATION_PRIME_SWEEP":
        return "prime_search"
      case "OPERATION_CRYPTO_ANALYSIS":
        return "crypto_analysis"
      case "OPERATION_DATA_MATRIX":
        return "matrix_operations"
      default:
        return "hash_computation"
    }
  }

  private async executeTask(task: ComputeTask, userId: string, deviceId: string): Promise<void> {
    console.log(`[v0] Starting task execution: ${task.type}`)

    // Move task to active queue
    this.taskQueue.active_tasks.push(task)

    // Record task execution start in database
    const { data: execution, error: insertError } = await this.supabase
      .from("task_executions")
      .insert({
        operation_id: task.operation_id,
        user_id: userId,
        device_id: deviceId,
        task_data: task.parameters,
        status: "running",
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error("[v0] Error recording task execution:", insertError)
      return
    }

    try {
      // Execute the task with progress callback
      const result = await this.computeEngine.executeTask(task, async (progress: number, operations: number) => {
        await this.handleProgress(task, progress, operations)
      })

      // Update task execution with results
      await this.supabase
        .from("task_executions")
        .update({
          result_data: result.result_data,
          status: "completed",
          compute_time_ms: result.computation_time,
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id)

      console.log(`[v0] Task completed successfully: ${task.type}`)
    } catch (error) {
      // Update task execution with error
      await this.supabase
        .from("task_executions")
        .update({
          status: "failed",
          error_message: error instanceof Error ? error.message : "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", execution.id)

      console.error(`[v0] Task execution failed: ${task.type}`, error)
    } finally {
      // Remove from active queue and add to completed
      this.taskQueue.active_tasks = this.taskQueue.active_tasks.filter((t) => t.id !== task.id)
      this.taskQueue.completed_tasks.push(task.id)
    }
  }

  private async handleProgress(task: ComputeTask, progress: number, operations: number): Promise<void> {
    const percent = Math.min(Math.max(progress * 100, 0), 100)
    console.log(`[v0] Task progress: ${percent.toFixed(1)}% - operations: ${operations} - type: ${task.type}`)

    // Update network metrics with current progress
    await this.updateNetworkMetrics(operations, percent)
  }

  private async handleTaskComplete(result: TaskResult): Promise<void> {
    console.log(`[v0] Task completed: ${result.task_id}`)

    // Update user statistics
    await this.updateUserStats(result)
  }

  private async handleTaskError(error: Error): Promise<void> {
    console.error("[v0] Task execution error:", error)
  }

  private async updateNetworkMetrics(operationsCompleted: number, progressPercent: number): Promise<void> {
    try {
      await this.supabase.from("network_metrics").insert({
        active_users: 1,
        total_cpu_cores: typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4,
        total_memory_gb: typeof navigator !== 'undefined' ? ((navigator as any).deviceMemory || 4) : 4,
        operations_per_second: operationsCompleted,
        network_efficiency: progressPercent,
        average_latency_ms: 50,
      })
    } catch (error) {
      console.error("[v0] Error updating network metrics:", error)
    }
  }

  private async updateUserStats(result: TaskResult): Promise<void> {
    try {
      // This would update user statistics and achievements
      console.log(`[v0] Updating user stats for task completion: ${result.task_id}, time: ${result.computation_time}ms`)
    } catch (error) {
      console.error("[v0] Error updating user stats:", error)
    }
  }

  public getQueueStatus(): TaskQueue {
    return { ...this.taskQueue }
  }

  public isCoordinatorActive(): boolean {
    return this.isActive
  }
}
