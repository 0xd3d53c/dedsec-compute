// Security utilities for data sanitization and XSS protection
import DOMPurify from 'isomorphic-dompurify'

export interface SanitizationOptions {
  allowTags?: string[]
  allowAttributes?: string[]
  maxLength?: number
  stripHtml?: boolean
}

export interface SanitizationResult {
  sanitized: string
  original: string
  wasModified: boolean
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHtml(
  content: string, 
  options: SanitizationOptions = {}
): SanitizationResult {
  const {
    allowTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    allowAttributes = ['class'],
    maxLength = 10000,
    stripHtml = false
  } = options

  if (!content || typeof content !== 'string') {
    return {
      sanitized: '',
      original: content || '',
      wasModified: false
    }
  }

  let sanitized = content

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  if (stripHtml) {
    // Remove all HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '')
  } else {
    // Sanitize HTML while preserving allowed tags
    sanitized = DOMPurify.sanitize(sanitized, {
      ALLOWED_TAGS: allowTags,
      ALLOWED_ATTR: allowAttributes,
      ALLOW_DATA_ATTR: false,
      ALLOW_UNKNOWN_PROTOCOLS: false,
      SANITIZE_DOM: true,
      KEEP_CONTENT: true
    })
  }

  return {
    sanitized,
    original: content,
    wasModified: sanitized !== content
  }
}

/**
 * Sanitizes plain text content (removes HTML and limits length)
 */
export function sanitizeText(
  content: string,
  maxLength: number = 1000
): SanitizationResult {
  if (!content || typeof content !== 'string') {
    return {
      sanitized: '',
      original: content || '',
      wasModified: false
    }
  }

  let sanitized = content

  // Remove all HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '')
  
  // Decode HTML entities
  sanitized = sanitized
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=')

  // Remove potentially dangerous characters
  sanitized = sanitized
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/onload/gi, '')
    .replace(/onerror/gi, '')
    .replace(/onclick/gi, '')
    .replace(/onmouseover/gi, '')

  // Truncate if too long
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength)
  }

  // Trim whitespace
  sanitized = sanitized.trim()

  return {
    sanitized,
    original: content,
    wasModified: sanitized !== content
  }
}

/**
 * Sanitizes mission title (plain text, shorter length)
 */
export function sanitizeMissionTitle(title: string): SanitizationResult {
  return sanitizeText(title, 200)
}

/**
 * Sanitizes mission description (allows basic HTML formatting)
 */
export function sanitizeMissionDescription(description: string): SanitizationResult {
  return sanitizeHtml(description, {
    allowTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li'],
    allowAttributes: [],
    maxLength: 5000
  })
}

/**
 * Sanitizes username (plain text, alphanumeric + underscore/dash)
 */
export function sanitizeUsername(username: string): SanitizationResult {
  if (!username || typeof username !== 'string') {
    return {
      sanitized: '',
      original: username || '',
      wasModified: false
    }
  }

  let sanitized = username
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '') // Only allow alphanumeric, underscore, dash
    .substring(0, 50) // Max 50 characters

  return {
    sanitized,
    original: username,
    wasModified: sanitized !== username.toLowerCase().trim()
  }
}

/**
 * Sanitizes email address
 */
export function sanitizeEmail(email: string): SanitizationResult {
  if (!email || typeof email !== 'string') {
    return {
      sanitized: '',
      original: email || '',
      wasModified: false
    }
  }

  let sanitized = email
    .toLowerCase()
    .trim()
    .substring(0, 254) // Max email length

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(sanitized)) {
    return {
      sanitized: '',
      original: email,
      wasModified: true
    }
  }

  return {
    sanitized,
    original: email,
    wasModified: sanitized !== email.toLowerCase().trim()
  }
}

/**
 * Validates and sanitizes file upload metadata
 */
export function sanitizeFileMetadata(filename: string): SanitizationResult {
  if (!filename || typeof filename !== 'string') {
    return {
      sanitized: '',
      original: filename || '',
      wasModified: false
    }
  }

  let sanitized = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
    .substring(0, 255) // Max filename length
    .trim()

  // Remove multiple consecutive underscores
  sanitized = sanitized.replace(/_+/g, '_')

  return {
    sanitized,
    original: filename,
    wasModified: sanitized !== filename
  }
}

/**
 * Logs sanitization events for security monitoring
 */
export function logSanitizationEvent(
  type: string,
  original: string,
  sanitized: string,
  wasModified: boolean,
  context?: string
) {
  if (wasModified) {
    console.warn(`[Security] Content sanitized:`, {
      type,
      context,
      originalLength: original.length,
      sanitizedLength: sanitized.length,
      wasModified
    })
  }
}

/**
 * React hook for sanitizing content in components
 */
export function useSanitization() {
  return {
    sanitizeHtml,
    sanitizeText,
    sanitizeMissionTitle,
    sanitizeMissionDescription,
    sanitizeUsername,
    sanitizeEmail,
    sanitizeFileMetadata,
    logSanitizationEvent
  }
}
