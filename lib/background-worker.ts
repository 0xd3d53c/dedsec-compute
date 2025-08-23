import { TaskCoordinator } from "./task-coordinator"
import { ResourceManager } from "./resource-manager"

export class BackgroundWorker {
  private taskCoordinator: TaskCoordinator
  private resourceManager: ResourceManager | null = null
  private isRunning = false
  private userId: string
  private deviceId: string

  constructor(userId: string) {
    this.userId = userId
    this.deviceId = this.generateDeviceId()
    this.taskCoordinator = new TaskCoordinator()
  }

  public async start(): Promise<void> {
    if (this.isRunning) return

    console.log("[v0] Starting background worker")

    // Initialize resource manager with default limits
    const defaultLimits = {
      max_cpu_percent: 25,
      max_memory_mb: 512,
      only_when_charging: true,
      only_when_idle: false,
      temperature_threshold: 75,
    }

    this.resourceManager = new ResourceManager(defaultLimits)

    // Start resource contribution
    const contributionStarted = await this.resourceManager.startContribution(this.userId, this.deviceId)

    if (contributionStarted) {
      // Start task coordination
      await this.taskCoordinator.startCoordination(this.userId, this.deviceId)
      this.isRunning = true

      console.log("[v0] Background worker started successfully")
    } else {
      console.log("[v0] Cannot start background worker - resource contribution not available")
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return

    console.log("[v0] Stopping background worker")

    // Stop task coordination
    await this.taskCoordinator.stopCoordination()

    // Stop resource contribution
    if (this.resourceManager) {
      await this.resourceManager.stopContribution()
    }

    this.isRunning = false
    console.log("[v0] Background worker stopped")
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      taskQueue: this.taskCoordinator.getQueueStatus(),
      resourceContribution: this.resourceManager?.isCurrentlyContributing() || false,
      currentSession: this.resourceManager?.getCurrentSession() || null,
    }
  }

  public updateResourceLimits(limits: any) {
    this.resourceManager?.updateResourceLimits(limits)
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
