import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface AdminUser {
  id: string
  username: string
  email: string
  is_admin: boolean
  admin_level: 'super_admin' | 'admin' | 'moderator' | 'viewer'
  permissions: string[]
  last_login: string
  ip_address: string
  session_id: string
}

export interface AdminSession {
  user: AdminUser
  token: string
  expires_at: string
  permissions: string[]
}

export function useAdminAuth() {
  const [adminSession, setAdminSession] = useState<AdminSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAdminAuth()
  }, [])

  const checkAdminAuth = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get current user session
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        throw new Error('Authentication required')
      }

      // Verify admin privileges
      const { data: adminData, error: adminError } = await supabase
        .from('users')
        .select('id, username, email, is_admin')
        .eq('id', user.id)
        .eq('is_admin', true)
        .single()

      if (adminError || !adminData) {
        throw new Error('Admin privileges required')
      }

      // Create admin session with permissions based on admin level
      const adminUser: AdminUser = {
        id: adminData.id,
        username: adminData.username,
        email: adminData.email || user.email || '',
        is_admin: adminData.is_admin,
        admin_level: 'admin', // Default to admin level
        permissions: getDefaultPermissions('admin'),
        last_login: new Date().toISOString(),
        ip_address: '127.0.0.1', // Will be updated with real IP
        session_id: crypto.randomUUID()
      }

      const session: AdminSession = {
        user: adminUser,
        token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        permissions: adminUser.permissions
      }

      setAdminSession(session)

      // Note: admin_logs requires service_role access, so we'll skip logging for now
      // In production, this should be handled server-side via API routes

    } catch (err: any) {
      setError(err.message)
      console.error('Admin auth error:', err)
      
      // Redirect to login if not authenticated
      if (err.message === 'Authentication required' || err.message === 'Admin privileges required') {
        router.push('/auth/login')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Helper function to get default permissions based on admin level
  const getDefaultPermissions = (adminLevel: string): string[] => {
    switch (adminLevel) {
      case 'super_admin':
        return ['user_management', 'mission_management', 'system_config', 'security', 'analytics', 'audit_logs']
      case 'admin':
        return ['user_management', 'mission_management', 'analytics', 'audit_logs']
      case 'moderator':
        return ['user_management', 'mission_management', 'analytics']
      case 'viewer':
        return ['analytics']
      default:
        return ['analytics']
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!adminSession) return false
    return adminSession.permissions.includes(permission) || 
           adminSession.user.admin_level === 'super_admin'
  }

  const logout = async () => {
    // Note: admin_logs requires service_role access, so we'll skip logging for now
    await supabase.auth.signOut()
    setAdminSession(null)
    router.push('/auth/login')
  }

  const refreshSession = async () => {
    await checkAdminAuth()
  }

  return {
    adminSession,
    isLoading,
    error,
    hasPermission,
    logout,
    refreshSession,
    isAuthenticated: !!adminSession
  }
}
