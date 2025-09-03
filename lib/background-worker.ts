import { TaskCoordinator } from "./task-coordinator"
import { ResourceManager } from "./resource-manager"
import { createClient } from "./supabase/client"
import { logSecurityEvent } from "./security"

export interface WorkerHealthStatus {
  isHealthy: boolean
  lastHeartbeat: Date
  consecutiveFailures: number
  uptime: number
  tasksProcessed: number
  errors: string[]
}

export class BackgroundWorker {
  private taskCoordinator: TaskCoordinator
  private resourceManager: ResourceManager | null = null
  private isRunning = false
  private userId: string
  private deviceId: string
  private supabase = createClient()
  
  // Heartbeat and resilience
  private heartbeatInterval: NodeJS.Timeout | null = null
  private healthCheckInterval: NodeJS.Timeout | null = null
  private restartAttempts = 0
  private maxRestartAttempts = 5
  private lastHeartbeat = new Date()
  private consecutiveFailures = 0
  private startTime = new Date()
  private tasksProcessed = 0
  private errors: string[] = []
  private heartbeatIntervalMs = 30000 // 30 seconds
  private healthCheckIntervalMs = 60000 // 1 minute

  constructor(userId: string) {
    this.userId = userId
    this.deviceId = this.generateDeviceId()
    this.taskCoordinator = new TaskCoordinator()
  }

