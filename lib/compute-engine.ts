// Real computing operations for distributed tasks
export interface ComputeTask {
  id: string
  operation_id: string
  type: "prime_search" | "hash_computation" | "matrix_operations" | "crypto_analysis" | "factorial_computation" | "fibonacci_sequence" | "pi_calculation" | "sha256_mining"
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
  computation_time: number
  verification_hash: string
  proof_of_work: string
}

export class ComputeEngine {
  private isRunning = false
  private currentTask: ComputeTask | null = null
  private progressCallback?: (progress: number, operations: number) => void

  public async executeTask(task: ComputeTask, onProgress?: (progress: number, operations: number) => void): Promise<TaskResult> {
    this.currentTask = task
    this.isRunning = true
    this.progressCallback = onProgress

    const startTime = Date.now()
    let result: any
    let operations = 0

    try {
      switch (task.type) {
        case "prime_search":
          result = await this.searchPrimes(task.parameters, (ops) => {
            operations = ops
            if (this.progressCallback) {
              this.progressCallback(Math.min(ops / (task.parameters.target_primes * 100), 1), ops)
            }
          })
          break

        case "hash_computation":
          result = await this.computeHashes(task.parameters, (ops) => {
            operations = ops
            if (this.progressCallback) {
              this.progressCallback(Math.min(ops / task.parameters.iterations, 1), ops)
            }
          })
          break

        case "matrix_operations":
          result = await this.performMatrixOperations(task.parameters, (ops) => {
            operations = ops
            if (this.progressCallback) {
              this.progressCallback(Math.min(ops / (task.parameters.matrix_size * 100), 1), ops)
            }
          })
          break

        case "factorial_computation":
          result = await this.computeFactorial(task.parameters.max_number, (ops) => {
            operations = ops
            if (this.progressCallback) {
              this.progressCallback(Math.min(ops / (task.parameters.max_number * 10), 1), ops)
            }
          })
          break

        case "fibonacci_sequence":
          result = await this.computeFibonacci(task.parameters.sequence_length, (ops) => {
            operations = ops
            if (this.progressCallback) {
              this.progressCallback(Math.min(ops / task.parameters.sequence_length, 1), ops)
            }
          })
          break

        case "pi_calculation":
          result = await this.calculatePi(task.parameters.digits, (ops) => {
            operations = ops
            if (this.progressCallback) {
              this.progressCallback(Math.min(ops / (task.parameters.digits * 1000), 1), ops)
            }
          })
          break

        case "sha256_mining":
          result = await this.mineSHA256(task.parameters.target_pattern, (ops) => {
            operations = ops
            if (this.progressCallback) {
              this.progressCallback(Math.min(ops / 1000000, 1), ops)
            }
          })
          break

        default:
          throw new Error(`Unknown task type: ${task.type}`)
      }

      const computationTime = Date.now() - startTime
      const verificationHash = await this.generateVerificationHash(result, task)
      const proofOfWork = await this.generateProofOfWork(result, task)

      return {
        task_id: task.id,
        result_data: result,
        computation_time: computationTime,
        verification_hash: verificationHash,
        proof_of_work: proofOfWork
      }

    } finally {
      this.isRunning = false
      this.currentTask = null
    }
  }

  private async searchPrimes(params: any, onProgress: (operations: number) => void): Promise<any> {
    const { range_size, target_primes } = params
    const primes: number[] = []
    let operations = 0
    const sieve = new Array(range_size + 1).fill(true)
    sieve[0] = sieve[1] = false

    // Sieve of Eratosthenes with progress tracking
    for (let i = 2; i * i <= range_size; i++) {
      if (sieve[i]) {
        for (let j = i * i; j <= range_size; j += i) {
          sieve[j] = false
          operations++
          if (operations % 10000 === 0) {
            onProgress(operations)
            await this.yieldControl()
          }
        }
      }
    }

    // Collect primes
    for (let i = 2; i <= range_size && primes.length < target_primes; i++) {
      if (sieve[i]) {
        primes.push(i)
        operations++
        if (operations % 1000 === 0) {
          onProgress(operations)
          await this.yieldControl()
        }
      }
    }

    return {
      primes: primes.slice(0, target_primes),
      total_primes_found: primes.length,
      range_searched: range_size,
      operations_performed: operations
    }
  }

