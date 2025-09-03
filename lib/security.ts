// Client-side compromise heuristics for web context
// Note: True root/jailbreak detection requires native OS APIs. These checks are best-effort.

import { createClient } from "./supabase/client"

export interface CompromiseReport {
  isSuspected: boolean
  reasons: string[]
  severity: 'low' | 'medium' | 'high' | 'critical'
  metadata: Record<string, any>
}

export interface CompromiseLogEntry {
  id: string
  user_id: string
  event_type: string
  severity: string
  description: string
  metadata: Record<string, any>
  ip_address?: string
  user_agent?: string
  session_id?: string
  resolved: boolean
  created_at: string
}

export function detectCompromise(): CompromiseReport {
  const reasons: string[] = []
  const metadata: Record<string, any> = {}

  // Insecure context
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    reasons.push('Insecure context (no HTTPS)')
    metadata.insecureContext = true
  }

  // Headless / automation
  if (typeof navigator !== 'undefined' && (navigator as any).webdriver) {
    reasons.push('Automation detected (webdriver)')
    metadata.webdriver = true
  }

  // DevTools opened heuristic
  try {
    const threshold = 160
    const widthThreshold = window.outerWidth - window.innerWidth > threshold
    const heightThreshold = window.outerHeight - window.innerHeight > threshold
    if (widthThreshold || heightThreshold) {
      reasons.push('DevTools likely open')
      metadata.devtoolsOpen = true
      metadata.windowDimensions = {
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      }
    }
  } catch {}

  // Tampered userAgent typical flags
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/HeadlessChrome|PhantomJS|node\.js|jsdom/i.test(ua)) {
    reasons.push('Headless environment detected')
    metadata.headlessEnvironment = true
    metadata.userAgent = ua
  }

  // Additional security checks
  if (typeof window !== 'undefined') {
    // Check for common debugging tools
    const debugTools = ['__REACT_DEVTOOLS_GLOBAL_HOOK__', '__VUE_DEVTOOLS_GLOBAL_HOOK__', '__REDUX_DEVTOOLS_EXTENSION__']
    const foundTools = debugTools.filter(tool => (window as any)[tool])
    if (foundTools.length > 0) {
      reasons.push('Development tools detected')
      metadata.developmentTools = foundTools
    }

    // Check for suspicious properties
    if ((window as any).chrome && (window as any).chrome.runtime) {
      metadata.chromeExtension = true
    }
  }

  // Determine severity based on reasons
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
  if (reasons.includes('Automation detected (webdriver)') || reasons.includes('Headless environment detected')) {
    severity = 'high'
  } else if (reasons.includes('Insecure context (no HTTPS)')) {
    severity = 'critical'
  } else if (reasons.length > 2) {
    severity = 'medium'
  }

  return {
    isSuspected: reasons.length > 0,
    reasons,
    severity,
    metadata
  }
}

/**
 * Logs a compromise detection event to the database
 */
export async function logCompromiseEvent(
  userId: string,
  report: CompromiseReport,
  additionalMetadata: Record<string, any> = {}
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.rpc('log_compromise_event', {
      p_user_id: userId,
      p_event_type: 'compromise_detected',
      p_severity: report.severity,
      p_description: `Compromise detected: ${report.reasons.join(', ')}`,
      p_metadata: {
        ...report.metadata,
        ...additionalMetadata,
        reasons: report.reasons,
        detectionTime: new Date().toISOString()
      },
      p_ip_address: await getClientIP(),
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      p_session_id: await getSessionId()
    })

    if (error) {
      console.error('Failed to log compromise event:', error)
      return { success: false, error: error.message }
    }

    return { success: true, logId: data }
  } catch (error) {
    console.error('Error logging compromise event:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Logs a general security event
 */
export async function logSecurityEvent(
  userId: string,
  eventType: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  description: string,
  metadata: Record<string, any> = {}
): Promise<{ success: boolean; logId?: string; error?: string }> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.rpc('log_compromise_event', {
      p_user_id: userId,
      p_event_type: eventType,
      p_severity: severity,
      p_description: description,
      p_metadata: {
        ...metadata,
        timestamp: new Date().toISOString()
      },
      p_ip_address: await getClientIP(),
      p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      p_session_id: await getSessionId()
    })

    if (error) {
      console.error('Failed to log security event:', error)
      return { success: false, error: error.message }
    }

    return { success: true, logId: data }
  } catch (error) {
    console.error('Error logging security event:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Gets client IP address (best effort)
 */
async function getClientIP(): Promise<string | null> {
  try {
    // This is a best-effort approach. In production, you'd get this from headers
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip || null
  } catch {
    return null
  }
}

/**
 * Gets current session ID
 */
async function getSessionId(): Promise<string | null> {
  try {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ? session.access_token.substring(0, 20) : null
  } catch {
    return null
  }
}

/**
 * Gets compromise logs for a user (admin only)
 */
export async function getCompromiseLogs(
  userId?: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ success: boolean; logs?: CompromiseLogEntry[]; error?: string }> {
  try {
    const supabase = createClient()
    
    let query = supabase
      .from('compromise_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, logs: data as CompromiseLogEntry[] }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Resolves a compromise log entry
 */
export async function resolveCompromiseLog(
  logId: string,
  resolutionNotes: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase.rpc('resolve_compromise_event', {
      p_log_id: logId,
      p_resolution_notes: resolutionNotes
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * Gets security dashboard statistics
 */
export async function getSecurityDashboardStats(): Promise<{
  success: boolean;
  stats?: {
    total_events: number;
    unresolved_events: number;
    critical_events: number;
    events_last_24h: number;
    events_last_7d: number;
  };
  error?: string;
}> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase.rpc('get_security_dashboard_stats')

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, stats: data[0] }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}


