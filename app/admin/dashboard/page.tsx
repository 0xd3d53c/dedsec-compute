"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, LogOut, Users, Cpu, Activity, Settings, AlertTriangle, Loader2, Target, TrendingUp, Database } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAdminAuth } from "@/hooks/useAdminAuth"

interface NetworkStats {
  totalUsers: number
  activeNodes: number
  globalComputePower: number
  operationsPerSecond: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const { adminSession, isLoading: authLoading, hasPermission, logout } = useAdminAuth()
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    totalUsers: 0,
    activeNodes: 0,
    globalComputePower: 0,
    operationsPerSecond: 0,
  })
  const [users, setUsers] = useState<any[]>([])
  const [operations, setOperations] = useState<any[]>([])
  const [adminLogs, setAdminLogs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && !adminSession) {
      router.push("/admin")
      return
    }

    if (adminSession) {
      fetchDashboardData()
    }
  }, [adminSession, authLoading, router])

  const fetchDashboardData = async () => {
    if (!adminSession) return

    setIsLoading(true)
    try {
      const supabase = createClient()

      // Fetch network stats
      const { data: metrics } = await supabase
        .from("network_metrics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      if (metrics) {
        setNetworkStats({
          totalUsers: metrics.active_users || 0,
          activeNodes: metrics.active_users || 0,
          globalComputePower: metrics.total_cpu_cores || 0,
          operationsPerSecond: metrics.operations_per_second || 0,
        })
      }

      // Fetch recent users (only if admin has permission)
      if (hasPermission("view_users")) {
        const { data: userData } = await supabase
          .from("users")
          .select("id, username, created_at, is_active, is_admin")
          .order("created_at", { ascending: false })
          .limit(10)

        setUsers(userData || [])
      }

      // Fetch operations
      if (hasPermission("view_operations")) {
        const { data: opsData } = await supabase
          .from("operations")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10)

        setOperations(opsData || [])
      }

      // Fetch recent admin logs
      // Note: admin_logs requires service_role access
      // In production, this should be handled server-side via API routes
      // This is a placeholder; actual fetching should be implemented server-side.
          // Remove or implement this function as needed.
          // Example: const { data: logs } = await supabase.from("admin_logs").select("*").order("created_at", { ascending: false }).limit(10)
          // setAdminLogs(logs || [])
          return

    } catch (error) {
      console.error("Error fetching dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    )
  }

  if (!adminSession) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400">
      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-400 text-slate-950">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-cyan-400" style={{ textShadow: "0 0 10px currentColor" }}>
                Admin Control Panel
              </h1>
              <p className="text-cyan-300">
                Welcome, {adminSession.user.username} ({adminSession.user.admin_level})
              </p>
            </div>
          </div>
          <Button onClick={handleLogout} className="bg-cyan-600 hover:bg-cyan-500 text-white">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </header>

        {/* Network Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-cyan-400/30 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm hover:border-cyan-400/50 transition-all duration-300 shadow-lg hover:shadow-cyan-500/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-cyan-400">{networkStats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-cyan-400/30 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm hover:border-cyan-400/50 transition-all duration-300 shadow-lg hover:shadow-cyan-500/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Cpu className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Active Nodes</p>
                  <p className="text-2xl font-bold text-cyan-400">{networkStats.activeNodes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-cyan-400/30 bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur-sm hover:border-cyan-400/50 transition-all duration-300 shadow-lg hover:shadow-cyan-500/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Compute Power</p>
                  <p className="text-2xl font-bold text-cyan-400">{networkStats.globalComputePower}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-cyan-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Settings className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Ops/Second</p>
                  <p className="text-2xl font-bold text-cyan-400">{networkStats.operationsPerSecond.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Recent Users */}
          {hasPermission("view_users") && (
            <Card className="border-cyan-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Recent Users
                </CardTitle>
                <CardDescription className="text-cyan-300">
                  Latest user registrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded">
                        <div>
                          <p className="text-cyan-400 font-medium">{user.username}</p>
                          <p className="text-cyan-300 text-sm">@{user.username}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-cyan-300 text-sm">
                            {new Date(user.created_at).toLocaleDateString()}
                          </p>
                          <div className="flex gap-2 mt-1">
                            {user.is_admin && (
                              <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded">Admin</span>
                            )}
                            {!user.is_active && (
                              <span className="px-2 py-1 bg-red-600 text-white text-xs rounded">Inactive</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent Operations */}
          {hasPermission("view_operations") && (
            <Card className="border-cyan-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  Active Operations
                </CardTitle>
                <CardDescription className="text-cyan-300">
                  Current computing tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {operations.map((op) => (
                      <div key={op.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded">
                        <div>
                          <p className="text-cyan-400 font-medium">{op.name}</p>
                          <p className="text-cyan-300 text-sm">{op.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-cyan-300 text-sm">Power: {op.required_compute_power}</p>
                          <p className="text-cyan-300 text-xs">
                            Threshold: {op.unlock_threshold}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Admin Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* User Management */}
          <Card className="border-cyan-400 bg-slate-950/80 hover:bg-slate-900/90 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400">User Management</h3>
                  <p className="text-sm text-cyan-300">Manage network users</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-300">Total Users:</span>
                  <span className="text-cyan-400 font-medium">{networkStats.totalUsers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-300">Active Users:</span>
                  <span className="text-cyan-400 font-medium">{networkStats.activeNodes}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mission Management */}
          <Card className="border-cyan-400 bg-slate-950/80 hover:bg-slate-900/90 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-600 text-white">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400">Mission Management</h3>
                  <p className="text-sm text-cyan-300">Create and manage missions</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-300">Active Missions:</span>
                  <span className="text-cyan-400 font-medium">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-300">Total Participants:</span>
                  <span className="text-cyan-400 font-medium">-</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card className="border-cyan-400 bg-slate-950/80 hover:bg-slate-900/90 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-600 text-white">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400">Analytics</h3>
                  <p className="text-sm text-cyan-300">Performance monitoring</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-300">Network Efficiency:</span>
                  <span className="text-cyan-400 font-medium">{networkStats.operationsPerSecond.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-300">Response Time:</span>
                  <span className="text-cyan-400 font-medium">-</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Configuration */}
          <Card className="border-cyan-400 bg-slate-950/80 hover:bg-slate-900/90 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-orange-600 text-white">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400">System Config</h3>
                  <p className="text-sm text-cyan-300">System settings & health</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-300">Status:</span>
                  <span className="text-green-400 font-medium">Online</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-300">Uptime:</span>
                  <span className="text-cyan-400 font-medium">99.9%</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border-cyan-400 bg-slate-950/80 hover:bg-slate-900/90 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-600 text-white">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400">Security</h3>
                  <p className="text-sm text-cyan-300">Audit logs & security</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-300">Security Level:</span>
                  <span className="text-cyan-400 font-medium">High</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-300">Threats:</span>
                  <span className="text-green-400 font-medium">None</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Database */}
          <Card className="border-cyan-400 bg-slate-950/80 hover:bg-slate-900/90 transition-colors cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-cyan-400">Database</h3>
                  <p className="text-sm text-cyan-300">Storage & performance</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-cyan-300">Storage:</span>
                  <span className="text-cyan-400 font-medium">-</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyan-300">Connections:</span>
                  <span className="text-cyan-400 font-medium">-</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Logs */}
        {hasPermission("view_logs") && (
          <Card className="border-cyan-400 bg-slate-950/80">
            <CardHeader>
              <CardTitle className="text-cyan-400 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Admin Activity Log
              </CardTitle>
              <CardDescription className="text-cyan-300">
                Recent administrative actions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {adminLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded">
                      <div>
                        <p className="text-cyan-400 font-medium">{log.action}</p>
                        <p className="text-cyan-300 text-sm">
                          {log.target_type}: {log.target_id || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-cyan-300 text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                        <p className="text-cyan-300 text-xs">
                          Admin: {log.admin_id || 'Unknown'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Permission Notice */}
        {!hasPermission("view_users") && !hasPermission("view_operations") && !hasPermission("view_logs") && (
          <Card className="border-yellow-400 bg-slate-950/80">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
              <h3 className="text-yellow-400 text-lg font-semibold mb-2">Limited Access</h3>
              <p className="text-yellow-300">
                Your admin account has limited permissions. Contact a super administrator for additional access.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
