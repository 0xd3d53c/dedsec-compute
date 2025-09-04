// Shared utilities for profile picture management
import { createClient } from "@/lib/supabase/client"
import { sanitizeText } from "@/lib/security-utils"

/**
 * Creates the profile-pictures storage bucket if it doesn't exist
 * Note: This requires admin privileges in Supabase
 */
export async function ensureProfilePicturesBucket(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    // Check if bucket already exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    if (bucketError) {
      return {
        success: false,
        error: `Failed to list buckets: ${bucketError.message}`
      }
    }

    const profilePicturesBucket = buckets.find(bucket => bucket.id === 'profile-pictures')
    if (profilePicturesBucket) {
      return { success: true } // Bucket already exists
    }

    // Try to create the bucket
    const { data, error } = await supabase.storage.createBucket('profile-pictures', {
      public: true,
      fileSizeLimit: 4194304, // 4MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    })

    if (error) {
      return {
        success: false,
        error: `Failed to create bucket: ${error.message}. Please create it manually in the Supabase dashboard.`
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

export interface ProfilePictureUploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
}

export interface ImageCompressionOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
}

export interface UploadProgressCallback {
  (progress: number): void
}

/**
 * Validates profile picture file with comprehensive checks
 */
export function validateProfilePictureFile(file: File): FileValidationResult {
  // Check if file exists
  if (!file) {
    return {
      isValid: false,
      error: "No file selected"
    }
  }

  // Check file type by MIME type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "Only JPG, PNG, and WebP files are allowed"
    }
  }

  // Check file extension as additional security
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp']
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: "Invalid file extension"
    }
  }

  // Check file size (4MB = 4 * 1024 * 1024 bytes)
  const maxSize = 4 * 1024 * 1024
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: "File size must be less than 4MB"
    }
  }

  // Check minimum file size (prevent empty files)
  const minSize = 1024 // 1KB
  if (file.size < minSize) {
    return {
      isValid: false,
      error: "File appears to be corrupted or empty"
    }
  }

  return { isValid: true }
}

/**
 * Validates file headers to prevent malicious files
 */
export async function validateFileHeaders(file: File): Promise<FileValidationResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer
      const uint8Array = new Uint8Array(arrayBuffer)
      
      // Check file signatures (magic numbers)
      const signatures = {
        jpeg: [0xFF, 0xD8, 0xFF],
        png: [0x89, 0x50, 0x4E, 0x47],
        webp: [0x52, 0x49, 0x46, 0x46] // RIFF header
      }
      
      let isValid = false
      for (const [format, signature] of Object.entries(signatures)) {
        if (signature.every((byte, index) => uint8Array[index] === byte)) {
          isValid = true
          break
        }
      }
      
      if (!isValid) {
        resolve({
          isValid: false,
          error: "Invalid file format detected"
        })
      } else {
        resolve({ isValid: true })
      }
    }
    
    reader.onerror = () => {
      resolve({
        isValid: false,
        error: "Failed to read file"
      })
    }
    
    // Read first 10 bytes to check headers
    reader.readAsArrayBuffer(file.slice(0, 10))
  })
}

/**
 * Generates consistent file name for profile pictures
 * Format: userId/timestamp.ext
 */
export function generateProfilePictureFileName(userId: string, file: File): string {
  const fileExt = file.name.split(".").pop()
  const timestamp = Date.now()
  return `${userId}/${timestamp}.${fileExt}`
}

/**
 * Compresses image file for optimal upload
 */
export async function compressImage(
  file: File, 
  options: ImageCompressionOptions = {}
): Promise<File> {
  const {
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.8,
    format = 'jpeg'
  } = options

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    // Set crossOrigin to anonymous to avoid CORS issues
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }

        // Set canvas dimensions
        canvas.width = width
        canvas.height = height

        // Draw and compress
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height)
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: `image/${format}`,
                  lastModified: Date.now()
                })
                resolve(compressedFile)
              } else {
                reject(new Error('Failed to compress image'))
              }
            },
            `image/${format}`,
            quality
          )
        } else {
          reject(new Error('Failed to get canvas context'))
        }
      } catch (error) {
        reject(new Error(`Image compression failed: ${error}`))
      }
    }

    img.onerror = (error) => {
      console.warn('Image compression failed, using original file')
      reject(new Error('Failed to load image for compression'))
    }

    // Use FileReader instead of createObjectURL to avoid CSP issues
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string
      } else {
        reject(new Error('Failed to read file for compression'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file for compression'))
    reader.readAsDataURL(file)
  })
}

/**
 * Uploads profile picture to Supabase storage with comprehensive validation
 */
