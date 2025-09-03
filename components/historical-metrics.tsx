"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts"
import { 
  TrendingUp, 
  Cpu, 
  MemoryStick, 
  Activity, 
  Calendar,
  Download,
  RefreshCw
} from "lucide-react"
import { taskAnalytics, type PerformanceMetrics, type LeaderboardEntry } from "@/lib/task-analytics"
import { leaderboardCache, type CachedLeaderboardEntry, type LeaderboardPeriod } from "@/lib/leaderboard-cache"

interface HistoricalMetricsProps {
  userId?: string
  isAdmin?: boolean
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function HistoricalMetrics({ userId, isAdmin = false }: HistoricalMetricsProps) {
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics[]>([])
  const [leaderboard, setLeaderboard] = useState<CachedLeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<number>(7)
  const [activeTab, setActiveTab] = useState("performance")
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>("weekly")

  useEffect(() => {
    loadMetrics()
  }, [timeRange, userId, leaderboardPeriod])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      // Load performance metrics
      const metricsResult = await taskAnalytics.getPerformanceMetrics({
        userId: userId,
        days: timeRange
      })
      
      if (metricsResult.success) {
        setPerformanceMetrics(metricsResult.metrics || [])
      }

      // Load cached leaderboard
      const leaderboardResult = await leaderboardCache.getCachedLeaderboard(leaderboardPeriod, 10)
      
      if (leaderboardResult.success) {
        setLeaderboard(leaderboardResult.leaderboard || [])
      }
    } catch (error) {
      console.error("Failed to load metrics:", error)
    }
    setLoading(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const formatTooltipValue = (value: number, name: string) => {
    switch (name) {
      case 'total_cpu_time_seconds':
        return [taskAnalytics.formatCpuTime(value), 'CPU Time']
      case 'total_memory_usage_mb':
        return [taskAnalytics.formatMemoryUsage(value), 'Memory Usage']
      case 'avg_execution_time_ms':
        return [taskAnalytics.formatExecutionTime(value), 'Avg Execution Time']
      default:
        return [value.toString(), name]
    }
  }

  const renderPerformanceChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={performanceMetrics}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatDate}
          stroke="#9ca3af"
          fontSize={12}
        />
        <YAxis stroke="#9ca3af" fontSize={12} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#f3f4f6'
          }}
          formatter={formatTooltipValue}
        />
        <Legend />
        <Area
          type="monotone"
          dataKey="total_tasks"
          stackId="1"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.6}
          name="Total Tasks"
        />
        <Area
          type="monotone"
          dataKey="completed_tasks"
          stackId="2"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.6}
          name="Completed Tasks"
        />
      </AreaChart>
    </ResponsiveContainer>
  )

  const renderCpuMemoryChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={performanceMetrics}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatDate}
          stroke="#9ca3af"
          fontSize={12}
        />
        <YAxis stroke="#9ca3af" fontSize={12} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#f3f4f6'
          }}
          formatter={formatTooltipValue}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="total_cpu_time_seconds"
          stroke="#f59e0b"
          strokeWidth={2}
          name="CPU Time"
        />
        <Line
          type="monotone"
          dataKey="total_memory_usage_mb"
          stroke="#8b5cf6"
          strokeWidth={2}
          name="Memory Usage"
        />
      </LineChart>
    </ResponsiveContainer>
  )

  const renderExecutionTimeChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={performanceMetrics}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis 
          dataKey="date" 
          tickFormatter={formatDate}
          stroke="#9ca3af"
          fontSize={12}
        />
        <YAxis stroke="#9ca3af" fontSize={12} />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1f2937', 
            border: '1px solid #374151',
            borderRadius: '6px',
            color: '#f3f4f6'
          }}
          formatter={formatTooltipValue}
        />
        <Legend />
        <Bar dataKey="avg_execution_time_ms" fill="#06b6d4" name="Avg Execution Time" />
      </BarChart>
    </ResponsiveContainer>
  )

  const renderLeaderboardChart = () => {
    const topContributors = leaderboard.slice(0, 5)
    
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={topContributors} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis type="number" stroke="#9ca3af" fontSize={12} />
          <YAxis 
            type="category" 
            dataKey="username" 
            stroke="#9ca3af" 
            fontSize={12}
            width={80}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#f3f4f6'
            }}
            formatter={(value: number) => [value.toFixed(1), 'Contribution Score']}
          />
          <Bar dataKey="contribution_score" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    )
  }

  const renderSuccessRatePie = () => {
    if (performanceMetrics.length === 0) return null
    
    const totalTasks = performanceMetrics.reduce((sum, day) => sum + day.total_tasks, 0)
    const totalCompleted = performanceMetrics.reduce((sum, day) => sum + day.completed_tasks, 0)
    const totalFailed = totalTasks - totalCompleted
    
    const data = [
      { name: 'Completed', value: totalCompleted, color: '#10b981' },
      { name: 'Failed', value: totalFailed, color: '#ef4444' }
    ]

    return (
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#f3f4f6'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    )
  }

  if (loading) {
    return (
      <Card className="border border-cyan-400 bg-slate-950/80">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-cyan-400 bg-slate-950/80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Historical Metrics
            </CardTitle>
            <CardDescription className="text-cyan-300">
              Performance analytics and contribution trends
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange.toString()} onValueChange={(value) => setTimeRange(parseInt(value))}>
              <SelectTrigger className="w-32 bg-slate-900 border-cyan-400">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 days</SelectItem>
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={loadMetrics} 
              size="sm" 
              variant="outline"
              className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-900"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-900 border border-cyan-400 grid grid-cols-4 w-full">
            <TabsTrigger value="performance" className="text-cyan-300">Performance</TabsTrigger>
            <TabsTrigger value="resources" className="text-cyan-300">Resources</TabsTrigger>
            <TabsTrigger value="execution" className="text-cyan-300">Execution</TabsTrigger>
            <TabsTrigger value="leaderboard" className="text-cyan-300">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">Task Completion Trends</h3>
                {renderPerformanceChart()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-2">Success Rate Distribution</h3>
                {renderSuccessRatePie()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resources" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">CPU & Memory Usage</h3>
              {renderCpuMemoryChart()}
            </div>
          </TabsContent>

          <TabsContent value="execution" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-cyan-400 mb-2">Average Execution Time</h3>
              {renderExecutionTimeChart()}
            </div>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-cyan-400">Top Contributors</h3>
              <Select value={leaderboardPeriod} onValueChange={(value: LeaderboardPeriod) => setLeaderboardPeriod(value)}>
                <SelectTrigger className="w-32 bg-slate-900 border-cyan-400">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="all_time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {renderLeaderboardChart()}
            <div className="mt-4">
              <h4 className="text-md font-semibold text-cyan-400 mb-2">Leaderboard Details</h4>
              <div className="space-y-2">
                {leaderboard.map((entry) => (
                  <div key={entry.user_id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-cyan-400/30">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${leaderboardCache.getRankBadgeColor(entry.rank)}`}>
                        {entry.rank}
                      </div>
                      <div>
                        <div className="text-cyan-400 font-medium flex items-center gap-2">
                          {leaderboardCache.getRankEmoji(entry.rank)} {entry.username}
                        </div>
                        <div className="text-cyan-300 text-sm">
                          {entry.completed_tasks} tasks • {taskAnalytics.formatCpuTime(entry.total_cpu_time_seconds)} CPU
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-cyan-400 font-bold">{leaderboardCache.formatContributionScore(entry.contribution_score)}</div>
                      <div className="text-cyan-300 text-sm">{entry.success_rate.toFixed(1)}% success</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
