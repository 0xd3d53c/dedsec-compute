// Hardware detection utilities for real device monitoring
export interface DeviceInfo {
  cpu_cores: number
  total_memory_gb: number
  architecture: string
  platform: string
  user_agent: string
  screen_resolution: string
  battery_level?: number
  is_charging?: boolean
  gpu_info?: string
  network_type?: string
  device_type: "mobile" | "tablet" | "desktop"
}

export interface ResourceLimits {
  max_cpu_percent: number
  max_memory_mb: number
  only_when_charging: boolean
  only_when_idle: boolean
  temperature_threshold: number
}

export interface RealTimeStats {
  cpu_usage: number
  memory_usage: number
  battery_level?: number
  temperature?: number
  is_charging?: boolean
  is_idle: boolean
  timestamp: number
}

export class HardwareMonitor {
  private resourceLimits: ResourceLimits
  private monitoringInterval: NodeJS.Timeout | null = null
  private lastActivity: number = Date.now()
  private callbacks: ((stats: RealTimeStats) => void)[] = []

  constructor(limits: ResourceLimits) {
    this.resourceLimits = limits
    this.setupActivityTracking()
  }

  private setupActivityTracking() {
    // Track user activity for idle detection
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"]
    const updateActivity = () => {
      this.lastActivity = Date.now()
    }

    events.forEach((event) => {
      document.addEventListener(event, updateActivity, true)
    })
  }

  public startMonitoring(intervalMs = 5000) {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.monitoringInterval = setInterval(async () => {
      const stats = await this.getRealTimeStats()
      this.callbacks.forEach((callback) => callback(stats))
    }, intervalMs)
  }

  public stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
  }

  public onStatsUpdate(callback: (stats: RealTimeStats) => void) {
    this.callbacks.push(callback)
  }

  public async getRealTimeStats(): Promise<RealTimeStats> {
    const deviceInfo = await detectEnhancedHardware()
    const isIdle = Date.now() - this.lastActivity > 300000 // 5 minutes idle

    // Enhanced CPU usage detection
    const cpuUsage = await this.measureCPUUsage()

    // Enhanced memory usage detection
    const memoryUsage = this.measureMemoryUsage()

    // Temperature estimation (simplified for web)
    const temperature = this.estimateTemperature(cpuUsage)

    return {
      cpu_usage: cpuUsage,
      memory_usage: memoryUsage,
      battery_level: deviceInfo.battery_level,
      temperature,
      is_charging: deviceInfo.is_charging,
      is_idle: isIdle,
      timestamp: Date.now(),
    }
  }

  private async measureCPUUsage(): Promise<number> {
    // Use performance.now() to measure CPU-intensive task execution time
    const iterations = 100000
    const start = performance.now()

    // Perform CPU-intensive calculation
    let result = 0
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i) * Math.sin(i)
    }

    const end = performance.now()
    const executionTime = end - start

    // Normalize to percentage (baseline: 10ms for 100k iterations)
    const baseline = 10
    const usage = Math.min((executionTime / baseline) * 25, 100)

    return Math.round(usage * 100) / 100
  }

  private measureMemoryUsage(): number {
    if ("memory" in performance) {
      const memory = (performance as any).memory
      const used = memory.usedJSHeapSize / 1024 / 1024 // MB
      const total = memory.totalJSHeapSize / 1024 / 1024 // MB
      return Math.round((used / total) * 100 * 100) / 100
    }

    // Fallback estimation
    return Math.random() * 30 + 20 // 20-50% range
  }

  private estimateTemperature(cpuUsage: number): number {
    // Estimate temperature based on CPU usage (simplified model)
    const baseTemp = 35 // Base temperature in Celsius
    const tempIncrease = (cpuUsage / 100) * 30 // Up to 30°C increase
    return Math.round((baseTemp + tempIncrease) * 100) / 100
  }

  public canContribute(stats: RealTimeStats): boolean {
    // Battery level check
    if (stats.battery_level && stats.battery_level < 20) {
      return false
    }

    // Charging requirement check
    if (this.resourceLimits.only_when_charging && !stats.is_charging) {
      return false
    }

    // Idle requirement check
    if (this.resourceLimits.only_when_idle && !stats.is_idle) {
      return false
    }

    // Temperature threshold check
    if (stats.temperature && stats.temperature > this.resourceLimits.temperature_threshold) {
      return false
    }

    // CPU usage limit check
    if (stats.cpu_usage > this.resourceLimits.max_cpu_percent) {
      return false
    }

    return true
  }

  public updateLimits(newLimits: Partial<ResourceLimits>) {
    this.resourceLimits = { ...this.resourceLimits, ...newLimits }
  }

  public getLimits(): ResourceLimits {
    return { ...this.resourceLimits }
  }
}

export async function detectHardware(): Promise<DeviceInfo> {
  const deviceInfo: DeviceInfo = {
    cpu_cores: navigator.hardwareConcurrency || 4,
    total_memory_gb: Math.round(((navigator as any).deviceMemory || 4) * 100) / 100,
    architecture: (navigator as any).platform || "unknown",
    platform: navigator.platform,
    user_agent: navigator.userAgent,
    screen_resolution: `${screen.width}x${screen.height}`,
    device_type: "desktop", // Default device type
  }

  // Try to get battery information
  if ("getBattery" in navigator) {
    try {
      const battery = await (navigator as any).getBattery()
      deviceInfo.battery_level = Math.round(battery.level * 100)
      deviceInfo.is_charging = battery.charging
    } catch (error) {
      console.log("[v0] Battery API not available:", error)
    }
  }

  return deviceInfo
}

export async function detectEnhancedHardware(): Promise<DeviceInfo> {
  const baseInfo = await detectHardware()

  // Detect device type
  const deviceType = getDeviceType()

  // Try to get GPU information
  let gpuInfo: string | undefined
  try {
    const canvas = document.createElement("canvas")
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info")
      if (debugInfo) {
        gpuInfo = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      }
    }
  } catch (error) {
    console.log("[v0] GPU detection failed:", error)
  }

  // Detect network type
  let networkType: string | undefined
  if ("connection" in navigator) {
    const connection = (navigator as any).connection
    networkType = connection.effectiveType || connection.type
  }

  return {
    ...baseInfo,
    gpu_info: gpuInfo,
    network_type: networkType,
    device_type: deviceType,
  }
}

function getDeviceType(): "mobile" | "tablet" | "desktop" {
  const userAgent = navigator.userAgent.toLowerCase()
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
  const isTablet = /ipad|android(?!.*mobile)/i.test(userAgent)

  if (isTablet) return "tablet"
  if (isMobile) return "mobile"
  return "desktop"
}

export function getResourceUsage() {
  // Simulate real resource monitoring
  const cpuUsage = Math.random() * 100
  const memoryUsage = Math.random() * 100

  return {
    cpu_usage: Math.round(cpuUsage * 100) / 100,
    memory_usage: Math.round(memoryUsage * 100) / 100,
    timestamp: Date.now(),
  }
}

export function canContribute(deviceInfo: DeviceInfo): boolean {
  // Safety checks for contribution eligibility
  if (deviceInfo.battery_level && deviceInfo.battery_level < 20) {
    return false // Don't contribute on low battery
  }

  if (deviceInfo.is_charging === false && deviceInfo.battery_level && deviceInfo.battery_level < 50) {
    return false // Don't contribute when not charging and battery is low
  }

  return true
}
