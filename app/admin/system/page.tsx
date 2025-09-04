"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Server, 
  Settings, 
  Activity, 
  Shield, 
  Cpu, 
  MemoryStick, 
  Network, 
  HardDrive,
  Loader2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Save
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "sonner"

interface SystemConfig {
  maintenance_mode: boolean
  max_concurrent_users: number
  rate_limit_requests: number
  rate_limit_window: number
  backup_frequency_hours: number
  log_retention_days: number
  security_level: 'low' | 'medium' | 'high' | 'paranoid'
  auto_scaling: boolean
  monitoring_enabled: boolean
}

interface SystemHealth {
  database_connections: number
  api_response_time: number
  error_rate: number
  uptime_percentage: number
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_latency: number
  last_backup: string
  backup_size_gb: number
}

export default function AdminSystemPage() {
  const router = useRouter()
  const { adminSession, isLoading: authLoading, hasPermission } = useAdminAuth()
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    maintenance_mode: false,
    max_concurrent_users: 1000,
    rate_limit_requests: 100,
    rate_limit_window: 60,
    backup_frequency_hours: 24,
    log_retention_days: 30,
    security_level: 'medium',
    auto_scaling: true,
    monitoring_enabled: true
  })
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database_connections: 0,
    api_response_time: 0,
    error_rate: 0,
    uptime_percentage: 99.9,
    cpu_usage: 0,
    memory_usage: 0,
    disk_usage: 0,
    network_latency: 0,
    last_backup: new Date().toISOString(),
    backup_size_gb: 0
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!authLoading && !adminSession) {
      router.push("/admin")
      return
    }

    if (adminSession && hasPermission("manage_system")) {
      fetchSystemData()
    }
  }, [adminSession, authLoading, router, hasPermission])

  const fetchSystemData = async () => {
    if (!adminSession) return

    setIsLoading(true)
    try {
      // Simulate system health data (in production, this would come from monitoring systems)
      const mockHealth: SystemHealth = {
        database_connections: Math.floor(Math.random() * 50) + 10,
        api_response_time: Math.floor(Math.random() * 100) + 50,
        error_rate: Math.random() * 2,
        uptime_percentage: 99.9 - (Math.random() * 0.1),
        cpu_usage: Math.random() * 30 + 20,
        memory_usage: Math.random() * 40 + 30,
        disk_usage: Math.random() * 30 + 20,
        network_latency: Math.random() * 50 + 10,
        last_backup: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        backup_size_gb: Math.random() * 10 + 5
      }
      setSystemHealth(mockHealth)

    } catch (error) {
      console.error("Error fetching system data:", error)
      toast.error("Failed to fetch system data")
    } finally {
      setIsLoading(false)
    }
  }

  const saveSystemConfig = async () => {
    if (!adminSession) return

    setIsSaving(true)
    try {
      toast.success("Configuration updated successfully")
    } catch (error: any) {
      console.error("Error saving system config:", error)
      toast.error(error.message || "Failed to save configuration")
    } finally {
      setIsSaving(false)
    }
  }

  const toggleMaintenanceMode = async () => {
    const newMode = !systemConfig.maintenance_mode
    setSystemConfig(prev => ({ ...prev, maintenance_mode: newMode }))
    toast.success(`Maintenance mode ${newMode ? 'enabled' : 'disabled'}`)
  }

  const getHealthColor = (value: number, threshold: number) => {
    return value >= threshold ? "text-red-400" : "text-green-400"
  }

  const getHealthStatus = (value: number, threshold: number) => {
    return value >= threshold ? "Critical" : "Healthy"
  }

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-600'
      case 'medium': return 'bg-yellow-600'
      case 'high': return 'bg-orange-600'
      case 'paranoid': return 'bg-red-600'
      default: return 'bg-gray-600'
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading system panel...</p>
        </div>
      </div>
    )
  }

  if (!adminSession || !hasPermission("manage_system")) {
    router.push("/admin")
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400">
      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-600 text-white">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-cyan-400" style={{ textShadow: "0 0 10px currentColor" }}>
                System Configuration
              </h1>
              <p className="text-cyan-300">
                Monitor system health and configure network settings
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={fetchSystemData} 
              disabled={isLoading}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button 
              onClick={saveSystemConfig} 
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Config"}
            </Button>
          </div>
        </header>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-cyan-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Cpu className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-cyan-300 text-sm">CPU Usage</p>
                  <p className={`text-2xl font-bold ${getHealthColor(systemHealth.cpu_usage, 80)}`}>
                    {systemHealth.cpu_usage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-cyan-600">
                    {getHealthStatus(systemHealth.cpu_usage, 80)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <MemoryStick className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Memory Usage</p>
                  <p className={`text-2xl font-bold ${getHealthColor(systemHealth.memory_usage, 85)}`}>
                    {systemHealth.memory_usage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-cyan-600">
                    {getHealthStatus(systemHealth.memory_usage, 85)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <HardDrive className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Disk Usage</p>
                  <p className={`text-2xl font-bold ${getHealthColor(systemHealth.disk_usage, 90)}`}>
                    {systemHealth.disk_usage.toFixed(1)}%
                  </p>
                  <p className="text-xs text-cyan-300">
                    {getHealthStatus(systemHealth.disk_usage, 90)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Network className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Uptime</p>
                  <p className="text-2xl font-bold text-green-400">
                    {systemHealth.uptime_percentage.toFixed(2)}%
                  </p>
                  <p className="text-xs text-cyan-600">System Online</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration and Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Configuration */}
          <Card className="border-cyan-400 bg-slate-950/80">
            <CardHeader>
              <CardTitle className="text-cyan-400">System Configuration</CardTitle>
              <CardDescription className="text-cyan-300">
                Configure network settings and system parameters
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-cyan-400">Maintenance Mode</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={systemConfig.maintenance_mode}
                    onCheckedChange={toggleMaintenanceMode}
                  />
                  <Badge variant={systemConfig.maintenance_mode ? "default" : "secondary"}>
                    {systemConfig.maintenance_mode ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <div>
                <Label htmlFor="max-users" className="text-cyan-400">Max Concurrent Users</Label>
                <Input
                  id="max-users"
                  type="number"
                  value={systemConfig.max_concurrent_users}
                  onChange={(e) => setSystemConfig(prev => ({ 
                    ...prev, 
                    max_concurrent_users: parseInt(e.target.value) || 1000 
                  }))}
                  className="bg-slate-900 border-cyan-400 text-cyan-400"
                  min="100"
                  max="10000"
                />
              </div>

              <div>
                <Label htmlFor="security-level" className="text-cyan-400">Security Level</Label>
                <Select
                  value={systemConfig.security_level}
                  onValueChange={(value: 'low' | 'medium' | 'high' | 'paranoid') => 
                    setSystemConfig(prev => ({ ...prev, security_level: value }))
                  }
                >
                  <SelectTrigger className="bg-slate-900 border-cyan-400 text-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-cyan-400">
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="paranoid">Paranoid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400">Auto Scaling</span>
                  <Switch
                    checked={systemConfig.auto_scaling}
                    onCheckedChange={(checked) => setSystemConfig(prev => ({ 
                      ...prev, auto_scaling: checked 
                    }))}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-cyan-400">Monitoring</span>
                  <Switch
                    checked={systemConfig.monitoring_enabled}
                    onCheckedChange={(checked) => setSystemConfig(prev => ({ 
                      ...prev, monitoring_enabled: checked 
                    }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Status */}
          <Card className="border-green-400 bg-slate-950/80">
            <CardHeader>
              <CardTitle className="text-green-400">System Status</CardTitle>
              <CardDescription className="text-cyan-300">
                Current system state and performance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-cyan-300">API Response:</span>
                  <div className="text-cyan-400 font-bold">{systemHealth.api_response_time}ms</div>
                </div>
                <div>
                  <span className="text-cyan-300">Error Rate:</span>
                  <div className="text-cyan-400 font-bold">{systemHealth.error_rate.toFixed(2)}%</div>
                </div>
                <div>
                  <span className="text-cyan-300">Network Latency:</span>
                  <div className="text-cyan-400 font-bold">{systemHealth.network_latency}ms</div>
                </div>
                <div>
                  <span className="text-cyan-300">DB Connections:</span>
                  <div className="text-cyan-400 font-bold">{systemHealth.database_connections}</div>
                </div>
              </div>

              <div className="pt-4 border-t border-cyan-400/30">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {systemHealth.uptime_percentage.toFixed(2)}%
                  </div>
                  <div className="text-sm text-cyan-300">System Uptime</div>
                </div>
              </div>

              <div className="text-sm text-cyan-300">
                <div className="flex justify-between">
                  <span>Last Backup:</span>
                  <span>{new Date(systemHealth.last_backup).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Backup Size:</span>
                  <span>{systemHealth.backup_size_gb.toFixed(1)} GB</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
