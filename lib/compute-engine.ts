// Real computing operations for distributed tasks
export interface ComputeTask {
  id: string
  operation_id: string
  type: "prime_search" | "hash_computation" | "matrix_operations" | "crypto_analysis"
  parameters: any
  hash: string
  signature: string
  priority: number
  estimated_duration: number
  created_at: string
}

export interface TaskResult {
  task_id: string
  result_data: any
  compute_time_ms: number
  operations_completed: number
  verification_hash: string
  device_signature: string
}

export interface ComputeProgress {
  task_id: string
  progress_percent: number
  operations_completed: number
  estimated_remaining_ms: number
  current_operation: string
}

export class ComputeEngine {
  private isRunning = false
  private currentTask: ComputeTask | null = null
  private onProgress?: (progress: ComputeProgress) => void
  private onComplete?: (result: TaskResult) => void
  private onError?: (error: Error) => void
  private abortController: AbortController | null = null
  private allowedSignatures: Set<string> = new Set()

  constructor(
    onProgress?: (progress: ComputeProgress) => void,
    onComplete?: (result: TaskResult) => void,
    onError?: (error: Error) => void,
  ) {
    this.onProgress = onProgress
    this.onComplete = onComplete
    this.onError = onError
    this.initializeAllowedSignatures()
  }

  private async initializeAllowedSignatures() {
    try {
      // In production, fetch from secure database or API
      const response = await fetch("/api/compute/signatures")
      if (response.ok) {
        const signatures = await response.json()
        this.allowedSignatures = new Set(signatures)
      }
    } catch (error) {
      console.error("Failed to load allowed signatures:", error)
      // Fallback to empty set for security
      this.allowedSignatures = new Set()
    }
  }

  async executeTask(task: ComputeTask): Promise<TaskResult> {
    if (!this.verifyTaskSignature(task)) {
      throw new Error("Invalid task signature - task not authorized")
    }

    this.isRunning = true
    this.currentTask = task
    this.abortController = new AbortController()

    const startTime = performance.now()
    let operationsCompleted = 0

    try {
      let resultData: any

      switch (task.type) {
        case "prime_search":
          resultData = await this.searchPrimes(task.parameters, (ops) => {
            operationsCompleted = ops
            this.reportProgress(task.id, ops, startTime)
          })
          break
        case "hash_computation":
          resultData = await this.computeHashes(task.parameters, (ops) => {
            operationsCompleted = ops
            this.reportProgress(task.id, ops, startTime)
          })
          break
        case "matrix_operations":
          resultData = await this.performMatrixOperations(task.parameters, (ops) => {
            operationsCompleted = ops
            this.reportProgress(task.id, ops, startTime)
          })
          break
        case "crypto_analysis":
          resultData = await this.performCryptoAnalysis(task.parameters, (ops) => {
            operationsCompleted = ops
            this.reportProgress(task.id, ops, startTime)
          })
          break
        default:
          throw new Error(`Unknown task type: ${task.type}`)
      }

      const endTime = performance.now()
      const computeTime = Math.round(endTime - startTime)

      const result: TaskResult = {
        task_id: task.id,
        result_data: resultData,
        compute_time_ms: computeTime,
        operations_completed: operationsCompleted,
        verification_hash: await this.generateVerificationHash(resultData),
        device_signature: await this.generateDeviceSignature(task.id, resultData),
      }

      this.onComplete?.(result)
      return result
    } catch (error) {
      const computeError = error instanceof Error ? error : new Error("Unknown compute error")
      this.onError?.(computeError)
      throw computeError
    } finally {
      this.isRunning = false
      this.currentTask = null
      this.abortController = null
    }
  }

  private reportProgress(taskId: string, operationsCompleted: number, startTime: number) {
    if (!this.onProgress || !this.currentTask) return

    const elapsed = performance.now() - startTime
    const estimatedTotal = this.currentTask.estimated_duration
    const progressPercent = Math.min((elapsed / estimatedTotal) * 100, 99)

    const progress: ComputeProgress = {
      task_id: taskId,
      progress_percent: progressPercent,
      operations_completed: operationsCompleted,
      estimated_remaining_ms: Math.max(estimatedTotal - elapsed, 0),
      current_operation: this.getCurrentOperationDescription(),
    }

    this.onProgress(progress)
  }

