import { HardwareMonitor, type ResourceLimits, type RealTimeStats } from "./hardware-detection"
import { createClient } from "./supabase/client"

export interface ContributionSession {
  id: string
  user_id: string
  device_id: string
  started_at: string
  ended_at?: string
  total_operations: number
  avg_cpu_usage: number
  avg_memory_usage: number
  contribution_score: number
}

export class ResourceManager {
  private hardwareMonitor: HardwareMonitor
  private isContributing = false
  private currentSession: ContributionSession | null = null
  private supabase = createClient()

  constructor(limits: ResourceLimits) {
    this.hardwareMonitor = new HardwareMonitor(limits)
    this.setupMonitoring()
  }

  private setupMonitoring() {
    this.hardwareMonitor.onStatsUpdate(async (stats) => {
      await this.handleStatsUpdate(stats)
    })
  }

  public async startContribution(userId: string, deviceId: string): Promise<boolean> {
    if (this.isContributing) {
      return false
    }

    const stats = await this.hardwareMonitor.getRealTimeStats()

    if (!this.hardwareMonitor.canContribute(stats)) {
      return false
    }

    // Create new contribution session
    this.currentSession = {
      id: crypto.randomUUID(),
      user_id: userId,
      device_id: deviceId,
      started_at: new Date().toISOString(),
      total_operations: 0,
      avg_cpu_usage: 0,
      avg_memory_usage: 0,
      contribution_score: 0,
    }

    // Update user session in database
    await this.updateUserSession(userId, deviceId, stats, true)

    this.isContributing = true
    this.hardwareMonitor.startMonitoring(5000) // Monitor every 5 seconds

    console.log("[v0] Started resource contribution")
    return true
  }

  public async stopContribution(): Promise<void> {
    if (!this.isContributing || !this.currentSession) {
      return
    }

    this.isContributing = false
    this.hardwareMonitor.stopMonitoring()

    // Finalize session
    this.currentSession.ended_at = new Date().toISOString()

    // Save session to database
    await this.saveContributionSession(this.currentSession)

    // Update user session status
    const stats = await this.hardwareMonitor.getRealTimeStats()
    await this.updateUserSession(this.currentSession.user_id, this.currentSession.device_id, stats, false)

    console.log("[v0] Stopped resource contribution")
    this.currentSession = null
  }

  private async handleStatsUpdate(stats: RealTimeStats) {
    if (!this.isContributing || !this.currentSession) {
      return
    }

    // Check if we should pause contribution due to safety limits
    if (!this.hardwareMonitor.canContribute(stats)) {
      console.log("[v0] Auto-pausing contribution due to safety limits")
      await this.stopContribution()
      return
    }

    // Update session statistics
    this.currentSession.total_operations += 1
    this.currentSession.avg_cpu_usage = (this.currentSession.avg_cpu_usage + stats.cpu_usage) / 2
    this.currentSession.avg_memory_usage = (this.currentSession.avg_memory_usage + stats.memory_usage) / 2
    this.currentSession.contribution_score += this.calculateContributionScore(stats)

    // Update database with current stats
    await this.updateUserSession(this.currentSession.user_id, this.currentSession.device_id, stats, true)
  }

  private calculateContributionScore(stats: RealTimeStats): number {
    // Score based on resource usage and efficiency
    const cpuScore = stats.cpu_usage * 0.6
    const memoryScore = stats.memory_usage * 0.3
    const stabilityScore = stats.temperature && stats.temperature < 70 ? 10 : 0

    return Math.round((cpuScore + memoryScore + stabilityScore) * 100) / 100
  }

  private async updateUserSession(userId: string, deviceId: string, stats: RealTimeStats, isContributing: boolean) {
    try {
      const { error } = await this.supabase.from("user_sessions").upsert(
        {
          user_id: userId,
          device_id: deviceId,
          hardware_specs: {
            cpu_usage: stats.cpu_usage,
            memory_usage: stats.memory_usage,
            battery_level: stats.battery_level,
            temperature: stats.temperature,
            is_charging: stats.is_charging,
            timestamp: stats.timestamp,
          },
          is_contributing: isContributing,
          battery_level: stats.battery_level,
          temperature_celsius: stats.temperature,
          last_active: new Date().toISOString(),
        },
        {
          onConflict: "user_id,device_id",
        },
      )

      if (error) {
        console.error("[v0] Failed to update user session:", error)
      }
    } catch (error) {
      console.error("[v0] Error updating user session:", error)
    }
  }

  private async saveContributionSession(session: ContributionSession) {
    try {
      const { error } = await this.supabase.from("task_executions").insert({
        id: session.id,
        user_id: session.user_id,
        device_id: session.device_id,
        started_at: session.started_at,
        completed_at: session.ended_at,
        compute_time_ms: session.total_operations * 100, // Estimate compute time
        result_data: {
          total_operations: session.total_operations,
          avg_cpu_usage: session.avg_cpu_usage,
          avg_memory_usage: session.avg_memory_usage,
          contribution_score: session.contribution_score,
        },
        status: 'completed',
      })

      if (error) {
        console.error("[v0] Failed to save contribution session:", error)
      }
    } catch (error) {
      console.error("[v0] Error saving contribution session:", error)
    }
  }

  public updateResourceLimits(limits: Partial<ResourceLimits>) {
    this.hardwareMonitor.updateLimits(limits)
  }

  public getResourceLimits(): ResourceLimits {
    return this.hardwareMonitor.getLimits()
  }

  public async getCurrentStats(): Promise<RealTimeStats> {
    return await this.hardwareMonitor.getRealTimeStats()
  }

  public isCurrentlyContributing(): boolean {
    return this.isContributing
  }

  public getCurrentSession(): ContributionSession | null {
    return this.currentSession
  }
}
