// React hook for session management with JWT validation
import { useEffect, useState, useCallback } from 'react'
import { SessionManager, SessionState } from '@/lib/session-manager'
import { User, Session } from '@supabase/supabase-js'

export interface UseSessionOptions {
  onSessionChange?: (session: Session | null) => void
  onUserChange?: (user: User | null) => void
  onError?: (error: string) => void
  autoRefresh?: boolean
  refreshThreshold?: number
}

export interface UseSessionReturn {
  user: User | null
  session: Session | null
  isValid: boolean
  isLoading: boolean
  error: string | null
  signOut: () => Promise<{ error?: string }>
  forceRefresh: () => Promise<{ error?: string }>
}

export function useSession(options: UseSessionOptions = {}): UseSessionReturn {
  const [sessionState, setSessionState] = useState<SessionState>({
    user: null,
    session: null,
    isValid: false,
    isLoading: true,
    error: null
  })

  const sessionManager = SessionManager.getInstance(options)

  useEffect(() => {
    const unsubscribe = sessionManager.subscribe((state) => {
      setSessionState(state)
    })

    return unsubscribe
  }, [sessionManager])

  const signOut = useCallback(async () => {
    return await sessionManager.signOut()
  }, [sessionManager])

  const forceRefresh = useCallback(async () => {
    return await sessionManager.forceRefresh()
  }, [sessionManager])

  return {
    user: sessionState.user,
    session: sessionState.session,
    isValid: sessionState.isValid,
    isLoading: sessionState.isLoading,
    error: sessionState.error,
    signOut,
    forceRefresh
  }
}

// Hook for components that need to redirect on auth state change
export function useAuthRedirect(
  redirectTo: string = '/auth/login',
  requireAuth: boolean = true
) {
  const { user, isLoading, isValid } = useSession()

  useEffect(() => {
    if (isLoading) return

    if (requireAuth && (!user || !isValid)) {
      window.location.href = redirectTo
    } else if (!requireAuth && user && isValid) {
      window.location.href = redirectTo
    }
  }, [user, isLoading, isValid, redirectTo, requireAuth])

  return { user, isLoading, isValid }
}

// Hook for admin-only components
export function useAdminAuth() {
  const { user, isLoading, isValid } = useSession()

  const isAdmin = user?.user_metadata?.role === 'admin' || 
                  user?.app_metadata?.role === 'admin'

  useEffect(() => {
    if (isLoading) return

    if (!user || !isValid || !isAdmin) {
      window.location.href = '/auth/login'
    }
  }, [user, isLoading, isValid, isAdmin])

  return { user, isLoading, isValid, isAdmin }
}
