import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export interface AdminUser {
  id: string
  username: string
  email: string
  is_admin: boolean
  admin_level: 'super_admin' | 'admin' | 'moderator'
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
        .select('*')
        .eq('id', user.id)
        .eq('is_admin', true)
        .single()

      if (adminError || !adminData) {
        throw new Error('Admin privileges required')
      }

      // Get admin permissions
      const { data: permissions, error: permError } = await supabase
        .from('admin_permissions')
        .select('permission_name')
        .eq('user_id', user.id)

      if (permError) {
        console.warn('Failed to fetch admin permissions:', permError)
      }

      // Create admin session
      const adminUser: AdminUser = {
        id: adminData.id,
        username: adminData.username,
        email: adminData.email || user.email || '',
        is_admin: adminData.is_admin,
        admin_level: adminData.admin_level || 'admin',
        permissions: permissions?.map(p => p.permission_name) || [],
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

      // Log admin access
      await logAdminAccess(adminUser.id, 'admin_login', {
        session_id: session.session_id,
        ip_address: adminUser.ip_address,
        user_agent: navigator.userAgent
      })

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

  const logAdminAccess = async (adminId: string, action: string, details: any) => {
    try {
      await supabase.from('admin_logs').insert({
        admin_id: adminId,
        action,
        target_type: 'system',
        target_id: adminId,
        details,
        ip_address: details.ip_address,
        user_agent: details.user_agent,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to log admin access:', error)
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!adminSession) return false
    return adminSession.permissions.includes(permission) || 
           adminSession.user.admin_level === 'super_admin'
  }

  const logout = async () => {
    if (adminSession) {
      await logAdminAccess(adminSession.user.id, 'admin_logout', {
        session_id: adminSession.session_id
      })
    }
    
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
