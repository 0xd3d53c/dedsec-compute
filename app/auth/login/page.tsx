"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Mail, Lock, Eye, EyeOff, AlertTriangle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      })

      if (error) throw error

      if (data.user) {
        try {
          // Check if user needs to complete profile setup
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("username, display_name")
            .eq("id", data.user.id)
            .single()

          if (profileError) {
            console.warn("Profile fetch error:", profileError)
            // If profile doesn't exist, redirect to consent page to create it
            router.push("/consent")
            return
          }

          if (!profile?.username || !profile?.display_name) {
            router.push("/consent")
          } else {
            router.push("/dashboard")
          }
        } catch (profileError: any) {
          console.warn("Profile check failed:", profileError)
          // If there's any error fetching profile, redirect to consent page
          router.push("/consent")
        }
      }
    } catch (error: any) {
      console.error("Login error:", error)
      setError(error.message || "Authentication failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      console.error("Google sign-in error:", error)
      setError(error.message || "Google sign-in failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-blue-400 matrix-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-500 text-white mb-3 sm:mb-4">
            <Shield className="w-6 h-6 sm:w-8 sm:w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 dedsec-glow text-blue-400">DedSecCompute</h1>
          <p className="text-sm sm:text-base text-cyan-300">Distributed Computing Collective</p>
        </div>

        <Card className="dedsec-border bg-slate-950/80">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-blue-400 text-lg sm:text-xl">
              Access Network
            </CardTitle>
            <CardDescription className="text-cyan-300">
              Sign in to access the distributed computing network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-blue-400 flex items-center gap-2 text-sm sm:text-base">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-950 border-blue-400 text-blue-400 placeholder-blue-600 text-sm sm:text-base h-10 sm:h-11"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-blue-400 flex items-center gap-2 text-sm sm:text-base">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-950 border-blue-400 text-blue-400 placeholder-blue-600 text-sm sm:text-base h-10 sm:h-11 pr-12"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base h-10 sm:h-11"
                disabled={isLoading}
              >
                {isLoading ? "Signing In..." : "Access Network"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-blue-400/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-950 px-2 text-cyan-300">Or continue with</span>
              </div>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="w-full border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-white font-bold text-sm sm:text-base h-10 sm:h-11"
              disabled={isLoading}
            >
              <Shield className="w-4 h-4 mr-2" />
              {isLoading ? "Connecting..." : "Continue with Google"}
            </Button>

            {error && (
              <div className="text-red-400 text-sm text-center p-3 border border-red-400 rounded flex items-center gap-2 justify-center">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="text-center text-sm text-cyan-300">
              <p className="mb-2">Don't have an account?</p>
              <Link
                href="/auth/signup"
                className="text-blue-400 hover:text-blue-300 underline font-medium"
              >
                Join the Collective
              </Link>
            </div>

            <div className="text-center text-sm text-cyan-300">
              <Link
                href="/auth/forgot-password"
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Forgot Password?
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
