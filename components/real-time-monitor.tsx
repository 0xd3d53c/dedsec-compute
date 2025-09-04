"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  Cpu, 
  MemoryStick, 
  Thermometer, 
  Activity, 
  Battery,
  Network,
  Monitor,
  Smartphone
} from "lucide-react"
import { HardwareMonitor, type RealTimeStats, type DeviceInfo } from "@/lib/hardware-detection"

interface RealTimeMonitorProps {
  userId?: string
}

export default function RealTimeMonitor({ userId }: RealTimeMonitorProps) {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [realTimeStats, setRealTimeStats] = useState<RealTimeStats | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [monitor, setMonitor] = useState<HardwareMonitor | null>(null)

  useEffect(() => {
    const initializeMonitor = async () => {
      try {
        // Initialize hardware monitor
        const hardwareMonitor = new HardwareMonitor({
          max_cpu_percent: 100,
          max_memory_mb: 16384,
          only_when_charging: false,
          only_when_idle: false,
          temperature_threshold: 85,
          max_battery_drain_percent: 100,
        })

        // Get initial device info
        const info = await hardwareMonitor.detectEnhancedHardware()
        setDeviceInfo(info)

        // Set up real-time monitoring
        hardwareMonitor.onStatsUpdate((stats) => {
          setRealTimeStats(stats)
        })

        // Start monitoring
        hardwareMonitor.startMonitoring(1000) // Update every second
        setIsMonitoring(true)
        setMonitor(hardwareMonitor)

        return () => {
          hardwareMonitor.stopMonitoring()
        }
      } catch (error) {
        console.error('Failed to initialize hardware monitor:', error)
      }
    }

    initializeMonitor()
  }, [])

  const getTemperatureColor = (temp: number) => {
    if (temp < 40) return 'text-blue-400'
    if (temp < 60) return 'text-green-400'
    if (temp < 80) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getTemperatureIcon = (temp: number) => {
    if (temp < 40) return '❄️'
    if (temp < 60) return '🌡️'
    if (temp < 80) return '🔥'
    return '🚨'
  }

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone className="w-4 h-4" />
      case 'tablet': return <Smartphone className="w-4 h-4" />
      case 'desktop': return <Monitor className="w-4 h-4" />
      default: return <Monitor className="w-4 h-4" />
    }
  }

  if (!deviceInfo || !realTimeStats) {
    return (
      <Card className="border-cyan-400 bg-slate-950/80">
        <CardHeader>
          <CardTitle className="text-cyan-400">Real-Time Hardware Monitor</CardTitle>
          <CardDescription className="text-cyan-300">
            Initializing hardware detection...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Device Information */}
      <Card className="border-blue-400 bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-400 flex items-center gap-2">
            {getDeviceIcon(deviceInfo.device_type)}
            Device Information
          </CardTitle>
          <CardDescription className="text-blue-300">
            Hardware specifications and capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">CPU</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">{deviceInfo.cpu_cores}</div>
              <div className="text-xs text-blue-200">Logical Cores</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MemoryStick className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Memory</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">{deviceInfo.total_memory_gb.toFixed(1)}</div>
              <div className="text-xs text-blue-200">GB Total</div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">Performance</span>
              </div>
              <div className="text-2xl font-bold text-blue-400">{deviceInfo.performance_score}</div>
              <div className="text-xs text-blue-200">Score</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-400/30">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-300">Platform:</span>
                <span className="text-blue-200 ml-2">{deviceInfo.platform}</span>
              </div>
              <div>
                <span className="text-blue-300">Architecture:</span>
                <span className="text-blue-200 ml-2">{deviceInfo.architecture}</span>
              </div>
              <div>
                <span className="text-blue-300">Device Type:</span>
                <span className="text-blue-200 ml-2 capitalize">{deviceInfo.device_type}</span>
              </div>
              <div>
                <span className="text-blue-300">GPU:</span>
                <span className="text-blue-200 ml-2">{deviceInfo.gpu_info}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-Time Monitoring */}
      <Card className="border-cyan-400 bg-slate-950/80">
        <CardHeader>
          <CardTitle className="text-cyan-400 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Real-Time Monitoring
            {isMonitoring && (
              <Badge variant="outline" className="border-green-400 text-green-400">
                Live
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="text-cyan-300">
            Current system performance and resource usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* CPU Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-300">CPU Usage</span>
              </div>
              <span className="text-sm font-bold text-cyan-400">
                {realTimeStats.cpu_usage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={realTimeStats.cpu_usage} 
              className="h-2 bg-slate-800 [&>div]:bg-cyan-400"
            />
          </div>

          {/* Memory Usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MemoryStick className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-medium text-cyan-300">Memory Usage</span>
              </div>
              <span className="text-sm font-bold text-cyan-400">
                {realTimeStats.memory_usage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={realTimeStats.memory_usage} 
              className="h-2 bg-slate-800 [&>div]:bg-cyan-400"
            />
          </div>

          {/* Temperature */}
          {realTimeStats.temperature && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-medium text-cyan-300">System Temperature</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{getTemperatureIcon(realTimeStats.temperature)}</span>
                  <span className={`text-sm font-bold ${getTemperatureColor(realTimeStats.temperature)}`}>
                    {realTimeStats.temperature.toFixed(1)}°C
                  </span>
                </div>
              </div>
              <Progress 
                value={(realTimeStats.temperature / 100) * 100} 
                className={`h-2 bg-slate-800 ${realTimeStats.temperature > 80 ? '[&>div]:bg-red-400' : '[&>div]:bg-cyan-400'}`}
              />
            </div>
          )}

          {/* Performance Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-cyan-400/30">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {realTimeStats.performance_metrics.fps}
              </div>
              <div className="text-xs text-cyan-300">FPS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {realTimeStats.performance_metrics.response_time.toFixed(2)}
              </div>
              <div className="text-xs text-cyan-300">Response (ms)</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-400">
                {realTimeStats.performance_metrics.load_time.toFixed(0)}
              </div>
              <div className="text-xs text-cyan-300">Load (ms)</div>
            </div>
          </div>

          {/* Additional Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-cyan-400/30">
            {realTimeStats.battery_level !== undefined && (
              <div className="flex items-center gap-2">
                <Battery className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-cyan-300">Battery:</span>
                <span className="text-sm font-medium text-cyan-400">
                  {realTimeStats.battery_level.toFixed(0)}%
                </span>
                {realTimeStats.is_charging && (
                  <span className="text-xs text-green-400">⚡</span>
                )}
              </div>
            )}

            {realTimeStats.network_speed !== undefined && (
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-cyan-300">Network:</span>
                <span className="text-sm font-medium text-cyan-400">
                  {realTimeStats.network_speed.toFixed(0)} KB/s
                </span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-cyan-300">Status:</span>
              <span className={`text-sm font-medium ${realTimeStats.is_idle ? 'text-yellow-400' : 'text-green-400'}`}>
                {realTimeStats.is_idle ? 'Idle' : 'Active'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-cyan-300">Updated:</span>
              <span className="text-sm font-medium text-cyan-400">
                {new Date(realTimeStats.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
