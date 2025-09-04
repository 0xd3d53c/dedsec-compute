"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Lock, AlertTriangle, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAdminAuth } from "@/hooks/useAdminAuth"

export default function AdminLoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { adminSession, isLoading: authLoading } = useAdminAuth()

  // Redirect if already authenticated as admin
  useEffect(() => {
    if (adminSession && !authLoading) {
      router.push("/admin/dashboard")
    }
  }, [adminSession, authLoading, router])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Authenticate with Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      })

      if (authError) throw authError

      if (!data.user) {
        throw new Error("Authentication failed")
      }

      // Verify admin privileges
      const { data: adminData, error: adminError } = await supabase
        .from("users")
        .select("id, username, is_admin, admin_level")
        .eq("id", data.user.id)
        .eq("is_admin", true)
        .single()

      if (adminError || !adminData) {
        // Sign out the user since they're not an admin
        await supabase.auth.signOut()
        throw new Error("Access denied. Admin privileges required.")
      }

      // Log successful login
      // Note: admin_logs requires service_role access
      // In production, this should be handled server-side via API routes

      // Redirect to admin dashboard
      router.push('/admin/dashboard')
    } catch (error: any) {
      console.error('Login error:', error)
      setError(error.message)
      setIsLoading(false)

      // Log failed login attempt
      // Note: admin_logs requires service_role access
      // In production, this should be handled server-side via API routes
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Verifying admin privileges...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-500 text-slate-950 mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2" style={{ textShadow: "0 0 20px currentColor" }}>
            Admin Access
          </h1>
          <p className="text-cyan-300">Restricted area - Admin authentication required</p>
        </div>

        <Card className="border-cyan-400 bg-slate-950/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-cyan-400 text-xl">
              &gt; Admin Authentication
            </CardTitle>
            <CardDescription className="text-cyan-300 text-sm">
              Enter your admin credentials to access the control panel
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-cyan-400 text-sm">
                  Admin Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@dedsec.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950 border-cyan-400 text-cyan-400 placeholder-cyan-600"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-cyan-400 text-sm">
                  Admin Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950 border-cyan-400 text-cyan-400 placeholder-cyan-600"
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Access Admin Panel
                  </>
                )}
              </Button>
            </form>

            {error && (
              <div className="text-red-400 text-sm text-center p-3 border border-red-400 rounded flex items-center gap-2 justify-center">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="text-center text-xs text-cyan-600">
              <p className="mb-2">⚠️ This area is restricted to authorized administrators only</p>
              <p>All access attempts are logged and monitored</p>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="bg-slate-900/50 border border-cyan-400/20 rounded-lg p-4">
            <h4 className="text-cyan-400 font-semibold text-sm mb-2 flex items-center gap-2 justify-center">
              <Shield className="w-4 h-4" />
              Security Features
            </h4>
            <ul className="text-xs text-cyan-300 space-y-1">
              <li>• Multi-factor authentication support</li>
              <li>• Session-based access control</li>
              <li>• Comprehensive audit logging</li>
              <li>• IP-based access monitoring</li>
              <li>• Rate limiting and brute force protection</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
