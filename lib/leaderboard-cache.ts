// Client-side utilities for cached leaderboard system
import { createClient } from "./supabase/client"

export interface CachedLeaderboardEntry {
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

export interface UserLeaderboardRank {
  rank: number
  total_contributors: number
  contribution_score: number
  percentile: number
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all_time'

export class LeaderboardCache {
  private supabase = createClient()

  /**
   * Get cached leaderboard for a specific period
   */
  async getCachedLeaderboard(
    period: LeaderboardPeriod = 'weekly',
    limit: number = 50
  ): Promise<{ success: boolean; leaderboard?: CachedLeaderboardEntry[]; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('get_cached_leaderboard', {
        p_period_type: period,
        p_limit: limit
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, leaderboard: data as CachedLeaderboardEntry[] }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Get user's rank in leaderboard
   */
  async getUserRank(
    userId: string,
    period: LeaderboardPeriod = 'weekly'
  ): Promise<{ success: boolean; rank?: UserLeaderboardRank; error?: string }> {
    try {
      const { data, error } = await this.supabase.rpc('get_user_leaderboard_rank', {
        p_user_id: userId,
        p_period_type: period
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, rank: data[0] as UserLeaderboardRank }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Format contribution score for display
   */
  static formatContributionScore(score: number): string {
    if (score < 1000) {
      return score.toFixed(1)
    } else if (score < 1000000) {
      return `${(score / 1000).toFixed(1)}K`
    } else {
      return `${(score / 1000000).toFixed(1)}M`
    }
  }

  /**
   * Get rank badge color based on rank
   */
  static getRankBadgeColor(rank: number): string {
    if (rank === 1) return 'bg-yellow-600' // Gold
    if (rank === 2) return 'bg-gray-400'   // Silver
    if (rank === 3) return 'bg-orange-600' // Bronze
    if (rank <= 10) return 'bg-blue-600'   // Top 10
    if (rank <= 50) return 'bg-green-600'  // Top 50
    return 'bg-slate-600'                  // Default
  }

  /**
   * Get rank emoji based on rank
   */
  static getRankEmoji(rank: number): string {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    if (rank <= 10) return '🏆'
    if (rank <= 50) return '⭐'
    return '📊'
  }

  /**
   * Format percentile for display
   */
  static formatPercentile(percentile: number): string {
    if (percentile >= 99) return 'Top 1%'
    if (percentile >= 95) return 'Top 5%'
    if (percentile >= 90) return 'Top 10%'
    if (percentile >= 75) return 'Top 25%'
    if (percentile >= 50) return 'Top 50%'
    return 'Bottom 50%'
  }

  /**
   * Get period display name
   */
  static getPeriodDisplayName(period: LeaderboardPeriod): string {
    switch (period) {
      case 'daily': return 'Today'
      case 'weekly': return 'This Week'
      case 'monthly': return 'This Month'
      case 'all_time': return 'All Time'
      default: return 'Unknown'
    }
  }

  /**
   * Get period description
   */
  static getPeriodDescription(period: LeaderboardPeriod): string {
    switch (period) {
      case 'daily': return 'Daily contribution rankings'
      case 'weekly': return 'Weekly contribution rankings'
      case 'monthly': return 'Monthly contribution rankings'
      case 'all_time': return 'All-time contribution rankings'
      default: return 'Contribution rankings'
    }
  }
}

// Export singleton instance
export const leaderboardCache = new LeaderboardCache()
