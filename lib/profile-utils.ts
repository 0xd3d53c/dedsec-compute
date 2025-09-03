// Shared utilities for profile picture management
import { createClient } from "@/lib/supabase/client"

export interface ProfilePictureUploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validates profile picture file
 */
export function validateProfilePictureFile(file: File): FileValidationResult {
  // Check file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: "Only JPG and PNG files are allowed"
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

  return { isValid: true }
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
 * Uploads profile picture to Supabase storage
 */
export async function uploadProfilePicture(
  userId: string, 
  file: File
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

    // Generate consistent file name
    const fileName = generateProfilePictureFileName(userId, file)

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("profile-pictures")
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      return {
        success: false,
        error: uploadError.message
      }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("profile-pictures").getPublicUrl(fileName)

    return {
      success: true,
      url: publicUrl
    }
  } catch (error) {
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
      return {
        success: false,
        error: error.message
      }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Database update failed"
    }
  }
}

/**
 * Gets avatar fallback text (first letter of username)
 */
export function getAvatarFallback(username?: string): string {
  if (!username) return "?"
  return username.charAt(0).toUpperCase()
}