  private getCurrentOperationDescription(): string {
    if (!this.currentTask) return "Unknown"

    switch (this.currentTask.type) {
      case "prime_search":
        return "Searching for prime numbers"
      case "hash_computation":
        return "Computing cryptographic hashes"
      case "matrix_operations":
        return "Performing matrix calculations"
      case "crypto_analysis":
        return "Analyzing cryptographic patterns"
      default:
        return "Processing data"
    }
  }

  private verifyTaskSignature(task: ComputeTask): boolean {
    return this.allowedSignatures.has(task.signature) && this.verifyTaskHash(task)
  }

  private async verifyTaskHash(task: ComputeTask): Promise<boolean> {
    try {
      const expectedHash = await this.generateTaskHash(task.operation_id, task.parameters)
      return task.hash === expectedHash
    } catch (error) {
      console.error("Hash verification failed:", error)
      return false
    }
  }

  private async generateTaskHash(operationId: string, parameters: any): Promise<string> {
    const data = `${operationId}_${JSON.stringify(parameters)}_${Date.now()}`
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)
    const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return `hash_${hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")}`
  }

  private async searchPrimes(
    params: { start: number; end: number; algorithm?: string },
    onProgress: (operations: number) => void,
  ): Promise<{ primes: number[]; algorithm_used: string; range: { start: number; end: number } }> {
    const { start, end, algorithm = "sieve" } = params
    let primes: number[] = []
    let operations = 0

    if (algorithm === "sieve" && end - start <= 1000000) {
      // Use Sieve of Eratosthenes for better performance on smaller ranges
      primes = await this.sieveOfEratosthenes(start, end, (ops) => {
        operations = ops
        onProgress(ops)
      })
    } else {
      // Use trial division for larger ranges or when specified
      primes = await this.trialDivisionPrimes(start, end, (ops) => {
        operations = ops
        onProgress(ops)
      })
    }

    return {
      primes,
      algorithm_used: algorithm === "sieve" ? "Sieve of Eratosthenes" : "Trial Division",
      range: { start, end },
    }
  }

  private async sieveOfEratosthenes(
    start: number,
    end: number,
    onProgress: (operations: number) => void,
  ): Promise<number[]> {
    const range = end - start + 1
    const sieve = new Array(range).fill(true)
    const primes: number[] = []
    let operations = 0

    // Handle edge cases
    if (start <= 1) {
      sieve[0] = false // 0 is not prime
      if (range > 1) sieve[1] = false // 1 is not prime
    }

    const sqrtEnd = Math.sqrt(end)

    for (let p = 2; p <= sqrtEnd && this.isRunning; p++) {
      if (this.abortController?.signal.aborted) break

      // Find the first multiple of p in the range [start, end]
      const firstMultiple = Math.max(p * p, Math.ceil(start / p) * p)

      // Mark multiples of p as not prime
      for (let multiple = firstMultiple; multiple <= end; multiple += p) {
        const index = multiple - start
        if (index >= 0 && index < range) {
          sieve[index] = false
        }
        operations++

        if (operations % 10000 === 0) {
          onProgress(operations)
          await new Promise((resolve) => setTimeout(resolve, 1))
        }
      }
    }

    // Collect primes
    for (let i = 0; i < range; i++) {
      if (sieve[i] && start + i >= 2) {
        primes.push(start + i)
      }
    }

    return primes
  }

  private async trialDivisionPrimes(
    start: number,
    end: number,
    onProgress: (operations: number) => void,
  ): Promise<number[]> {
    const primes: number[] = []
    let operations = 0

    for (let num = Math.max(start, 2); num <= end && this.isRunning; num++) {
      if (this.abortController?.signal.aborted) break

      if (this.isPrime(num)) {
        primes.push(num)
      }
      operations++

      if (operations % 1000 === 0) {
        onProgress(operations)
        await new Promise((resolve) => setTimeout(resolve, 1))
      }
    }

    return primes
  }

  private async computeHashes(
    params: { data: string[]; algorithm: string; iterations?: number },
    onProgress: (operations: number) => void,
  ): Promise<{ hashes: string[]; algorithm: string; total_iterations: number }> {
    const { data, algorithm, iterations = 1 } = params
    const hashes: string[] = []
    let operations = 0

    for (let i = 0; i < data.length && this.isRunning; i++) {
      if (this.abortController?.signal.aborted) break

      let currentHash = data[i]

      // Perform multiple iterations for increased computational load
      for (let iter = 0; iter < iterations; iter++) {
        currentHash = await this.computeHash(currentHash, algorithm)
        operations++

        if (operations % 100 === 0) {
          onProgress(operations)
          await new Promise((resolve) => setTimeout(resolve, 1))
        }
      }

      hashes.push(currentHash)
    }

    return {
      hashes,
      algorithm,
      total_iterations: operations,
    }
  }

  private async performMatrixOperations(
    params: { matrix_a: number[][]; matrix_b?: number[][]; operation: string; size?: number },
    onProgress: (operations: number) => void,
  ): Promise<{ result: number[][] | number; operation: string; dimensions: string }> {
    const { matrix_a, matrix_b, operation, size = 100 } = params
    let operations = 0
    let result: number[][] | number

    switch (operation) {
      case "multiply":
        if (!matrix_b) throw new Error("Matrix B required for multiplication")
        result = await this.multiplyMatrices(matrix_a, matrix_b, (ops) => {
          operations = ops
          onProgress(ops)
        })
        break

      case "transpose":
        result = await this.transposeMatrix(matrix_a, (ops) => {
          operations = ops
          onProgress(ops)
        })
        break

      case "determinant":
        result = await this.calculateDeterminant(matrix_a, (ops) => {
          operations = ops
          onProgress(ops)
        })
        break

      case "generate_random":
        result = await this.generateRandomMatrix(size, size, (ops) => {
          operations = ops
          onProgress(ops)
        })
        break

      default:
        throw new Error(`Unknown matrix operation: ${operation}`)
    }

    return {
      result,
      operation,
      dimensions: Array.isArray(result) ? `${result.length}x${result[0]?.length || 0}` : "scalar",
    }
  }

  private async performCryptoAnalysis(
    params: { pattern_length: number; hash_function: string; iterations: number },
    onProgress: (operations: number) => void,
  ): Promise<{ patterns: string[]; collisions: number; analysis_time: number }> {
    const { pattern_length, hash_function, iterations } = params
    const patterns: string[] = []
    const hashMap = new Map<string, number>()
    let operations = 0
    let collisions = 0

    const startTime = performance.now()

    for (let i = 0; i < iterations && this.isRunning; i++) {
      if (this.abortController?.signal.aborted) break

      // Generate random data
      const randomData = this.generateRandomString(pattern_length)
      const hash = await this.computeHash(randomData, hash_function)

      // Look for patterns (first N characters)
      const pattern = hash.substring(0, pattern_length)
      patterns.push(pattern)

      // Check for collisions
      if (hashMap.has(hash)) {
        collisions++
      } else {
        hashMap.set(hash, i)
      }

      operations++

      if (operations % 1000 === 0) {
        onProgress(operations)
        await new Promise((resolve) => setTimeout(resolve, 1))
      }
    }

    const endTime = performance.now()

    return {
      patterns: [...new Set(patterns)], // Unique patterns only
      collisions,
      analysis_time: endTime - startTime,
    }
  }

  // Helper methods for matrix operations
  private async multiplyMatrices(
    a: number[][],
    b: number[][],
    onProgress: (operations: number) => void,
  ): Promise<number[][]> {
    const rows = a.length
    const cols = b[0].length
    const result: number[][] = Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(0))

    let operations = 0

    for (let i = 0; i < rows && this.isRunning; i++) {
      result[i] = Array(cols).fill(0)
      for (let j = 0; j < cols; j++) {
        for (let k = 0; k < b.length; k++) {
          result[i][j] += a[i][k] * b[k][j]
          operations++

          if (operations % 10000 === 0) {
            onProgress(operations)
            await new Promise((resolve) => setTimeout(resolve, 1))
          }
        }
      }
    }

    return result
  }

  private async transposeMatrix(matrix: number[][], onProgress: (operations: number) => void): Promise<number[][]> {
    const rows = matrix.length
    const cols = matrix[0].length
    const result: number[][] = Array(cols)
      .fill(null)
      .map(() => Array(rows).fill(0))

    let operations = 0

    for (let i = 0; i < rows && this.isRunning; i++) {
      for (let j = 0; j < cols; j++) {
        result[j][i] = matrix[i][j]
        operations++

        if (operations % 1000 === 0) {
          onProgress(operations)
          await new Promise((resolve) => setTimeout(resolve, 1))
        }
      }
    }

    return result
  }

  private async calculateDeterminant(matrix: number[][], onProgress: (operations: number) => void): Promise<number> {
    const n = matrix.length
    if (n !== matrix[0].length) throw new Error("Matrix must be square for determinant calculation")

    let operations = 0
    let det = 1
    const temp = matrix.map((row) => [...row]) // Copy matrix

    // Gaussian elimination
    for (let i = 0; i < n && this.isRunning; i++) {
      // Find pivot
      let maxRow = i
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(temp[k][i]) > Math.abs(temp[maxRow][i])) {
          maxRow = k
        }
        operations++
      }

      // Swap rows if needed
      if (maxRow !== i) {
        ;[temp[i], temp[maxRow]] = [temp[maxRow], temp[i]]
        det *= -1
      }

      // Make all rows below this one 0 in current column
      for (let k = i + 1; k < n; k++) {
        const factor = temp[k][i] / temp[i][i]
        for (let j = i; j < n; j++) {
          temp[k][j] -= factor * temp[i][j]
          operations++

          if (operations % 1000 === 0) {
            onProgress(operations)
            await new Promise((resolve) => setTimeout(resolve, 1))
          }
        }
      }

      det *= temp[i][i]
    }

    return det
  }

  private async generateRandomMatrix(
    rows: number,
    cols: number,
    onProgress: (operations: number) => void,
  ): Promise<number[][]> {
    const result: number[][] = Array(rows)
      .fill(null)
      .map(() => Array(cols).fill(0))

    let operations = 0

    for (let i = 0; i < rows && this.isRunning; i++) {
      for (let j = 0; j < cols; j++) {
        result[i][j] = Math.random() * 100 - 50 // Random number between -50 and 50
        operations++

        if (operations % 10000 === 0) {
          onProgress(operations)
          await new Promise((resolve) => setTimeout(resolve, 1))
        }
      }
    }

    return result
  }

  private generateRandomString(length: number): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = ""
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  private async generateVerificationHash(data: any): Promise<string> {
    const jsonString = JSON.stringify(data)
    return await this.computeHash(jsonString, "SHA-256")
  }

  private async generateDeviceSignature(taskId: string, resultData: any): Promise<string> {
    const deviceInfo = navigator.userAgent + navigator.platform
    const signatureData = taskId + JSON.stringify(resultData) + deviceInfo
    return await this.computeHash(signatureData, "SHA-256")
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

  private async computeHash(data: string, algorithm = "SHA-256"): Promise<string> {
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(data)

    let hashBuffer: ArrayBuffer

    switch (algorithm.toUpperCase()) {
      case "SHA-1":
        hashBuffer = await crypto.subtle.digest("SHA-1", dataBuffer)
        break
      case "SHA-256":
        hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer)
        break
      case "SHA-384":
        hashBuffer = await crypto.subtle.digest("SHA-384", dataBuffer)
        break
      case "SHA-512":
        hashBuffer = await crypto.subtle.digest("SHA-512", dataBuffer)
        break
      default:
        hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer)
    }

    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  }

  stop(): void {
    this.isRunning = false
    this.abortController?.abort()
  }

  getStatus(): { isRunning: boolean; currentTask: ComputeTask | null } {
    return {
      isRunning: this.isRunning,
      currentTask: this.currentTask,
    }
  }
}
