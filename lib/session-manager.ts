// Enhanced session management with JWT validation and auto-refresh
import { createClient } from "@/lib/supabase/client"
import { User, Session } from "@supabase/supabase-js"

export interface SessionState {
  user: User | null
  session: Session | null
  isValid: boolean
  isLoading: boolean
  error: string | null
}

export interface SessionManagerOptions {
  onSessionChange?: (session: Session | null) => void
  onUserChange?: (user: User | null) => void
  onError?: (error: string) => void
  autoRefresh?: boolean
  refreshThreshold?: number // seconds before expiry to refresh
}

export class SessionManager {
  private supabase = createClient()
  private sessionState: SessionState = {
    user: null,
    session: null,
    isValid: false,
    isLoading: true,
    error: null
  }
  private listeners: Set<(state: SessionState) => void> = new Set()
  private options: SessionManagerOptions
  private refreshTimer: NodeJS.Timeout | null = null

  constructor(options: SessionManagerOptions = {}) {
    this.options = {
      autoRefresh: true,
      refreshThreshold: 300, // 5 minutes
      ...options
    }
    this.initialize()
  }

  private async initialize() {
    try {
      // Get initial session
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) {
        this.updateState({ error: error.message, isLoading: false })
        return
      }

      this.updateSession(session)
      this.setupAuthStateListener()
    } catch (error) {
      this.updateState({ 
        error: error instanceof Error ? error.message : 'Session initialization failed',
        isLoading: false 
      })
    }
  }

  private setupAuthStateListener() {
    this.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[SessionManager] Auth state changed:', event, session?.user?.id)
      
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
          this.updateSession(session)
          this.options.onSessionChange?.(session)
          this.options.onUserChange?.(session?.user || null)
          break
          
        case 'SIGNED_OUT':
          this.updateSession(null)
          this.clearRefreshTimer()
          this.options.onSessionChange?.(null)
          this.options.onUserChange?.(null)
          break
          
        case 'PASSWORD_RECOVERY':
        case 'USER_UPDATED':
          this.updateSession(session)
          break
      }
    })
  }

  private updateSession(session: Session | null) {
    const isValid = this.validateSession(session)
    
    this.updateState({
      user: session?.user || null,
      session,
      isValid,
      isLoading: false,
      error: null
    })

    if (isValid && session && this.options.autoRefresh) {
      this.scheduleRefresh(session)
    } else {
      this.clearRefreshTimer()
    }
  }

  private validateSession(session: Session | null): boolean {
    if (!session) return false
    
    try {
      // Check if session exists and has valid access token
      if (!session.access_token) return false
      
      // Check if session is not expired
      const now = Math.floor(Date.now() / 1000)
      if (session.expires_at && session.expires_at <= now) {
        return false
      }
      
      // Additional JWT validation could be added here
      // For now, we rely on Supabase's built-in validation
      return true
    } catch (error) {
      console.error('[SessionManager] Session validation error:', error)
      return false
    }
  }

  private scheduleRefresh(session: Session) {
    this.clearRefreshTimer()
    
    if (!session.expires_at) return
    
    const now = Math.floor(Date.now() / 1000)
    const timeUntilExpiry = session.expires_at - now
    const refreshTime = Math.max(0, timeUntilExpiry - (this.options.refreshThreshold || 300))
    
    if (refreshTime > 0) {
      this.refreshTimer = setTimeout(async () => {
        await this.refreshSession()
      }, refreshTime * 1000)
      
      console.log(`[SessionManager] Scheduled refresh in ${refreshTime} seconds`)
    }
  }

  private async refreshSession() {
    try {
      console.log('[SessionManager] Refreshing session...')
      const { data, error } = await this.supabase.auth.refreshSession()
      
      if (error) {
        console.error('[SessionManager] Session refresh failed:', error)
        this.updateState({ error: error.message })
        this.options.onError?.(error.message)
        return
      }
      
      this.updateSession(data.session)
    } catch (error) {
      console.error('[SessionManager] Session refresh error:', error)
      this.updateState({ 
        error: error instanceof Error ? error.message : 'Session refresh failed' 
      })
    }
  }

  private clearRefreshTimer() {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  private updateState(updates: Partial<SessionState>) {
    this.sessionState = { ...this.sessionState, ...updates }
    this.notifyListeners()
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.sessionState)
      } catch (error) {
        console.error('[SessionManager] Listener error:', error)
      }
    })
  }

  // Public API
  public getState(): SessionState {
    return { ...this.sessionState }
  }

  public subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener)
    
    // Immediately call with current state
    listener(this.sessionState)
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  public async signOut(): Promise<{ error?: string }> {
    try {
      const { error } = await this.supabase.auth.signOut()
      if (error) {
        return { error: error.message }
      }
      return {}
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Sign out failed' 
      }
    }
  }

  public async forceRefresh(): Promise<{ error?: string }> {
    try {
      await this.refreshSession()
      return {}
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Force refresh failed' 
      }
    }
  }

  public destroy() {
    this.clearRefreshTimer()
    this.listeners.clear()
  }
}

// Global session manager instance
let globalSessionManager: SessionManager | null = null

export function getSessionManager(options?: SessionManagerOptions): SessionManager {
  if (!globalSessionManager) {
    globalSessionManager = new SessionManager(options)
  }
  return globalSessionManager
}

export function destroySessionManager() {
  if (globalSessionManager) {
    globalSessionManager.destroy()
    globalSessionManager = null
  }
}

// Add singleton method to SessionManager class
SessionManager.getInstance = function(options?: SessionManagerOptions): SessionManager {
  return getSessionManager(options)
}
