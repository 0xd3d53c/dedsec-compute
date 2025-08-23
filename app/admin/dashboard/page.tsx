"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Users, Activity, LogOut, Zap, TrendingUp, Ban, Play, Pause, UserCheck } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface NetworkStats {
  totalUsers: number
  activeNodes: number
  globalComputePower: number
  operationsPerSecond: number
}

interface AdminSession {
  id: string
  username: string
  loginTime: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null)
  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    totalUsers: 0,
    activeNodes: 0,
    globalComputePower: 0,
    operationsPerSecond: 0,
  })
  const [users, setUsers] = useState<any[]>([])
  const [operations, setOperations] = useState<any[]>([])
  const [adminLogs, setAdminLogs] = useState<any[]>([])

  useEffect(() => {
    const sessionData = localStorage.getItem("admin_session")
    if (!sessionData) {
      router.push("/admin")
      return
    }

    const session = JSON.parse(sessionData)
    setAdminSession(session)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const fetchData = async () => {
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
          activeNodes: metrics.total_cpu_cores || 0,
          globalComputePower: metrics.total_memory_gb || 0,
          operationsPerSecond: metrics.operations_per_second || 0,
        })
      }

      // Fetch users
      const { data: usersData } = await supabase
        .from("users")
        .select("id, username, display_name, is_admin, is_active, last_login, created_at")
        .order("created_at", { ascending: false })
        .limit(10)

      if (usersData) setUsers(usersData)

      // Fetch operations
      const { data: operationsData } = await supabase
        .from("operations")
        .select("*")
        .order("created_at", { ascending: false })

      if (operationsData) setOperations(operationsData)

      // Fetch admin logs
      const { data: logsData } = await supabase
        .from("admin_logs")
        .select("*, users(username)")
        .order("created_at", { ascending: false })
        .limit(20)

      if (logsData) setAdminLogs(logsData)
    }

    fetchData()

    // Set up real-time subscriptions
    const statsSubscription = supabase
      .channel("network_metrics")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "network_metrics" }, (payload) => {
        const newMetrics = payload.new as any
        setNetworkStats({
          totalUsers: newMetrics.active_users || 0,
          activeNodes: newMetrics.total_cpu_cores || 0,
          globalComputePower: newMetrics.total_memory_gb || 0,
          operationsPerSecond: newMetrics.operations_per_second || 0,
        })
      })
      .subscribe()

    const logsSubscription = supabase
      .channel("admin_logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_logs" }, () => {
        fetchData() // Refresh logs when new ones are added
      })
      .subscribe()

    return () => {
      statsSubscription.unsubscribe()
      logsSubscription.unsubscribe()
    }
  }, [router])

  const handleUserAction = async (userId: string, action: "ban" | "unban" | "toggle_admin") => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    let updateData: any = {}
    let logAction = ""

    switch (action) {
      case "ban":
        updateData = { is_active: false }
        logAction = "user_banned"
        break
      case "unban":
        updateData = { is_active: true }
        logAction = "user_unbanned"
        break
      case "toggle_admin":
        const user = users.find((u) => u.id === userId)
        updateData = { is_admin: !user?.is_admin }
        logAction = updateData.is_admin ? "admin_granted" : "admin_revoked"
        break
    }

    const { error } = await supabase.from("users").update(updateData).eq("id", userId)

    if (!error) {
      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: adminSession?.id,
        action: logAction,
        target_type: "user",
        target_id: userId,
        details: { action, updateData },
      })

      // Refresh users list
      const { data: usersData } = await supabase
        .from("users")
        .select("id, username, display_name, is_admin, is_active, last_login, created_at")
        .order("created_at", { ascending: false })
        .limit(10)

      if (usersData) setUsers(usersData)
    }
  }

  const handleOperationAction = async (operationId: string, action: "activate" | "deactivate") => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )

    const { error } = await supabase
      .from("operations")
      .update({ is_active: action === "activate" })
      .eq("id", operationId)

    if (!error) {
      // Log admin action
      await supabase.from("admin_logs").insert({
        admin_id: adminSession?.id,
        action: `operation_${action}d`,
        target_type: "operation",
        target_id: operationId,
        details: { action },
      })

      // Refresh operations list
      const { data: operationsData } = await supabase
        .from("operations")
        .select("*")
        .order("created_at", { ascending: false })

      if (operationsData) setOperations(operationsData)
    }
  }

  const handleLogout = async () => {
    if (adminSession) {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      await supabase.from("admin_logs").insert({
        admin_id: adminSession.id,
        action: "admin_logout",
        details: { username: adminSession.username },
      })
    }

    localStorage.removeItem("admin_session")
    router.push("/admin")
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
              <p className="text-cyan-300">DedSecCompute Network Administration</p>
            </div>
          </div>
          <Button onClick={handleLogout} className="bg-cyan-600 hover:bg-cyan-500 text-white">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border border-cyan-400 bg-slate-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-400 text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">{networkStats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-cyan-300">Registered users</p>
            </CardContent>
          </Card>

          <Card className="border border-cyan-400 bg-slate-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-400 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Active Nodes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-400">{networkStats.activeNodes}</div>
              <p className="text-xs text-cyan-300">Currently contributing</p>
            </CardContent>
          </Card>

          <Card className="border border-cyan-400 bg-slate-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-400 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Compute Power
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-400">{networkStats.globalComputePower}</div>
              <p className="text-xs text-cyan-300">Total GFLOPS</p>
            </CardContent>
          </Card>

          <Card className="border border-cyan-400 bg-slate-950/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-cyan-400 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Operations/Sec
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-400">{networkStats.operationsPerSecond}</div>
              <p className="text-xs text-cyan-300">Network throughput</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="missions" className="space-y-6">
          <TabsList className="bg-slate-950 border border-cyan-400">
            <TabsTrigger value="missions" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              Mission Control
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              User Management
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              Network Monitoring
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              System Logs
            </TabsTrigger>
          </TabsList>
          <TabsContent value="missions">
            <Card className="border border-cyan-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-cyan-400">Mission Management</CardTitle>
                <CardDescription className="text-cyan-300">Create and manage computing operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {operations.map((operation) => (
                    <div
                      key={operation.id}
                      className={`flex items-center justify-between p-3 border rounded ${
                        operation.is_active ? "border-emerald-400" : "border-amber-400"
                      }`}
                    >
                      <div>
                        <h4 className={`font-bold ${operation.is_active ? "text-emerald-400" : "text-amber-400"}`}>
                          {operation.name}
                        </h4>
                        <p className={`text-sm ${operation.is_active ? "text-emerald-300" : "text-amber-300"}`}>
                          {operation.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={operation.is_active ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}
                        >
                          {operation.is_active ? "Active" : "Paused"}
                        </Badge>
                        <Button
                          size="sm"
                          className={
                            operation.is_active
                              ? "bg-amber-600 hover:bg-amber-500"
                              : "bg-emerald-600 hover:bg-emerald-500"
                          }
                          onClick={() =>
                            handleOperationAction(operation.id, operation.is_active ? "deactivate" : "activate")
                          }
                        >
                          {operation.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="border border-cyan-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-cyan-400">User Administration</CardTitle>
                <CardDescription className="text-cyan-300">Manage user accounts and privileges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map((user) => (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between p-3 border rounded ${
                        user.is_admin ? "border-violet-400" : user.is_active ? "border-emerald-400" : "border-red-400"
                      }`}
                    >
                      <div>
                        <h4
                          className={`font-bold ${
                            user.is_admin ? "text-violet-400" : user.is_active ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {user.username}
                        </h4>
                        <p
                          className={`text-sm ${
                            user.is_admin ? "text-violet-300" : user.is_active ? "text-emerald-300" : "text-red-300"
                          }`}
                        >
                          {user.display_name || "No display name"} •
                          {user.last_login
                            ? ` Last login: ${new Date(user.last_login).toLocaleDateString()}`
                            : " Never logged in"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            user.is_admin
                              ? "bg-violet-600 text-white"
                              : user.is_active
                                ? "bg-emerald-600 text-white"
                                : "bg-red-600 text-white"
                          }
                        >
                          {user.is_admin ? "Admin" : user.is_active ? "Active" : "Banned"}
                        </Badge>
                        {!user.is_admin && (
                          <>
                            <Button
                              size="sm"
                              className={
                                user.is_active ? "bg-red-600 hover:bg-red-500" : "bg-emerald-600 hover:bg-emerald-500"
                              }
                              onClick={() => handleUserAction(user.id, user.is_active ? "ban" : "unban")}
                            >
                              {user.is_active ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                            </Button>
                            <Button
                              size="sm"
                              className="bg-violet-600 hover:bg-violet-500"
                              onClick={() => handleUserAction(user.id, "toggle_admin")}
                            >
                              <Shield className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring">
            <Card className="border border-cyan-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-cyan-400">Real-time Network Monitoring</CardTitle>
                <CardDescription className="text-cyan-300">
                  Live performance metrics across the distributed network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-emerald-400 rounded">
                    <h4 className="font-bold text-emerald-400 mb-2">Network Health</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-emerald-300">Active Users:</span>
                        <span className="text-emerald-400">{networkStats.totalUsers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-300">Contributing Nodes:</span>
                        <span className="text-emerald-400">{networkStats.activeNodes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-emerald-300">Network Efficiency:</span>
                        <span className="text-emerald-400">94.2%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-amber-400 rounded">
                    <h4 className="font-bold text-amber-400 mb-2">Resource Usage</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-amber-300">Total Compute Power:</span>
                        <span className="text-amber-400">{networkStats.globalComputePower} GFLOPS</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-300">Operations/Second:</span>
                        <span className="text-amber-400">{networkStats.operationsPerSecond}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-300">Average Latency:</span>
                        <span className="text-amber-400">42ms</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="border border-cyan-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-cyan-400">System Activity Logs</CardTitle>
                <CardDescription className="text-cyan-300">Recent admin actions and system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 font-mono text-sm max-h-96 overflow-y-auto">
                  {adminLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`${
                        log.action.includes("login")
                          ? "text-emerald-400"
                          : log.action.includes("ban") || log.action.includes("error")
                            ? "text-red-400"
                            : log.action.includes("operation")
                              ? "text-amber-400"
                              : "text-cyan-400"
                      }`}
                    >
                      [{new Date(log.created_at).toLocaleString()}] {log.action} - {log.users?.username || "System"}
                      {log.details && ` (${JSON.stringify(log.details)})`}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
