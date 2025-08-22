"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Shield, Users, Activity, LogOut, Zap, AlertTriangle, TrendingUp, Ban, Play, Pause } from "lucide-react"

export default function AdminDashboard() {
  const router = useRouter()
  const [networkStats, setNetworkStats] = useState({
    totalUsers: 0,
    activeNodes: 0,
    globalComputePower: 0,
    operationsPerSecond: 0,
  })

  useEffect(() => {
    const adminSession = localStorage.getItem("admin_session")
    if (!adminSession) {
      router.push("/admin")
      return
    }

    const interval = setInterval(() => {
      setNetworkStats({
        totalUsers: Math.floor(Math.random() * 1000) + 500,
        activeNodes: Math.floor(Math.random() * 100) + 50,
        globalComputePower: Math.floor(Math.random() * 5000) + 2000,
        operationsPerSecond: Math.floor(Math.random() * 1000) + 500,
      })
    }, 2000)

    return () => clearInterval(interval)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("admin_session")
    router.push("/admin")
  }

  return (
    <div className="min-h-screen bg-black text-red-400 matrix-bg">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-400 text-black">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-red-400" style={{ textShadow: "0 0 10px currentColor" }}>
                Admin Control Panel
              </h1>
              <p className="text-red-300">DedSecCompute Network Administration</p>
            </div>
          </div>
          <Button onClick={handleLogout} className="bg-red-600 hover:bg-red-500 text-white">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </header>

        {/* Network Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border border-red-400 bg-black/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-400">{networkStats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-red-300">Registered followers</p>
            </CardContent>
          </Card>

          <Card className="border border-red-400 bg-black/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Active Nodes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">{networkStats.activeNodes}</div>
              <p className="text-xs text-red-300">Currently contributing</p>
            </CardContent>
          </Card>

          <Card className="border border-red-400 bg-black/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Compute Power
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">{networkStats.globalComputePower}</div>
              <p className="text-xs text-red-300">Total GFLOPS</p>
            </CardContent>
          </Card>

          <Card className="border border-red-400 bg-black/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Operations/Sec
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-400">{networkStats.operationsPerSecond}</div>
              <p className="text-xs text-red-300">Network throughput</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Tabs */}
        <Tabs defaultValue="missions" className="space-y-6">
          <TabsList className="bg-black border border-red-400">
            <TabsTrigger value="missions" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Mission Control
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              User Management
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              Network Monitoring
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
              System Logs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="missions">
            <Card className="border border-red-400 bg-black/80">
              <CardHeader>
                <CardTitle className="text-red-400">Mission Management</CardTitle>
                <CardDescription className="text-red-300">Create and manage computing operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-green-400 rounded">
                    <div>
                      <h4 className="font-bold text-green-400">OPERATION_PRIME_SWEEP</h4>
                      <p className="text-sm text-green-300">Search for large prime numbers</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600 text-white">Active</Badge>
                      <Button size="sm" className="bg-yellow-600 hover:bg-yellow-500">
                        <Pause className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-yellow-400 rounded">
                    <div>
                      <h4 className="font-bold text-yellow-400">OPERATION_CRYPTO_MINE</h4>
                      <p className="text-sm text-yellow-300">Distributed cryptocurrency mining</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-yellow-600 text-white">Paused</Badge>
                      <Button size="sm" className="bg-green-600 hover:bg-green-500">
                        <Play className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-red-400 rounded">
                    <div>
                      <h4 className="font-bold text-red-400">OPERATION_DATA_CRUNCH</h4>
                      <p className="text-sm text-red-300">Large-scale data processing</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-red-600 text-white">Locked</Badge>
                      <Button size="sm" disabled>
                        <AlertTriangle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card className="border border-red-400 bg-black/80">
              <CardHeader>
                <CardTitle className="text-red-400">User Administration</CardTitle>
                <CardDescription className="text-red-300">Manage user accounts and privileges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-green-400 rounded">
                    <div>
                      <h4 className="font-bold text-green-400">user_d3d_A1B2C3D4</h4>
                      <p className="text-sm text-green-300">Active contributor • 24.5 hours donated</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-600 text-white">Active</Badge>
                      <Button size="sm" className="bg-red-600 hover:bg-red-500">
                        <Ban className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border border-blue-400 rounded">
                    <div>
                      <h4 className="font-bold text-blue-400">admin_d3d_ADMIN001</h4>
                      <p className="text-sm text-blue-300">Administrator • Full privileges</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-600 text-white">Admin</Badge>
                      <Button size="sm" disabled>
                        <Shield className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring">
            <Card className="border border-red-400 bg-black/80">
              <CardHeader>
                <CardTitle className="text-red-400">Real-time Network Monitoring</CardTitle>
                <CardDescription className="text-red-300">
                  Live performance metrics across the distributed network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-green-400 rounded">
                    <h4 className="font-bold text-green-400 mb-2">Network Health</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-green-300">Uptime:</span>
                        <span className="text-green-400">99.97%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-300">Avg Latency:</span>
                        <span className="text-green-400">45ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-300">Error Rate:</span>
                        <span className="text-green-400">0.03%</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border border-yellow-400 rounded">
                    <h4 className="font-bold text-yellow-400 mb-2">Resource Usage</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-yellow-300">CPU Utilization:</span>
                        <span className="text-yellow-400">67%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-300">Memory Usage:</span>
                        <span className="text-yellow-400">2.4TB</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-yellow-300">Network I/O:</span>
                        <span className="text-yellow-400">1.2GB/s</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="border border-red-400 bg-black/80">
              <CardHeader>
                <CardTitle className="text-red-400">System Activity Logs</CardTitle>
                <CardDescription className="text-red-300">Recent admin actions and system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 font-mono text-sm">
                  <div className="text-green-400">[2024-01-22 21:10:45] Admin login successful - admin</div>
                  <div className="text-yellow-400">
                    [2024-01-22 21:09:32] Operation PRIME_SWEEP status changed to active
                  </div>
                  <div className="text-blue-400">[2024-01-22 21:08:15] New user registered - d3d_X9Y8Z7W6</div>
                  <div className="text-green-400">[2024-01-22 21:07:03] Network stats updated - 847 active nodes</div>
                  <div className="text-red-400">
                    [2024-01-22 21:05:21] Security alert - Failed login attempt from 192.168.1.100
                  </div>
                  <div className="text-cyan-400">
                    [2024-01-22 21:04:12] Compute task completed - Task ID: 0x4A5B6C7D
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
