import { createClient } from "./supabase/client"
import { ComputeEngine, type ComputeTask, type TaskResult, type ComputeProgress } from "./compute-engine"

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
    this.computeEngine = new ComputeEngine(
      (progress) => this.handleProgress(progress),
      (result) => this.handleTaskComplete(result),
      (error) => this.handleTaskError(error),
    )
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
        if (this.taskQueue.pending_tasks.length > 0 && !this.computeEngine.getStatus().isRunning) {
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
      const { data: userStats } = await this.supabase.from("users").select("*").eq("id", userId).single()

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
      const newTasks: ComputeTask[] = operations.map((op) => ({
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
      // Execute the task
      const result = await this.computeEngine.executeTask(task)

      // Update task execution with results
      await this.supabase
        .from("task_executions")
        .update({
          result_data: result.result_data,
          status: "completed",
          compute_time_ms: result.compute_time_ms,
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

  private async handleProgress(progress: ComputeProgress): Promise<void> {
    console.log(`[v0] Task progress: ${progress.progress_percent.toFixed(1)}% - ${progress.current_operation}`)

    // Update network metrics with current progress
    await this.updateNetworkMetrics(progress)
  }

  private async handleTaskComplete(result: TaskResult): Promise<void> {
    console.log(`[v0] Task completed: ${result.task_id}, operations: ${result.operations_completed}`)

    // Update user statistics
    await this.updateUserStats(result)
  }

  private async handleTaskError(error: Error): Promise<void> {
    console.error("[v0] Task execution error:", error)
  }

  private async updateNetworkMetrics(progress: ComputeProgress): Promise<void> {
    try {
      // Calculate current operations per second
      const opsPerSecond = progress.operations_completed / ((Date.now() - new Date(progress.task_id).getTime()) / 1000)

      await this.supabase.from("network_metrics").insert({
        active_users: 1, // This would be calculated differently in production
        total_cpu_cores: navigator.hardwareConcurrency || 4,
        total_memory_gb: (navigator as any).deviceMemory || 4,
        operations_per_second: opsPerSecond,
        network_efficiency: progress.progress_percent,
        average_latency_ms: 50, // Placeholder
      })
    } catch (error) {
      console.error("[v0] Error updating network metrics:", error)
    }
  }

  private async updateUserStats(result: TaskResult): Promise<void> {
    try {
      // This would update user statistics and achievements
      console.log(`[v0] Updating user stats for task completion: ${result.operations_completed} operations`)
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