  private async computeHashes(params: any, onProgress: (operations: number) => void): Promise<any> {
    const { hash_function, pattern_length, iterations } = params
    const results: string[] = []
    let operations = 0

    for (let i = 0; i < iterations; i++) {
      const data = `data_${i}_${Date.now()}_${Math.random()}`
      const hash = await this.computeHash(data, hash_function)
      results.push(hash)
      operations++

      if (operations % 1000 === 0) {
        onProgress(operations)
        await this.yieldControl()
      }
    }

    return {
      hashes: results,
      total_hashes: results.length,
      hash_function: hash_function,
      operations_performed: operations
    }
  }

  private async performMatrixOperations(params: any, onProgress: (operations: number) => void): Promise<any> {
    const { matrix_size, precision, operations: ops } = params
    let totalOperations = 0

    // Generate large matrices
    const matrix1 = this.generateRandomMatrix(matrix_size, matrix_size)
    const matrix2 = this.generateRandomMatrix(matrix_size, matrix_size)
    totalOperations += matrix_size * matrix_size * 2

    const results: any = {}

    if (ops.includes("multiply")) {
      const start = Date.now()
      const product = await this.multiplyMatrices(matrix1, matrix2, (ops) => {
        totalOperations += ops
        onProgress(totalOperations)
      })
      results.multiplication = {
        result: product,
        time_ms: Date.now() - start,
        operations: totalOperations
      }
    }

    if (ops.includes("transpose")) {
      const start = Date.now()
      const transpose = await this.transposeMatrix(matrix1, (ops) => {
        totalOperations += ops
        onProgress(totalOperations)
      })
      results.transpose = {
        result: transpose,
        time_ms: Date.now() - start,
        operations: totalOperations
      }
    }

    if (ops.includes("determinant")) {
      const start = Date.now()
      const det = await this.calculateDeterminant(matrix1, (ops) => {
        totalOperations += ops
        onProgress(totalOperations)
      })
      results.determinant = {
        result: det,
        time_ms: Date.now() - start,
        operations: totalOperations
      }
    }

    return {
      matrix_size: matrix_size,
      operations_performed: totalOperations,
      results: results
    }
  }

  private async computeFactorial(maxNumber: number, onProgress: (operations: number) => void): Promise<any> {
    let operations = 0
    const factorials: bigint[] = []
    
    for (let i = 1; i <= maxNumber; i++) {
      let factorial = BigInt(1)
      for (let j = 2; j <= i; j++) {
        factorial *= BigInt(j)
        operations++
        if (operations % 10000 === 0) {
          onProgress(operations)
          await this.yieldControl()
        }
      }
      factorials.push(factorial)
    }

    return {
      factorials: factorials.map(f => f.toString()),
      max_number: maxNumber,
      operations_performed: operations
    }
  }

  private async computeFibonacci(length: number, onProgress: (operations: number) => void): Promise<any> {
    let operations = 0
    const sequence: bigint[] = [BigInt(0), BigInt(1)]
    
    for (let i = 2; i < length; i++) {
      sequence.push(sequence[i - 1] + sequence[i - 2])
      operations++
      if (operations % 10000 === 0) {
        onProgress(operations)
        await this.yieldControl()
      }
    }

    return {
      sequence: sequence.map(f => f.toString()),
      length: sequence.length,
      operations_performed: operations
    }
  }

  private async calculatePi(digits: number, onProgress: (operations: number) => void): Promise<any> {
    let operations = 0
    let pi = 0
    let sign = 1
    
    // Leibniz formula for π
    for (let i = 0; i < digits * 1000; i++) {
      pi += sign / (2 * i + 1)
      sign = -sign
      operations++
      
      if (operations % 10000 === 0) {
        onProgress(operations)
        await this.yieldControl()
      }
    }
    
    pi *= 4

    return {
      pi_approximation: pi,
      digits_requested: digits,
      operations_performed: operations
    }
  }