  public async start(): Promise<void> {
    if (this.isRunning) return

    console.log("[v0] Starting background worker")

    try {
      // Initialize resource manager with default limits
      const defaultLimits = {
        max_cpu_percent: 25,
        max_memory_mb: 512,
        only_when_charging: true,
        only_when_idle: false,
        temperature_threshold: 75,
        max_battery_drain_percent: 10,
      }

      this.resourceManager = new ResourceManager(defaultLimits)

      // Start resource contribution
      const contributionStarted = await this.resourceManager.startContribution(this.userId, this.deviceId)

      if (contributionStarted) {
        // Start task coordination
        await this.taskCoordinator.startCoordination(this.userId, this.deviceId)
        this.isRunning = true
        this.startTime = new Date()
        this.restartAttempts = 0
        this.consecutiveFailures = 0

        // Start heartbeat and health monitoring
        this.startHeartbeat()
        this.startHealthMonitoring()

        console.log("[v0] Background worker started successfully")
        
        // Log successful start
        await logSecurityEvent(
          this.userId,
          'worker_started',
          'low',
          'Background worker started successfully',
          {
            deviceId: this.deviceId,
            restartAttempts: this.restartAttempts
          }
        )
      } else {
        throw new Error("Resource contribution not available")
      }
    } catch (error) {
      console.error("[v0] Failed to start background worker:", error)
      this.consecutiveFailures++
      this.errors.push(`Start failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Log failure
      await logSecurityEvent(
        this.userId,
        'worker_start_failed',
        'medium',
        `Background worker failed to start: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          deviceId: this.deviceId,
          consecutiveFailures: this.consecutiveFailures,
          restartAttempts: this.restartAttempts
        }
      )
      
      throw error
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return

    console.log("[v0] Stopping background worker")

    try {
      // Stop monitoring
      this.stopHeartbeat()
      this.stopHealthMonitoring()

      // Stop task coordination
      await this.taskCoordinator.stopCoordination()

      // Stop resource contribution
      if (this.resourceManager) {
        await this.resourceManager.stopContribution()
      }

      this.isRunning = false
      console.log("[v0] Background worker stopped")
      
      // Log successful stop
      await logSecurityEvent(
        this.userId,
        'worker_stopped',
        'low',
        'Background worker stopped successfully',
        {
          deviceId: this.deviceId,
          uptime: Date.now() - this.startTime.getTime()
        }
      )
    } catch (error) {
      console.error("[v0] Error stopping background worker:", error)
      this.errors.push(`Stop failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      
      // Log stop failure
      await logSecurityEvent(
        this.userId,
        'worker_stop_failed',
        'medium',
        `Background worker failed to stop: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          deviceId: this.deviceId
        }
      )
    }
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      taskQueue: this.taskCoordinator.getQueueStatus(),
      resourceContribution: this.resourceManager?.isCurrentlyContributing() || false,
      currentSession: this.resourceManager?.getCurrentSession() || null,
    }
  }

  public getHealthStatus(): WorkerHealthStatus {
    return {
      isHealthy: this.consecutiveFailures < 3,
      lastHeartbeat: this.lastHeartbeat,
      consecutiveFailures: this.consecutiveFailures,
      uptime: Date.now() - this.startTime.getTime(),
      tasksProcessed: this.tasksProcessed,
      errors: [...this.errors]
    }
  }

  public updateResourceLimits(limits: any) {
    this.resourceManager?.updateResourceLimits(limits)
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      try {
        await this.sendHeartbeat()
        this.lastHeartbeat = new Date()
        this.consecutiveFailures = 0
      } catch (error) {
        console.error("[v0] Heartbeat failed:", error)
        this.consecutiveFailures++
        this.errors.push(`Heartbeat failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        
        // If too many consecutive failures, attempt restart
        if (this.consecutiveFailures >= 3) {
          await this.attemptRestart()
        }
      }
    }, this.heartbeatIntervalMs)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck()
      } catch (error) {
        console.error("[v0] Health check failed:", error)
        this.consecutiveFailures++
        this.errors.push(`Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }, this.healthCheckIntervalMs)
  }

  private stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  private async sendHeartbeat(): Promise<void> {
    const { error } = await this.supabase
      .from('worker_heartbeats')
      .upsert({
        user_id: this.userId,
        device_id: this.deviceId,
        last_heartbeat: new Date().toISOString(),
        status: 'active',
        tasks_processed: this.tasksProcessed,
        consecutive_failures: this.consecutiveFailures
      })

    if (error) {
      throw new Error(`Heartbeat database error: ${error.message}`)
    }
  }

  private async performHealthCheck(): Promise<void> {
    // Check if worker is still responsive
    const status = this.getStatus()
    
    if (!status.isRunning) {
      throw new Error("Worker is not running")
    }

    // Check resource manager health
    if (this.resourceManager && !this.resourceManager.isCurrentlyContributing()) {
      throw new Error("Resource manager is not contributing")
    }

    // Check task coordinator health
    const queueStatus = this.taskCoordinator.getQueueStatus()
    if (queueStatus.errorCount > 10) {
      throw new Error(`Too many task errors: ${queueStatus.errorCount}`)
    }

    // Log health check success
    console.log("[v0] Health check passed", {
      uptime: Date.now() - this.startTime.getTime(),
      tasksProcessed: this.tasksProcessed,
      consecutiveFailures: this.consecutiveFailures
    })
  }

  private async attemptRestart(): Promise<void> {
    if (this.restartAttempts >= this.maxRestartAttempts) {
      console.error("[v0] Max restart attempts reached, giving up")
      
      await logSecurityEvent(
        this.userId,
        'worker_max_restart_attempts',
        'high',
        `Background worker reached maximum restart attempts (${this.maxRestartAttempts})`,
        {
          deviceId: this.deviceId,
          restartAttempts: this.restartAttempts,
          consecutiveFailures: this.consecutiveFailures
        }
      )
      
      return
    }

    this.restartAttempts++
    console.log(`[v0] Attempting restart ${this.restartAttempts}/${this.maxRestartAttempts}`)

    try {
      // Stop current worker
      await this.stop()
      
      // Wait a bit before restarting
      await new Promise(resolve => setTimeout(resolve, 5000))
      
      // Restart worker
      await this.start()
      
      console.log(`[v0] Worker restarted successfully (attempt ${this.restartAttempts})`)
      
      await logSecurityEvent(
        this.userId,
        'worker_restarted',
        'medium',
        `Background worker restarted successfully (attempt ${this.restartAttempts})`,
        {
          deviceId: this.deviceId,
          restartAttempts: this.restartAttempts,
          consecutiveFailures: this.consecutiveFailures
        }
      )
    } catch (error) {
      console.error(`[v0] Restart attempt ${this.restartAttempts} failed:`, error)
      
      await logSecurityEvent(
        this.userId,
        'worker_restart_failed',
        'high',
        `Background worker restart attempt ${this.restartAttempts} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        {
          deviceId: this.deviceId,
          restartAttempts: this.restartAttempts,
          consecutiveFailures: this.consecutiveFailures
        }
      )
    }
  }

  private generateDeviceId(): string {
    // Generate a consistent device ID based on browser fingerprint
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.textBaseline = "top"
      ctx.font = "14px Arial"
      ctx.fillText("Device fingerprint", 2, 2)
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join("|")

    // Create a hash of the fingerprint
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }

    return `device_${Math.abs(hash).toString(36)}`
  }
}

// Service Worker registration for true background processing
export function registerBackgroundService() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[v0] Service Worker registered:", registration)
      })
      .catch((error) => {
        console.log("[v0] Service Worker registration failed:", error)
      })
  }
}

// Web Worker for CPU-intensive tasks
export function createComputeWorker(): Worker | null {
  if (typeof Worker !== "undefined") {
    const workerCode = `
      // Web Worker for distributed computing
      self.onmessage = function(e) {
        const { type, data } = e.data;
        
        switch(type) {
          case 'PRIME_SEARCH':
            const primes = searchPrimes(data.start, data.end);
            self.postMessage({ type: 'RESULT', result: primes });
            break;
            
          case 'HASH_COMPUTE':
            computeHashes(data.inputs).then(hashes => {
              self.postMessage({ type: 'RESULT', result: hashes });
            });
            break;
            
          default:
            self.postMessage({ type: 'ERROR', error: 'Unknown task type' });
        }
      };
      
      function searchPrimes(start, end) {
        const primes = [];
        for (let num = start; num <= end; num++) {
          if (isPrime(num)) {
            primes.push(num);
          }
        }
        return primes;
      }
      
      function isPrime(num) {
        if (num < 2) return false;
        if (num === 2) return true;
        if (num % 2 === 0) return false;
        
        for (let i = 3; i <= Math.sqrt(num); i += 2) {
          if (num % i === 0) return false;
        }
        return true;
      }
      
      async function computeHashes(inputs) {
        const hashes = [];
        for (const input of inputs) {
          const encoder = new TextEncoder();
          const data = encoder.encode(input);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          hashes.push(hash);
        }
        return hashes;
      }
    `

    const blob = new Blob([workerCode], { type: "application/javascript" })
    return new Worker(URL.createObjectURL(blob))
  }

  return null
}
