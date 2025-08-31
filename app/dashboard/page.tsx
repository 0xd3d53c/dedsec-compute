"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Shield,
  Users,
  Cpu,
  MemoryStick,
  Zap,
  Activity,
  Settings,
  LogOut,
  Play,
  Pause,
  Eye,
  Share2,
} from "lucide-react"

export default function Dashboard() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [follower, setFollower] = useState<any>(null)
  const [networkStats, setNetworkStats] = useState<any>(null)
  const [operations, setOperations] = useState<any[]>([])
  const [isContributing, setIsContributing] = useState(false)
  const [cpuPercent, setCpuPercent] = useState([25])
  const [memoryMB, setMemoryMB] = useState([512])
  const [onlyWhenCharging, setOnlyWhenCharging] = useState(true)
  const [onlyWhenIdle, setOnlyWhenIdle] = useState(true)
  const [realTimeStats, setRealTimeStats] = useState({
    cpuUsage: 0,
    memoryUsage: 0,
    temperature: 0,
    batteryLevel: 100,
    isCharging: true,
  })

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)
      loadUserData(user.id)
    }
    checkAuth()

    loadNetworkData()
    const interval = setInterval(() => {
      loadNetworkData()
      updateRealTimeStats()
    }, 2000)

    return () => clearInterval(interval)
  }, [router])

  const loadUserData = async (userId: string) => {
    const supabase = createClient()

    const { data: followerData } = await supabase.from("followers").select("*").eq("user_id", userId).single()

    if (followerData) {
      setFollower(followerData)
      setIsContributing(followerData.is_contributing)
      setCpuPercent([followerData.max_cpu_percent])
      setMemoryMB([followerData.max_memory_mb])
      setOnlyWhenCharging(followerData.only_when_charging)
      setOnlyWhenIdle(followerData.only_when_idle)
    }
  }

  const loadNetworkData = async () => {
    const supabase = createClient()

    const { data: stats } = await supabase.from("network_metrics").select("*").order("created_at", { ascending: false }).limit(1).single()
    const { data: ops } = await supabase.from("operations").select("*").eq("is_active", true)

    setNetworkStats(stats)
    setOperations(ops || [])
  }

  const updateRealTimeStats = () => {
    setRealTimeStats({
      cpuUsage: Math.floor(Math.random() * (isContributing ? cpuPercent[0] : 10)),
      memoryUsage: Math.floor(Math.random() * (isContributing ? memoryMB[0] : 100)),
      temperature: Math.floor(Math.random() * 20) + 35,
      batteryLevel: Math.floor(Math.random() * 100),
      isCharging: Math.random() > 0.3,
    })
  }

  const toggleContribution = async () => {
    const newState = !isContributing
    setIsContributing(newState)

    if (follower) {
      const supabase = createClient()
      await supabase.from("followers").update({ is_contributing: newState }).eq("id", follower.id)
    }
  }

  const updateSettings = async () => {
    if (follower) {
      const supabase = createClient()
      await supabase
        .from("followers")
        .update({
          max_cpu_percent: cpuPercent[0],
          max_memory_mb: memoryMB[0],
          only_when_charging: onlyWhenCharging,
          only_when_idle: onlyWhenIdle,
        })
        .eq("id", follower.id)
    }
  }

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/")
  }

  const generateInviteCode = () => {
    return follower?.user_id ? `d3d_${follower.user_id.slice(0, 8).toUpperCase()}` : "d3d_LOADING"
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-blue-400 matrix-bg flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-4 dedsec-glow text-blue-400">DedSecCompute</h1>
          <p className="text-cyan-300 mb-6">Access required to join the collective</p>
          <Button onClick={() => router.push("/auth/login")} className="dedsec-button">
            Login to Network
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-blue-400 matrix-bg">
      <div className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-500 text-white">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold dedsec-glow text-blue-400">DedSec Network</h1>
              <p className="text-sm sm:text-base text-cyan-300">Distributed Computing Collective</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto">
            <Button onClick={handleLogout} className="dedsec-button text-xs sm:text-sm px-3 sm:px-4">
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Logout
            </Button>
          </div>
        </header>

        {/* Status Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <Card className="dedsec-border bg-slate-950/80">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-blue-400 text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Active Followers</span>
                <span className="sm:hidden">Active</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-blue-400">{networkStats?.active_followers || 0}</div>
              <p className="text-xs text-cyan-300">Contributing now</p>
            </CardContent>
          </Card>

          <Card className="dedsec-border bg-slate-950/80">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-blue-400 text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                <Cpu className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Total CPU Cores</span>
                <span className="sm:hidden">CPU</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-cyan-400">{networkStats?.total_cpu_cores || 0}</div>
              <p className="text-xs text-cyan-300">Network capacity</p>
            </CardContent>
          </Card>

          <Card className="dedsec-border bg-slate-950/80">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-blue-400 text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                <MemoryStick className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Total Memory</span>
                <span className="sm:hidden">Memory</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-orange-400">
                {networkStats?.total_memory_gb ? `${networkStats.total_memory_gb.toFixed(1)} GB` : "0.0 GB"}
              </div>
              <p className="text-xs text-cyan-300">Available RAM</p>
            </CardContent>
          </Card>

          <Card className="dedsec-border bg-slate-950/80">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-blue-400 text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Compute Power</span>
                <span className="sm:hidden">Power</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-orange-400">
                {networkStats?.current_compute_power || 0}
              </div>
              <p className="text-xs text-cyan-300">Active GFLOPS</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="monitor" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-slate-950 border border-blue-400 w-full grid grid-cols-4 h-auto p-1">
            <TabsTrigger
              value="monitor"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm py-2 px-1 sm:px-3"
            >
              <Activity className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Monitor</span>
            </TabsTrigger>
            <TabsTrigger
              value="social"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm py-2 px-1 sm:px-3"
            >
              <Users className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Social</span>
            </TabsTrigger>
            <TabsTrigger
              value="operations"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm py-2 px-1 sm:px-3"
            >
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Operations</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm py-2 px-1 sm:px-3"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitor">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contribution Control */}
              <Card className="dedsec-border bg-slate-950/80">
                <CardHeader>
                  <CardTitle className="text-blue-400 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Contribution Status
                  </CardTitle>
                  <CardDescription className="text-cyan-300">
                    Control your device's participation in the network
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-blue-400">{isContributing ? "Contributing" : "Paused"}</h4>
                      <p className="text-sm text-cyan-300">
                        {isContributing ? "Your device is actively contributing" : "Contribution is paused"}
                      </p>
                    </div>
                    <Button
                      onClick={toggleContribution}
                      className={isContributing ? "bg-orange-600 hover:bg-orange-500" : "dedsec-button"}
                    >
                      {isContributing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-cyan-300">CPU Usage:</span>
                      <div className="text-blue-400 font-bold">{realTimeStats.cpuUsage}%</div>
                    </div>
                    <div>
                      <span className="text-cyan-300">Memory:</span>
                      <div className="text-blue-400 font-bold">{realTimeStats.memoryUsage}MB</div>
                    </div>
                    <div>
                      <span className="text-cyan-300">Temperature:</span>
                      <div className="text-orange-400 font-bold">{realTimeStats.temperature}°C</div>
                    </div>
                    <div>
                      <span className="text-cyan-300">Battery:</span>
                      <div className="text-blue-400 font-bold">
                        {realTimeStats.batteryLevel}% {realTimeStats.isCharging ? "⚡" : "🔋"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Network Efficiency */}
              <Card className="dedsec-border bg-slate-950/80">
                <CardHeader>
                  <CardTitle className="text-blue-400">Network Efficiency</CardTitle>
                  <CardDescription className="text-cyan-300">Real-time network performance metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-cyan-300">Overall Efficiency</span>
                      <span className="text-blue-400">
                        {networkStats?.current_compute_power
                          ? Math.min(
                              100,
                              Math.floor((networkStats.current_compute_power / networkStats.total_cpu_cores) * 100),
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-blue-400 h-2 rounded-full transition-all duration-1000"
                        style={{
                          width: `${
                            networkStats?.current_compute_power
                              ? Math.min(
                                  100,
                                  Math.floor((networkStats.current_compute_power / networkStats.total_cpu_cores) * 100),
                                )
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-cyan-300">Average Latency</span>
                      <div className="text-blue-400 font-bold">{Math.floor(Math.random() * 50) + 20}ms</div>
                    </div>
                    <div>
                      <span className="text-cyan-300">Network Status</span>
                      <div className="text-blue-400 font-bold">Online</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="social">
            <Card className="dedsec-border bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-blue-400">Social Features</CardTitle>
                <CardDescription className="text-cyan-300">
                  Connect with other followers and share your invite code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold text-blue-400 mb-2">Your Stats</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-cyan-300">Compute Hours:</span>
                        <span className="text-blue-400">{follower?.total_compute_hours || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300">Rank:</span>
                        <span className="text-blue-400">#42</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300">Followers:</span>
                        <span className="text-blue-400">0</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-blue-400 mb-2">Invite Code</h4>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-800 px-3 py-2 rounded text-blue-400 font-mono">
                        {generateInviteCode()}
                      </code>
                      <Button size="sm" className="dedsec-button">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-cyan-300 mt-2">Share this code to invite others to the network</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations">
            <Card className="dedsec-border bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Available Operations ({operations.filter((op) => op.is_active).length})
                </CardTitle>
                <CardDescription className="text-cyan-300">
                  Computing operations available to the network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {operations.map((operation) => (
                    <div key={operation.id} className="border border-blue-400 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-blue-400">{operation.name}</h4>
                        <Badge className={operation.is_active ? "bg-blue-600" : "bg-gray-600"}>
                          {operation.is_active ? "Active" : "Locked"}
                        </Badge>
                      </div>
                      <p className="text-cyan-300 text-sm mb-2">{operation.description}</p>
                      <div className="text-xs text-blue-600">
                        Required compute power: {operation.required_compute_power} GFLOPS
                      </div>
                    </div>
                  ))}

                  {operations.filter((op) => op.is_active).length === 0 && (
                    <div className="text-center py-8 text-blue-600">
                      <p>No operations available yet.</p>
                      <p className="text-sm">Network needs more compute power to unlock operations.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card className="dedsec-border bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-blue-400">Resource Settings</CardTitle>
                <CardDescription className="text-cyan-300">
                  Configure how much of your device's resources to contribute
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-blue-400 mb-2 block">Maximum CPU Usage: {cpuPercent[0]}%</Label>
                  <Slider
                    value={cpuPercent}
                    onValueChange={setCpuPercent}
                    max={100}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                <div>
                  <Label className="text-blue-400 mb-2 block">Maximum Memory Usage: {memoryMB[0]}MB</Label>
                  <Slider
                    value={memoryMB}
                    onValueChange={setMemoryMB}
                    max={2048}
                    min={128}
                    step={64}
                    className="w-full"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-blue-400">Only when charging</Label>
                    <Switch checked={onlyWhenCharging} onCheckedChange={setOnlyWhenCharging} />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="text-blue-400">Only when idle</Label>
                    <Switch checked={onlyWhenIdle} onCheckedChange={setOnlyWhenIdle} />
                  </div>
                </div>

                <Button onClick={updateSettings} className="w-full dedsec-button">
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
