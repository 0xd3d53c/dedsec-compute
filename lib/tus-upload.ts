import { createClient } from "./supabase/client"

const projectId = 'vuhsmfwnbgdiwvrbimdc'

export interface TUSUploadOptions {
  bucketName: string
  fileName: string
  file: File
  onProgress?: (percentage: number) => void
  onSuccess?: (url: string) => void
  onError?: (error: any) => void
}

export async function uploadFileWithTUS({
  bucketName,
  fileName,
  file,
  onProgress,
  onSuccess,
  onError
}: TUSUploadOptions): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      throw new Error('No active session found')
    }

    // Dynamic import to avoid SSR issues
    const tus = require('tus-js-client')
    
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(file, {
        // Supabase TUS endpoint (with direct storage hostname)
        endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: {
          authorization: `Bearer ${session.access_token}`,
          'x-upsert': 'true', // optionally set upsert to true to overwrite existing files
        },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true, // Important if you want to allow re-uploading the same file
        metadata: {
          bucketName: bucketName,
          objectName: fileName,
          contentType: file.type,
          cacheControl: 3600,
          metadata: JSON.stringify({ // custom metadata passed to the user_metadata column
            uploadedAt: new Date().toISOString(),
            originalName: file.name,
            size: file.size,
          }),
        },
        chunkSize: 6 * 1024 * 1024, // NOTE: it must be set to 6MB (for now) do not change it
        onError: function (error: any) {
          console.log('Failed because: ' + error)
          onError?.(error)
          reject({ success: false, error: error.message || 'Upload failed' })
        },
        onProgress: function (bytesUploaded: number, bytesTotal: number) {
          const percentage = parseFloat(((bytesUploaded / bytesTotal) * 100).toFixed(2))
          console.log(bytesUploaded, bytesTotal, percentage + '%')
          onProgress?.(percentage)
        },
        onSuccess: function () {
          console.log('Download %s from %s', upload.file.name, upload.url)
          const publicUrl = `https://${projectId}.storage.supabase.co/storage/v1/object/public/${bucketName}/${fileName}`
          onSuccess?.(publicUrl)
          resolve({ success: true, url: publicUrl })
        },
      })

      // Check if there are any previous uploads to continue.
      upload.findPreviousUploads().then(function (previousUploads: any[]) {
        // Found previous uploads so we select the first one.
        if (previousUploads.length) {
          upload.resumeFromPreviousUpload(previousUploads[0])
        }
        // Start the upload
        upload.start()
      }).catch((error: any) => {
        console.error('Error finding previous uploads:', error)
        // Start upload anyway
        upload.start()
      })
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed'
    onError?.(error)
    return { success: false, error: errorMessage }
  }
}

// Helper function to generate unique file names
export function generateFileName(userId: string, originalName: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()
  return `${userId}/${timestamp}_${randomString}.${extension}`
}
