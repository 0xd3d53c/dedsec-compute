// Real computing operations for distributed tasks
export interface ComputeTask {
  id: string
  type: "prime_search" | "hash_computation" | "data_processing"
  parameters: any
  hash: string
}

export class ComputeEngine {
  private isRunning = false
  private currentTask: ComputeTask | null = null
  private onProgress?: (progress: number) => void

  constructor(onProgress?: (progress: number) => void) {
    this.onProgress = onProgress
  }

  async executeTask(task: ComputeTask): Promise<any> {
    // Verify task hash for security
    if (!this.verifyTaskHash(task)) {
      throw new Error("Invalid task hash - task not authorized")
    }

    this.isRunning = true
    this.currentTask = task

    try {
      switch (task.type) {
        case "prime_search":
          return await this.searchPrimes(task.parameters)
        case "hash_computation":
          return await this.computeHashes(task.parameters)
        case "data_processing":
          return await this.processData(task.parameters)
        default:
          throw new Error("Unknown task type")
      }
    } finally {
      this.isRunning = false
      this.currentTask = null
    }
  }

  private verifyTaskHash(task: ComputeTask): boolean {
    // In production, this would verify cryptographic signatures
    const allowedHashes = [
      "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
      "z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1",
      "f1e2d3c4b5a6z7y8x9w0v1u2t3s4r5q6p7o8n9m0l1k2j3i4h5g6",
    ]
    return allowedHashes.includes(task.hash)
  }

  private async searchPrimes(params: { start: number; end: number }): Promise<number[]> {
    const primes: number[] = []
    const { start, end } = params

    for (let num = start; num <= end && this.isRunning; num++) {
      if (this.isPrime(num)) {
        primes.push(num)
      }

      // Report progress
      if (this.onProgress && num % 1000 === 0) {
        const progress = ((num - start) / (end - start)) * 100
        this.onProgress(progress)
      }

      // Yield control periodically
      if (num % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1))
      }
    }

    return primes
  }

  private async computeHashes(params: { data: string[]; algorithm: string }): Promise<string[]> {
    const hashes: string[] = []
    const { data } = params

    for (let i = 0; i < data.length && this.isRunning; i++) {
      const hash = await this.computeHash(data[i])
      hashes.push(hash)

      if (this.onProgress) {
        const progress = (i / data.length) * 100
        this.onProgress(progress)
      }

      // Yield control
      if (i % 10 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1))
      }
    }

    return hashes
  }

  private async processData(params: { dataset: number[]; operation: string }): Promise<any> {
    const { dataset, operation } = params
    let result: any

    switch (operation) {
      case "sum":
        result = dataset.reduce((acc, val) => acc + val, 0)
        break
      case "average":
        result = dataset.reduce((acc, val) => acc + val, 0) / dataset.length
        break
      case "sort":
        result = [...dataset].sort((a, b) => a - b)
        break
      default:
        throw new Error("Unknown operation")
    }

    if (this.onProgress) {
      this.onProgress(100)
    }

    return result
  }

  private isPrime(num: number): boolean {
    if (num < 2) return false
    if (num === 2) return true
    if (num % 2 === 0) return false

    for (let i = 3; i <= Math.sqrt(num); i += 2) {
      if (num % i === 0) return false
    }

    return true
  }

  private async computeHash(data: string): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }

  stop(): void {
    this.isRunning = false
  }

  getStatus(): { isRunning: boolean; currentTask: ComputeTask | null } {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
    }
  }
}
