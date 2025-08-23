"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Activity, Users, Cpu, Zap, Globe, TrendingUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface NetworkMetrics {
  id: string
  active_users: number
  total_cpu_cores: number
  total_memory_gb: number
  operations_per_second: number
  network_efficiency: number
  average_latency_ms: number
  created_at: string
}

interface NetworkStats {
  totalUsers: number
  activeNodes: number
  totalComputingPower: number
  operationsPerSecond: number
  networkEfficiency: number
  averageLatency: number
}

export function NetworkStats() {
  const [stats, setStats] = useState<NetworkStats>({
    totalUsers: 0,
    activeNodes: 0,
    totalComputingPower: 0,
    operationsPerSecond: 0,
    networkEfficiency: 0,
    averageLatency: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const supabase = createClient()

  useEffect(() => {
    // Initial load
    fetchNetworkStats()

    // Set up real-time subscription
    const subscription = supabase
      .channel("network_metrics")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "network_metrics" }, (payload) => {
        console.log("[v0] New network metrics:", payload.new)
        updateStatsFromMetrics(payload.new as NetworkMetrics)
      })
      .subscribe()

    // Periodic refresh every 30 seconds
    const interval = setInterval(fetchNetworkStats, 30000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  const fetchNetworkStats = async () => {
    try {
      // Get latest network metrics
      const { data: metrics, error: metricsError } = await supabase
        .from("network_metrics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (metricsError && metricsError.code !== "PGRST116") {
        console.error("[v0] Error fetching network metrics:", metricsError)
      }

      // Get total users count
      const { count: totalUsers, error: usersError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)

      if (usersError) {
        console.error("[v0] Error fetching users count:", usersError)
      }

      // Get active nodes (users currently contributing)
      const { count: activeNodes, error: nodesError } = await supabase
        .from("user_sessions")
        .select("*", { count: "exact", head: true })
        .eq("is_contributing", true)

      if (nodesError) {
        console.error("[v0] Error fetching active nodes:", nodesError)
      }

      // Calculate total computing power from active sessions
      const { data: activeSessions, error: sessionsError } = await supabase
        .from("user_sessions")
        .select("hardware_specs")
        .eq("is_contributing", true)

      if (sessionsError) {
        console.error("[v0] Error fetching active sessions:", sessionsError)
      }

      let totalComputingPower = 0
      if (activeSessions) {
        totalComputingPower = activeSessions.reduce((total, session) => {
          const specs = session.hardware_specs as any
          return total + (specs?.cpu_usage || 0)
        }, 0)
      }

      const newStats: NetworkStats = {
        totalUsers: totalUsers || 0,
        activeNodes: activeNodes || 0,
        totalComputingPower: Math.round(totalComputingPower * 100) / 100,
        operationsPerSecond: metrics?.operations_per_second || 0,
        networkEfficiency: metrics?.network_efficiency || 0,
        averageLatency: metrics?.average_latency_ms || 0,
      }

      setStats(newStats)
      setLastUpdate(new Date())
      setIsLoading(false)
    } catch (error) {
      console.error("[v0] Error in fetchNetworkStats:", error)
      setIsLoading(false)
    }
  }

  const updateStatsFromMetrics = (metrics: NetworkMetrics) => {
    setStats((prev) => ({
      ...prev,
      operationsPerSecond: metrics.operations_per_second,
      networkEfficiency: metrics.network_efficiency,
      averageLatency: metrics.average_latency_ms,
    }))
    setLastUpdate(new Date())
  }

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M"
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K"
    }
    return num.toString()
  }

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 80) return "text-green-400"
    if (efficiency >= 60) return "text-yellow-400"
    return "text-red-400"
  }

  const getLatencyColor = (latency: number) => {
    if (latency <= 50) return "text-green-400"
    if (latency <= 100) return "text-yellow-400"
    return "text-red-400"
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Globe className="h-5 w-5 animate-spin" />
            Loading Network Stats...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Globe className="h-5 w-5" />
            Network Overview
          </CardTitle>
          <CardDescription className="text-slate-400">
            Real-time distributed computing network statistics
            {lastUpdate && <span className="block text-xs mt-1">Last updated: {lastUpdate.toLocaleTimeString()}</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-sm text-slate-400">Total Users</span>
              </div>
              <div className="text-2xl font-bold text-slate-100">{formatNumber(stats.totalUsers)}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-400" />
                <span className="text-sm text-slate-400">Active Nodes</span>
              </div>
              <div className="text-2xl font-bold text-green-400">{formatNumber(stats.activeNodes)}</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-purple-400" />
                <span className="text-sm text-slate-400">Computing Power</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">{formatNumber(stats.totalComputingPower)}%</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-slate-400">Ops/Second</span>
              </div>
              <div className="text-2xl font-bold text-yellow-400">{formatNumber(stats.operationsPerSecond)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-slate-100">
              <TrendingUp className="h-5 w-5" />
              Network Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Overall Efficiency</span>
                <span className={`font-mono ${getEfficiencyColor(stats.networkEfficiency)}`}>
                  {stats.networkEfficiency.toFixed(1)}%
                </span>
              </div>
              <Progress value={stats.networkEfficiency} className="h-2" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Average Latency</span>
                <span className={`font-mono ${getLatencyColor(stats.averageLatency)}`}>{stats.averageLatency}ms</span>
              </div>
              <Progress value={Math.min((200 - stats.averageLatency) / 2, 100)} className="h-2" />
            </div>

            <div className="pt-2 border-t border-slate-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-300">Network Status: Online</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-slate-100">Network Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Node Distribution</span>
              <Badge variant="outline" className="text-green-400 border-green-400">
                Optimal
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Load Balancing</span>
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                Balanced
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Security Status</span>
              <Badge variant="outline" className="text-green-400 border-green-400">
                Secure
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Uptime</span>
              <span className="text-slate-200 font-mono">99.9%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