export async function uploadProfilePicture(
  userId: string, 
  file: File,
  options: {
    compress?: boolean
    compressionOptions?: ImageCompressionOptions
    onProgress?: UploadProgressCallback
  } = {}
): Promise<ProfilePictureUploadResult> {
  try {
    const supabase = createClient()
    
    // Validate file
    const validation = validateProfilePictureFile(file)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Validate file headers for security
    const headerValidation = await validateFileHeaders(file)
    if (!headerValidation.isValid) {
      return {
        success: false,
        error: headerValidation.error
      }
    }

    let fileToUpload = file

    // Compress image if requested
    if (options.compress) {
      try {
        fileToUpload = await compressImage(file, options.compressionOptions)
        console.log('Image compressed successfully')
        options.onProgress?.(25) // 25% progress after compression
      } catch (error) {
        console.warn('Image compression failed, using original file:', error)
        // Continue with original file if compression fails
        fileToUpload = file
        options.onProgress?.(10) // 10% progress even if compression fails
      }
    } else {
      options.onProgress?.(10) // 10% progress if no compression
    }

    // Generate consistent file name
    const fileName = generateProfilePictureFileName(userId, fileToUpload)
    console.log('Uploading file:', fileName)

    // Check if bucket exists and is accessible
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    if (bucketError) {
      console.error('Error listing buckets:', bucketError)
      return {
        success: false,
        error: `Storage error: ${bucketError.message}`
      }
    }

    const profilePicturesBucket = buckets.find(bucket => bucket.id === 'profile-pictures')
    if (!profilePicturesBucket) {
      console.error('Profile pictures bucket not found. Available buckets:', buckets.map(b => b.id))
      return {
        success: false,
        error: 'Profile pictures storage bucket not found. Please create a storage bucket named "profile-pictures" in your Supabase dashboard under Storage section, or contact support.'
      }
    }

    options.onProgress?.(30) // 30% progress before upload

    // Upload to storage with progress tracking
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return {
        success: false,
        error: `Upload failed: ${uploadError.message}`
      }
    }

    options.onProgress?.(80) // 80% progress after upload

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-pictures").getPublicUrl(fileName)

    if (!publicUrl) {
      return {
        success: false,
        error: 'Failed to generate public URL for uploaded image'
      }
    }

    options.onProgress?.(100) // 100% progress

    return {
      success: true,
      url: publicUrl
    }
  } catch (error) {
    console.error('Upload error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed"
    }
  }
}

/**
 * Updates user profile picture URL in database
 */
export async function updateUserProfilePicture(
  userId: string, 
  profilePictureUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from("users")
      .update({
        profile_picture_url: profilePictureUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) {
      console.error('Database update error:', error)
      return {
        success: false,
        error: error.message
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Database update error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Database update failed"
    }
  }
}

/**
 * Gets avatar fallback text (first letter of username)
 */
export function getAvatarFallback(username?: string | null): string {
  if (!username) return "?"
  
  // Sanitize username to prevent XSS
  const sanitized = sanitizeText(username, 1).sanitized
  
  // Get first character and ensure it's uppercase
  const firstChar = sanitized.charAt(0).toUpperCase()
  
  // Fallback to '?' if no valid character
  return firstChar || "?"
}

/**
 * Deletes old profile picture from storage
 */
export async function deleteProfilePicture(fileName: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.storage
      .from("profile-pictures")
      .remove([fileName])

    if (error) {
      return {
        success: false,
        error: error.message
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed"
    }
  }
}

/**
 * Gets profile picture URL with fallback
 */
export function getProfilePictureUrl(
  profilePictureUrl?: string | null,
  username?: string | null
): { url?: string; fallback: string } {
  return {
    url: profilePictureUrl || undefined,
    fallback: getAvatarFallback(username)
  }
}

/**
 * Rate limiting for uploads (simple in-memory implementation)
 */
class UploadRateLimiter {
  private uploads = new Map<string, number[]>()
  private readonly maxUploads = 5
  private readonly timeWindow = 60 * 1000 // 1 minute

  canUpload(userId: string): boolean {
    const now = Date.now()
    const userUploads = this.uploads.get(userId) || []
    
    // Remove old uploads outside time window
    const recentUploads = userUploads.filter(time => now - time < this.timeWindow)
    
    if (recentUploads.length >= this.maxUploads) {
      return false
    }
    
    // Add current upload
    recentUploads.push(now)
    this.uploads.set(userId, recentUploads)
    
    return true
  }

  getTimeUntilNextUpload(userId: string): number {
    const userUploads = this.uploads.get(userId) || []
    if (userUploads.length < this.maxUploads) return 0
    
    const oldestUpload = Math.min(...userUploads)
    return Math.max(0, this.timeWindow - (Date.now() - oldestUpload))
  }
}

// Global rate limiter instance
export const uploadRateLimiter = new UploadRateLimiter()
