"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Cpu, MemoryStick, Battery, Thermometer, Activity, Pause, Play } from "lucide-react"
import { ResourceManager, type ResourceLimits, type RealTimeStats } from "@/lib/resource-manager"
import { detectEnhancedHardware, type DeviceInfo } from "@/lib/hardware-detection"

interface ResourceControlsProps {
  userId: string
  deviceId: string
}

export function ResourceControls({ userId, deviceId }: ResourceControlsProps) {
  const [resourceManager, setResourceManager] = useState<ResourceManager | null>(null)
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null)
  const [currentStats, setCurrentStats] = useState<RealTimeStats | null>(null)
  const [isContributing, setIsContributing] = useState(false)
  const [resourceLimits, setResourceLimits] = useState<ResourceLimits>({
    max_cpu_percent: 25,
    max_memory_mb: 512,
    only_when_charging: true,
    only_when_idle: false,
    temperature_threshold: 75,
  })

  useEffect(() => {
    const initializeResourceManager = async () => {
      const info = await detectEnhancedHardware()
      setDeviceInfo(info)

      const manager = new ResourceManager(resourceLimits)
      setResourceManager(manager)

      // Get initial stats
      const stats = await manager.getCurrentStats()
      setCurrentStats(stats)

      // Set up periodic stats updates
      const interval = setInterval(async () => {
        const newStats = await manager.getCurrentStats()
        setCurrentStats(newStats)
        setIsContributing(manager.isCurrentlyContributing())
      }, 5000)

      return () => clearInterval(interval)
    }

    initializeResourceManager()
  }, [])

  const handleStartContribution = async () => {
    if (!resourceManager) return

    const success = await resourceManager.startContribution(userId, deviceId)
    if (success) {
      setIsContributing(true)
    }
  }

  const handleStopContribution = async () => {
    if (!resourceManager) return

    await resourceManager.stopContribution()
    setIsContributing(false)
  }

  const handleLimitChange = (key: keyof ResourceLimits, value: any) => {
    const newLimits = { ...resourceLimits, [key]: value }
    setResourceLimits(newLimits)
    resourceManager?.updateResourceLimits(newLimits)
  }

  const getStatusColor = (value: number, threshold: number) => {
    if (value < threshold * 0.5) return "text-green-400"
    if (value < threshold * 0.8) return "text-yellow-400"
    return "text-red-400"
  }

  const canContribute = currentStats && resourceManager?.hardwareMonitor?.canContribute(currentStats)

  return (
    <div className="space-y-6">
      {/* Device Information */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Cpu className="h-5 w-5" />
            Device Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {deviceInfo && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">CPU Cores:</span>
                <span className="ml-2 text-slate-200">{deviceInfo.cpu_cores}</span>
              </div>
              <div>
                <span className="text-slate-400">Memory:</span>
                <span className="ml-2 text-slate-200">{deviceInfo.total_memory_gb} GB</span>
              </div>
              <div>
                <span className="text-slate-400">Platform:</span>
                <span className="ml-2 text-slate-200">{deviceInfo.platform}</span>
              </div>
              <div>
                <span className="text-slate-400">Device Type:</span>
                <Badge variant="outline" className="ml-2">
                  {deviceInfo.device_type}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-time Stats */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Activity className="h-5 w-5" />
            Real-time Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStats && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    CPU Usage
                  </span>
                  <span
                    className={`font-mono ${getStatusColor(currentStats.cpu_usage, resourceLimits.max_cpu_percent)}`}
                  >
                    {currentStats.cpu_usage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={currentStats.cpu_usage} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-2">
                    <MemoryStick className="h-4 w-4" />
                    Memory Usage
                  </span>
                  <span className={`font-mono ${getStatusColor(currentStats.memory_usage, 80)}`}>
                    {currentStats.memory_usage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={currentStats.memory_usage} className="h-2" />
              </div>

              {currentStats.battery_level && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Battery className="h-4 w-4" />
                      Battery Level
                    </span>
                    <span className={`font-mono ${getStatusColor(100 - currentStats.battery_level, 80)}`}>
                      {currentStats.battery_level}%
                    </span>
                  </div>
                  <Progress value={currentStats.battery_level} className="h-2" />
                </div>
              )}

              {currentStats.temperature && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-2">
                      <Thermometer className="h-4 w-4" />
                      Temperature
                    </span>
                    <span
                      className={`font-mono ${getStatusColor(currentStats.temperature, resourceLimits.temperature_threshold)}`}
                    >
                      {currentStats.temperature.toFixed(1)}°C
                    </span>
                  </div>
                  <Progress value={(currentStats.temperature / 100) * 100} className="h-2" />
                </div>
              )}

              <div className="flex items-center gap-4 text-sm">
                <Badge variant={currentStats.is_charging ? "default" : "secondary"}>
                  {currentStats.is_charging ? "Charging" : "On Battery"}
                </Badge>
                <Badge variant={currentStats.is_idle ? "default" : "secondary"}>
                  {currentStats.is_idle ? "Idle" : "Active"}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resource Limits Configuration */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Resource Contribution Limits</CardTitle>
          <CardDescription className="text-slate-400">
            Configure how much of your device's resources you want to contribute
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Maximum CPU Usage: {resourceLimits.max_cpu_percent}%
              </label>
              <Slider
                value={[resourceLimits.max_cpu_percent]}
                onValueChange={([value]) => handleLimitChange("max_cpu_percent", value)}
                max={75}
                min={5}
                step={5}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Maximum Memory: {resourceLimits.max_memory_mb} MB
              </label>
              <Slider
                value={[resourceLimits.max_memory_mb]}
                onValueChange={([value]) => handleLimitChange("max_memory_mb", value)}
                max={2048}
                min={256}
                step={128}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">
                Temperature Threshold: {resourceLimits.temperature_threshold}°C
              </label>
              <Slider
                value={[resourceLimits.temperature_threshold]}
                onValueChange={([value]) => handleLimitChange("temperature_threshold", value)}
                max={85}
                min={60}
                step={5}
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-200">Only when charging</label>
              <Switch
                checked={resourceLimits.only_when_charging}
                onCheckedChange={(checked) => handleLimitChange("only_when_charging", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-200">Only when idle</label>
              <Switch
                checked={resourceLimits.only_when_idle}
                onCheckedChange={(checked) => handleLimitChange("only_when_idle", checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contribution Control */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Resource Contribution</CardTitle>
          <CardDescription className="text-slate-400">
            {isContributing ? "Currently contributing to the network" : "Start contributing your device's resources"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              onClick={isContributing ? handleStopContribution : handleStartContribution}
              disabled={!canContribute && !isContributing}
              variant={isContributing ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {isContributing ? (
                <>
                  <Pause className="h-4 w-4" />
                  Stop Contributing
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Start Contributing
                </>
              )}
            </Button>

            {!canContribute && !isContributing && (
              <Badge variant="destructive">Cannot contribute - check safety limits</Badge>
            )}

            {isContributing && (
              <Badge variant="default" className="animate-pulse">
                Contributing
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
