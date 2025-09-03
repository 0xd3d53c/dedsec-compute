"use client"

import { useEffect, useRef, useState } from "react"
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
  Play,
  Pause,
  Eye,
  Share2,
} from "lucide-react"
import { HardwareMonitor, type ResourceLimits, type RealTimeStats } from "@/lib/hardware-detection"
import { BackgroundWorker } from "@/lib/background-worker"
import { detectCompromise } from "@/lib/security"
import QRCode from "qrcode"

export default function Dashboard() {
  const router = useRouter()

  const [user, setUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [sessionRecord, setSessionRecord] = useState<any>(null)
  const [networkStats, setNetworkStats] = useState<any>(null)
  const [operations, setOperations] = useState<any[]>([])
  const [myMissions, setMyMissions] = useState<any[]>([])
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
  const [deviceInfo, setDeviceInfo] = useState<{ cpu_cores: number; total_memory_gb: number } | null>(null)

  const [consentGranted, setConsentGranted] = useState<boolean>(false)

  const [socialStats, setSocialStats] = useState({
    computeHours: 0,
    rank: "-",
    followers: 0,
  })

  const [inviteCode, setInviteCode] = useState<string>("")
  const [shareLink, setShareLink] = useState<string>("")
  const [qrDataUrl, setQrDataUrl] = useState<string>("")

  const monitorRef = useRef<HardwareMonitor | null>(null)
  const workerRef = useRef<BackgroundWorker | null>(null)

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
      loadUserProfile(user.id)
      loadUserData(user.id)
      loadSocialData(user.id)
      loadMyMissions(user.id)
      prepareInvite(user.id)
      loadConsent(user.id)

      // Block contribution if compromised
      const compromise = detectCompromise()
      if (compromise.isSuspected) {
        setIsContributing(false)
      }
    }
    checkAuth()

    loadNetworkData()

    // Initialize hardware monitor for live stats
    const limits: ResourceLimits = {
      max_cpu_percent: 100,
      max_memory_mb: 16384,
      only_when_charging: false,
      only_when_idle: false,
      temperature_threshold: 85,
      max_battery_drain_percent: 100,
    }
    const monitor = new HardwareMonitor(limits)
    monitor.onStatsUpdate((stats: RealTimeStats) => {
      setRealTimeStats({
        cpuUsage: Math.round(stats.cpu_usage),
        memoryUsage: Math.round(stats.memory_usage),
        temperature: Math.round(stats.temperature || 0),
        batteryLevel: Math.round(stats.battery_level || 0),
        isCharging: !!stats.is_charging,
      })
    })
    monitor.startMonitoring(2000)
    monitorRef.current = monitor

    // Capture stable device info once
    monitor.detectEnhancedHardware().then((info) => {
      // Get actual device memory from browser if available
      const actualMemory = (navigator as any).deviceMemory || info.total_memory_gb
      setDeviceInfo({ cpu_cores: info.cpu_cores, total_memory_gb: actualMemory })
    })

    const interval = setInterval(() => {
      loadNetworkData()
    }, 20000)

    // realtime subscriptions
    const supabase = createClient()
    const channel = supabase
      .channel("dashboard_rt")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "network_metrics" }, () => loadNetworkData())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_sessions" }, (payload) => {
        if (user && payload.new && payload.new.user_id === user.id) loadUserData(user.id)
      })
      .subscribe()

    return () => {
      clearInterval(interval)
      channel.unsubscribe()
      monitorRef.current?.stopMonitoring()
      monitorRef.current = null
    }
  }, [router])

  const loadUserProfile = async (userId: string) => {
    const supabase = createClient()

    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single()

    if (profile) {
      setUserProfile(profile)
    }
  }

  const loadUserData = async (userId: string) => {
    const supabase = createClient()

    const { data: userSession } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (userSession) {
      setSessionRecord(userSession)
      setIsContributing(userSession.is_contributing)
      setCpuPercent([userSession.max_cpu_percent])
      setMemoryMB([userSession.max_memory_mb])
      setOnlyWhenCharging(userSession.only_when_charging)
      setOnlyWhenIdle(userSession.only_when_idle)
    }
  }

  const loadNetworkData = async () => {
    const supabase = createClient()

    const { data: stats } = await supabase
      .from("network_metrics")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    const { data: ops } = await supabase.from("operations").select("*").eq("is_active", true)

    setNetworkStats(stats)
    setOperations(ops || [])
  }

  const loadConsent = async (userId: string) => {
    const supabase = createClient()
    const { data } = await supabase
      .from("user_consents")
      .select("granted, revoked_at")
      .eq("user_id", userId)
      .eq("consent_type", "distributed_compute")
      .order("granted_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    setConsentGranted(!!(data && data.granted && !data.revoked_at))
  }

  const loadMyMissions = async (userId: string) => {
    const supabase = createClient()

    const { data: missions } = await supabase
      .from("user_missions")
      .select(`
        id,
        mission_id,
        status,
        started_at,
        completed_at,
        missions (
          id,
          code,
          title,
          description,
          difficulty
        )
      `)
      .eq("user_id", userId)
      .in("status", ["accepted", "in_progress"])
      .order("updated_at", { ascending: false })
      .limit(3)

    setMyMissions(missions || [])
  }

  const loadSocialData = async (userId: string) => {
    const supabase = createClient()

    // Compute hours from task_executions compute_time_ms
    const { data: tasks } = await supabase
      .from("task_executions")
      .select("compute_time_ms, user_id, status")
    const myCompleted = (tasks || []).filter((t: any) => t.user_id === userId && t.status === "completed")
    const myMs = myCompleted.reduce((acc: number, t: any) => acc + (t.compute_time_ms || 0), 0)
    const computeHours = Math.round((myMs / (1000 * 60 * 60)) * 100) / 100

    // Rank by number of completed tasks (client-side aggregation)
    const counts: Record<string, number> = {}
    ;(tasks || []).forEach((t: any) => {
      if (t.status === "completed") counts[t.user_id] = (counts[t.user_id] || 0) + 1
    })
    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([uid]) => uid)
    const rankIndex = sorted.indexOf(userId)
    const rank = rankIndex >= 0 ? `#${rankIndex + 1}` : "-"

    // Followers count
    const { count: followers } = await supabase
      .from("followers")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId)

    setSocialStats({ computeHours, rank, followers: followers || 0 })
  }

  const prepareInvite = async (userId: string) => {
    const supabase = createClient()
    // Find an active code or create one
    const { data: existing } = await supabase
      .from("invite_codes")
      .select("code, is_active, expires_at")
      .eq("created_by", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle()

    let code = existing?.code
    if (!code) {
      const newCode = `d3d_${userId.slice(0, 6)}_${Math.random().toString(36).slice(2, 6)}`.toUpperCase()
      const { data: created, error } = await supabase
        .from("invite_codes")
        .insert({ code: newCode, created_by: userId, max_uses: 10, is_active: true })
        .select("code")
        .single()
      if (!error) code = created.code
    }

    if (code) {
      const link = `${window.location.origin}/auth/signup?invite=${encodeURIComponent(code)}`
      setInviteCode(code)
      setShareLink(link)
      try {
        const dataUrl = await QRCode.toDataURL(link, { margin: 1, width: 180 })
        setQrDataUrl(dataUrl)
      } catch {
        setQrDataUrl("")
      }
    }
  }

  const onShareInvite = async () => {
    if (!shareLink) return
    const text = `Join DedSecCompute with my invite code: ${inviteCode}`
    if (navigator.share) {
      try {
        await navigator.share({ title: "DedSecCompute", text, url: shareLink })
        return
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(shareLink)
      alert("Invite link copied to clipboard")
    } catch {}
  }

  const toggleContribution = async () => {
    const newState = !isContributing
    setIsContributing(newState)

    if (sessionRecord) {
      const supabase = createClient()
      await supabase.from("user_sessions").update({ is_contributing: newState }).eq("id", sessionRecord.id)
    }

    // Start/stop background worker based on consent and toggle
    if (newState && consentGranted && user) {
      if (!workerRef.current) {
        workerRef.current = new BackgroundWorker(user.id)
      }
      await workerRef.current.start()
    } else {
      if (workerRef.current) {
        await workerRef.current.stop()
        workerRef.current = null
      }
    }
  }

  const toggleConsent = async () => {
    if (!user) return
    const supabase = createClient()
    const newGranted = !consentGranted
    const version = "v1.0"
    if (newGranted) {
      await supabase
        .from("user_consents")
        .insert({ user_id: user.id, consent_type: "distributed_compute", granted: true, version })
    } else {
      await supabase
        .from("user_consents")
        .insert({ user_id: user.id, consent_type: "distributed_compute", granted: false, version, revoked_at: new Date().toISOString() })
    }
    setConsentGranted(newGranted)
    // If consent revoked, stop worker
    if (!newGranted && workerRef.current) {
      await workerRef.current.stop()
      workerRef.current = null
      setIsContributing(false)
      if (sessionRecord) {
        await supabase.from("user_sessions").update({ is_contributing: false }).eq("id", sessionRecord.id)
      }
    }
  }

  const updateSettings = async () => {
    if (sessionRecord) {
      const supabase = createClient()
      await supabase
        .from("user_sessions")
        .update({
          max_cpu_percent: cpuPercent[0],
          max_memory_mb: memoryMB[0],
          only_when_charging: onlyWhenCharging,
          only_when_idle: onlyWhenIdle,
        })
        .eq("id", sessionRecord.id)
    }
    // Also update monitor limits locally
    if (monitorRef.current) {
      monitorRef.current.updateLimits({
        max_cpu_percent: cpuPercent[0],
        max_memory_mb: memoryMB[0],
        only_when_charging: onlyWhenCharging,
        only_when_idle: onlyWhenIdle,
      })
    }
  }



  const generateInviteCode = () => {
    return inviteCode || (sessionRecord?.user_id ? `d3d_${sessionRecord.user_id.slice(0, 8).toUpperCase()}` : "d3d_LOADING")
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
        {/* Page Title */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold dedsec-glow text-blue-400">Dashboard</h1>
          <p className="text-sm sm:text-base text-cyan-300">Monitor your contribution to the network</p>
        </div>

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
              <div className="text-lg sm:text-2xl font-bold text-blue-400">{networkStats?.active_users || 0}</div>
              <p className="text-xs text-cyan-300">Contributing now</p>
            </CardContent>
          </Card>

          <Card className="dedsec-border bg-slate-950/80">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-blue-400 text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                <Cpu className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">CPU Cores (Device)</span>
                <span className="sm:hidden">CPU</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-cyan-400">{deviceInfo?.cpu_cores ?? 0}</div>
              <p className="text-xs text-cyan-300">Device capacity</p>
            </CardContent>
          </Card>

          <Card className="dedsec-border bg-slate-950/80">
            <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
              <CardTitle className="text-blue-400 text-xs sm:text-sm flex items-center gap-1 sm:gap-2">
                <MemoryStick className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Total Memory (Device)</span>
                <span className="sm:hidden">Memory</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
              <div className="text-lg sm:text-2xl font-bold text-orange-400">
                {deviceInfo?.total_memory_gb ? `${deviceInfo.total_memory_gb.toFixed(1)} GB` : "0.0 GB"}
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
              value="missions"
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs sm:text-sm py-2 px-1 sm:px-3"
            >
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
              <span className="hidden sm:inline">Missions</span>
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
                      <div className="text-blue-400 font-bold">{realTimeStats.memoryUsage}%</div>
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
                        {networkStats?.operations_per_second
                          ? Math.min(
                              100,
                              Math.floor(((networkStats.operations_per_second || 0) / (networkStats.total_cpu_cores || 1)) * 100),
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
                            networkStats?.operations_per_second
                              ? Math.min(
                                  100,
                                  Math.floor(((networkStats.operations_per_second || 0) / (networkStats.total_cpu_cores || 1)) * 100),
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
                      <div className="text-blue-400 font-bold">{networkStats?.average_latency_ms ?? 0}ms</div>
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
                        <span className="text-blue-400">{socialStats.computeHours}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300">Rank:</span>
                        <span className="text-blue-400">{socialStats.rank}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyan-300">Followers:</span>
                        <span className="text-blue-400">{socialStats.followers}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-blue-400 mb-2">Invite Code</h4>
                    <div className="flex items-center gap-2">
                      <code className="bg-gray-800 px-3 py-2 rounded text-blue-400 font-mono">
                        {generateInviteCode()}
                      </code>
                      <Button size="sm" className="dedsec-button" onClick={onShareInvite}>
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                    {qrDataUrl && (
                      <div className="mt-3">
                        <img src={qrDataUrl} alt="Invite QR" className="border border-blue-400/30 rounded p-2 bg-slate-900" />
                      </div>
                    )}
                    <p className="text-xs text-cyan-300 mt-2">Share this code to invite others to the network</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="missions">
            <Card className="dedsec-border bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-blue-400 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Ongoing Missions ({myMissions.length})
                </CardTitle>
                <CardDescription className="text-cyan-300">
                  Your active missions in the network
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myMissions.map((mission) => (
                    <div key={mission.id} className="border border-blue-400 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-blue-400">{mission.missions?.title || "Unknown Mission"}</h4>
                        <Badge className={mission.status === "in_progress" ? "bg-green-600" : "bg-blue-600"}>
                          {mission.status === "in_progress" ? "In Progress" : "Accepted"}
                        </Badge>
                      </div>
                      <p className="text-cyan-300 text-sm mb-2">{mission.missions?.description || "No description available"}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-blue-600">
                          Code: {mission.missions?.code || "N/A"} | Difficulty: {mission.missions?.difficulty || "Unknown"}
                        </div>
                        {mission.started_at && (
                          <div className="text-xs text-cyan-300">
                            Started: {new Date(mission.started_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {myMissions.length === 0 && (
                    <div className="text-center py-8 text-blue-600">
                      <p>No active missions.</p>
                      <p className="text-sm">Accept missions to start contributing to the network.</p>
                    </div>
                  )}

                  <div className="pt-4 border-t border-blue-400/30">
                    <Button 
                      onClick={() => router.push("/missions")} 
                      className="w-full dedsec-button"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View All Missions
                    </Button>
                  </div>
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
                  <div className="flex items-center justify-between">
                    <Label className="text-blue-400">Allow distributed compute (consent)</Label>
                    <Switch checked={consentGranted} onCheckedChange={toggleConsent} />
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
