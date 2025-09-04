"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  TrendingUp, 
  Activity, 
  Users, 
  Cpu, 
  MemoryStick, 
  Network, 
  Shield,
  Loader2,
  BarChart3
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "sonner"

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

interface TaskExecution {
  id: string
  operation_id: string
  user_id: string
  status: string
  compute_time_ms: number
  cpu_time_seconds: number
  memory_usage_mb: number
  execution_time_ms: number
  created_at: string
  completed_at?: string
  user?: {
    username: string
  }
  operation?: {
    name: string
  }
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const { adminSession, isLoading: authLoading, hasPermission } = useAdminAuth()
  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics[]>([])
  const [taskExecutions, setTaskExecutions] = useState<TaskExecution[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [timeRange, setTimeRange] = useState("24h")

  useEffect(() => {
    if (!authLoading && !adminSession) {
      router.push("/admin")
      return
    }

    if (adminSession && hasPermission("view_analytics")) {
      fetchAnalyticsData()
    }
  }, [adminSession, authLoading, router, hasPermission, timeRange])

  const fetchAnalyticsData = async () => {
    if (!adminSession) return

    setIsLoading(true)
    try {
      const supabase = createClient()

      // Fetch network metrics
      const { data: metrics, error: metricsError } = await supabase
        .from("network_metrics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)

      if (metricsError) throw metricsError
      setNetworkMetrics(metrics || [])

      // Fetch recent task executions
      const { data: tasks, error: tasksError } = await supabase
        .from("task_executions")
        .select(`
          *,
          user:users(username),
          operation:operations(name)
        `)
        .order("created_at", { ascending: false })
        .limit(50)

      if (tasksError) throw tasksError
      setTaskExecutions(tasks || [])

    } catch (error) {
      console.error("Error fetching analytics data:", error)
      toast.error("Failed to fetch analytics data")
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentMetrics = () => {
    return networkMetrics[0] || {
      active_users: 0,
      total_cpu_cores: 0,
      total_memory_gb: 0,
      operations_per_second: 0,
      network_efficiency: 0,
      average_latency_ms: 0
    }
  }

  const getTaskExecutionStats = () => {
    const total = taskExecutions.length
    const completed = taskExecutions.filter(t => t.status === "completed").length
    const failed = taskExecutions.filter(t => t.status === "failed").length
    const running = taskExecutions.filter(t => t.status === "running").length

    return { total, completed, failed, running }
  }

  const getEfficiencyTrend = () => {
    if (networkMetrics.length < 2) return 0
    
    const recent = networkMetrics[0]?.network_efficiency || 0
    const previous = networkMetrics[networkMetrics.length - 1]?.network_efficiency || 0
    
    return previous > 0 ? ((recent - previous) / previous) * 100 : 0
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-600"
      case "running": return "bg-blue-600"
      case "failed": return "bg-red-600"
      case "pending": return "bg-yellow-600"
      default: return "bg-gray-600"
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!adminSession || !hasPermission("view_analytics")) {
    router.push("/admin")
    return null
  }

  const currentMetrics = getCurrentMetrics()
  const taskStats = getTaskExecutionStats()
  const efficiencyTrend = getEfficiencyTrend()

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400">
      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-400 text-slate-950">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-cyan-400" style={{ textShadow: "0 0 10px currentColor" }}>
                Network Analytics
              </h1>
              <p className="text-cyan-300">
                Real-time network performance and system health monitoring
              </p>
            </div>
          </div>
        </header>

        {/* Time Range Selector */}
        <div className="mb-6">
          <Card className="border-cyan-400 bg-slate-950/80">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <span className="text-cyan-400 font-medium">Time Range:</span>
                <div className="flex gap-2">
                  {["1h", "24h", "7d", "30d"].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        timeRange === range
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-800 text-cyan-400 hover:bg-slate-700"
                      }`}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-cyan-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Active Users</p>
                  <p className="text-2xl font-bold text-cyan-400">{currentMetrics.active_users}</p>
                  <p className="text-xs text-cyan-600">Currently contributing</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Cpu className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Total CPU Cores</p>
                  <p className="text-2xl font-bold text-blue-400">{currentMetrics.total_cpu_cores}</p>
                  <p className="text-xs text-cyan-600">Network capacity</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Operations/sec</p>
                  <p className="text-2xl font-bold text-green-400">
                    {currentMetrics.operations_per_second.toFixed(1)}
                  </p>
                  <p className="text-xs text-cyan-600">Processing speed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Efficiency</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {currentMetrics.network_efficiency.toFixed(1)}%
                  </p>
                  <p className={`text-xs ${efficiencyTrend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {efficiencyTrend >= 0 ? '+' : ''}{efficiencyTrend.toFixed(1)}% from baseline
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-slate-950 border border-cyan-400 w-full grid grid-cols-2 h-auto p-1">
            <TabsTrigger
              value="overview"
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-sm py-2 px-3"
            >
              <Activity className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-sm py-2 px-3"
            >
              <Cpu className="w-4 h-4 mr-2" />
              Tasks
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Network Efficiency Chart */}
              <Card className="border-cyan-400 bg-slate-950/80">
                <CardHeader>
                  <CardTitle className="text-cyan-400">Network Efficiency Trend</CardTitle>
                  <CardDescription className="text-cyan-300">
                    Efficiency over the last {timeRange}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-300">Current Efficiency</span>
                      <span className="text-cyan-400 font-bold">
                        {currentMetrics.network_efficiency.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-cyan-300">Average Latency</span>
                        <div className="text-cyan-400 font-bold">
                          {currentMetrics.average_latency_ms}ms
                        </div>
                      </div>
                      <div>
                        <span className="text-cyan-300">Memory Usage</span>
                        <div className="text-cyan-400 font-bold">
                          {currentMetrics.total_memory_gb.toFixed(1)} GB
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Task Execution Summary */}
              <Card className="border-green-400 bg-slate-950/80">
                <CardHeader>
                  <CardTitle className="text-green-400">Task Execution Summary</CardTitle>
                  <CardDescription className="text-cyan-300">
                    Recent task performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">{taskStats.completed}</div>
                        <div className="text-xs text-cyan-300">Completed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">{taskStats.running}</div>
                        <div className="text-xs text-cyan-300">Running</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">{taskStats.failed}</div>
                        <div className="text-xs text-cyan-300">Failed</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-400">{taskStats.total}</div>
                        <div className="text-xs text-cyan-300">Total</div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-cyan-300">Success Rate</span>
                        <span className="text-cyan-400">
                          {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="tasks">
            <Card className="border-green-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-green-400">Recent Task Executions</CardTitle>
                <CardDescription className="text-cyan-300">
                  Monitor task performance and completion rates
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Loading task data...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-cyan-400">Task</TableHead>
                          <TableHead className="text-cyan-400">User</TableHead>
                          <TableHead className="text-cyan-400">Status</TableHead>
                          <TableHead className="text-cyan-400">Performance</TableHead>
                          <TableHead className="text-cyan-400">Duration</TableHead>
                          <TableHead className="text-cyan-400">Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {taskExecutions.map((task) => (
                          <TableRow key={task.id}>
                            <TableCell>
                              <div className="text-cyan-400 font-medium">
                                {task.operation?.name || "Unknown"}
                              </div>
                              <div className="text-xs text-cyan-600">ID: {task.id.substring(0, 8)}</div>
                            </TableCell>
                            <TableCell>
                              <div className="text-cyan-400">
                                {task.user?.username || "Unknown"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(task.status)}>
                                {task.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="text-xs text-cyan-300">
                                  CPU: {task.cpu_time_seconds.toFixed(2)}s
                                </div>
                                <div className="text-xs text-cyan-300">
                                  Memory: {task.memory_usage_mb.toFixed(1)}MB
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-cyan-400">
                                {task.execution_time_ms ? `${task.execution_time_ms}ms` : "N/A"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-cyan-300">
                                {new Date(task.created_at).toLocaleDateString()}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