  private async mineSHA256(targetPattern: string, onProgress: (operations: number) => void): Promise<any> {
    let operations = 0
    let nonce = 0
    let hash = ""
    
    while (!hash.startsWith(targetPattern) && operations < 1000000) {
      const data = `block_${Date.now()}_${nonce}_${Math.random()}`
      hash = await this.computeHash(data, "sha256")
      nonce++
      operations++
      
      if (operations % 10000 === 0) {
        onProgress(operations)
        await this.yieldControl()
      }
    }

    return {
      hash_found: hash,
      nonce_used: nonce,
      target_pattern: targetPattern,
      operations_performed: operations
    }
  }

  private async multiplyMatrices(matrix1: number[][], matrix2: number[][], onProgress: (operations: number) => void): Promise<number[][]> {
    const rows = matrix1.length
    const cols = matrix2[0].length
    const result: number[][] = Array(rows).fill(null).map(() => Array(cols).fill(0))
    let operations = 0

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        for (let k = 0; k < matrix1[0].length; k++) {
          result[i][j] += matrix1[i][k] * matrix2[k][j]
          operations++
        }
        if (operations % 10000 === 0) {
          onProgress(operations)
          await this.yieldControl()
        }
      }
    }

    return result
  }

  private async transposeMatrix(matrix: number[][], onProgress: (operations: number) => void): Promise<number[][]> {
    const rows = matrix.length
    const cols = matrix[0].length
    const result: number[][] = Array(cols).fill(null).map(() => Array(rows).fill(0))
    let operations = 0

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[j][i] = matrix[i][j]
        operations++
        if (operations % 10000 === 0) {
          onProgress(operations)
          await this.yieldControl()
        }
      }
    }

    return result
  }

  private async calculateDeterminant(matrix: number[][], onProgress: (operations: number) => void): Promise<number> {
    const n = matrix.length
    let operations = 0

    if (n === 1) return matrix[0][0]
    if (n === 2) return matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]

    let det = 0
    for (let i = 0; i < n; i++) {
      const minor = this.getMinor(matrix, 0, i)
      det += matrix[0][i] * Math.pow(-1, i) * await this.calculateDeterminant(minor, (ops) => {
        operations += ops
        onProgress(operations)
      })
      operations++
      if (operations % 1000 === 0) {
        onProgress(operations)
        await this.yieldControl()
      }
    }

    return det
  }

  private getMinor(matrix: number[][], row: number, col: number): number[][] {
    return matrix.filter((_, i) => i !== row).map(row => row.filter((_, j) => j !== col))
  }

  private generateRandomMatrix(rows: number, cols: number): number[][] {
    const result: number[][] = Array(rows).fill(null).map(() => Array(cols).fill(0))

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[i][j] = Math.random() * 100 - 50 // Random number between -50 and 50
      }
    }

    return result
  }

  private async computeHash(data: string, algorithm: string): Promise<string> {
    if (algorithm === "sha256") {
      const encoder = new TextEncoder()
      const dataBuffer = encoder.encode(data)
      const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
    }
    
    // Fallback to simple hash for other algorithms
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  private async generateVerificationHash(result: any, task: ComputeTask): Promise<string> {
    const data = JSON.stringify(result) + task.hash + task.signature
    return await this.computeHash(data, "sha256")
  }

  private async generateProofOfWork(result: any, task: ComputeTask): Promise<string> {
    const data = JSON.stringify(result) + task.hash
    let nonce = 0
    let hash = ""
    
    while (!hash.startsWith("000") && nonce < 10000) {
      hash = await this.computeHash(data + nonce, "sha256")
      nonce++
    }
    
    return hash
  }

  private async yieldControl(): Promise<void> {
    // Allow other tasks to run
    await new Promise(resolve => setTimeout(resolve, 1))
  }

  public stop(): void {
    this.isRunning = false
  }

  public isCurrentlyRunning(): boolean {
    return this.isRunning
  }

  public getCurrentTask(): ComputeTask | null {
    return this.currentTask
  }
}
