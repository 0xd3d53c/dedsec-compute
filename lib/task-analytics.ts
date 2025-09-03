// Client-side utilities for optimized task execution analytics
import { createClient } from "./supabase/client"

export interface TaskStats {
  total_tasks: number
  completed_tasks: number
  failed_tasks: number
  total_cpu_time_seconds: number
  total_memory_usage_mb: number
  avg_execution_time_ms: number
  success_rate: number
  last_execution: string | null
}

export interface NetworkTaskStats {
  total_tasks: number
  completed_tasks: number
  failed_tasks: number
  active_tasks: number
  total_cpu_time_seconds: number
  total_memory_usage_mb: number
  avg_execution_time_ms: number
  success_rate: number
  tasks_last_24h: number
  tasks_last_7d: number
  top_contributors: Array<{
    user_id: string
    task_count: number
    completed_count: number
  }>
}

export interface TaskExecutionHistory {
  id: string
  user_id: string
  task_id: string
  status: string
  execution_time_ms: number
  cpu_time_seconds: number
  memory_usage_mb: number
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface PerformanceMetrics {
  date: string
  total_tasks: number
  completed_tasks: number
  failed_tasks: number
  avg_execution_time_ms: number
  total_cpu_time_seconds: number
  total_memory_usage_mb: number
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  username: string
  total_tasks: number
  completed_tasks: number
  total_cpu_time_seconds: number
  total_memory_usage_mb: number
  success_rate: number
  contribution_score: number
}

export interface DashboardTaskSummary {
  today_tasks: number
  today_completed: number
  today_cpu_time: number
  today_memory_usage: number
  week_tasks: number
  week_completed: number
  week_cpu_time: number
  week_memory_usage: number
  month_tasks: number
  month_completed: number
  month_cpu_time: number
  month_memory_usage: number
  current_rank: number | null
  total_contributors: number
}

export class TaskAnalytics {
  private supabase = createClient()

  /**
   * Get user-specific task execution statistics
   */
  async getUserTaskStats(userId: string): Promise<{ success: boolean; stats?: TaskStats; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_task_stats', {
        p_user_id: userId
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, stats: data[0] as TaskStats }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get network-wide task execution statistics
   */
  async getNetworkTaskStats(): Promise<{ success: boolean; stats?: NetworkTaskStats; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('get_network_task_stats')

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, stats: data[0] as NetworkTaskStats }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get task execution history with filtering and pagination
   */
  async getTaskExecutionHistory(options: {
    userId?: string
    limit?: number
    offset?: number
    status?: string
    startDate?: string
    endDate?: string
  } = {}): Promise<{ success: boolean; history?: TaskExecutionHistory[]; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('get_task_execution_history', {
        p_user_id: options.userId || null,
        p_limit: options.limit || 50,
        p_offset: options.offset || 0,
        p_status: options.status || null,
        p_start_date: options.startDate || null,
        p_end_date: options.endDate || null
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, history: data as TaskExecutionHistory[] }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get performance metrics over time
   */
  async getPerformanceMetrics(options: {
    userId?: string
    days?: number
  } = {}): Promise<{ success: boolean; metrics?: PerformanceMetrics[]; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('get_task_performance_metrics', {
        p_user_id: options.userId || null,
        p_days: options.days || 7
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, metrics: data as PerformanceMetrics[] }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get contribution leaderboard
   */
  async getContributionLeaderboard(options: {
    limit?: number
    days?: number
  } = {}): Promise<{ success: boolean; leaderboard?: LeaderboardEntry[]; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('get_contribution_leaderboard', {
        p_limit: options.limit || 50,
        p_days: options.days || 30
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, leaderboard: data as LeaderboardEntry[] }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get dashboard task summary
   */
  async getDashboardTaskSummary(userId: string): Promise<{ success: boolean; summary?: DashboardTaskSummary; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('get_dashboard_task_summary', {
        p_user_id: userId
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, summary: data[0] as DashboardTaskSummary }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Format CPU time for display
   */
  static formatCpuTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`
    } else if (seconds < 3600) {
      return `${(seconds / 60).toFixed(1)}m`
    } else {
      return `${(seconds / 3600).toFixed(1)}h`
    }
  }

  /**
   * Format memory usage for display
   */
  static formatMemoryUsage(mb: number): string {
    if (mb < 1024) {
      return `${mb.toFixed(1)} MB`
    } else {
      return `${(mb / 1024).toFixed(1)} GB`
    }
  }

  /**
   * Format execution time for display
   */
  static formatExecutionTime(ms: number): string {
    if (ms < 1000) {
      return `${ms.toFixed(0)}ms`
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`
    } else {
      return `${(ms / 60000).toFixed(1)}m`
    }
  }

  /**
   * Calculate contribution score
   */
  static calculateContributionScore(
    cpuTimeSeconds: number,
    memoryUsageMb: number,
    completedTasks: number
  ): number {
    return (cpuTimeSeconds * 0.4) + (memoryUsageMb * 0.3) + (completedTasks * 0.3)
  }
}

// Export singleton instance
export const taskAnalytics = new TaskAnalytics()
