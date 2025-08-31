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
import { Checkbox } from "@/components/ui/checkbox"
import { Shield, Mail, Lock, Eye, EyeOff, AlertTriangle, Users } from "lucide-react"

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = []
    
    if (password.length < 12) {
      errors.push("Password must be at least 12 characters long")
    }
    
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push("Password must contain at least one lowercase letter")
    }
    
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push("Password must contain at least one uppercase letter")
    }
    
    if (!/(?=.*\d)/.test(password)) {
      errors.push("Password must contain at least one number")
    }
    
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      errors.push("Password must contain at least one special character")
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!consent) {
      setError("You must provide explicit consent to join the network")
      return
    }

    if (!email.trim() || !password || !confirmPassword || !displayName.trim()) {
      setError("All fields are required")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    const passwordValidation = validatePassword(password)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(", "))
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // Create user with email and password
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            display_name: displayName.trim(),
            username: displayName.trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
            invite_code: inviteCode.trim() || null,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        console.log("User created successfully:", data.user.id)
        
        // Wait a moment for the database trigger to process
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if profile was created successfully
        try {
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("username, display_name")
            .eq("id", data.user.id)
            .single()

          if (profileError) {
            console.warn("Profile not found, redirecting to consent:", profileError)
            // Profile wasn't created by trigger, redirect to consent to create it manually
            router.push("/consent")
          } else if (!profile?.username || !profile?.display_name) {
            console.log("Profile incomplete, redirecting to consent")
            router.push("/consent")
          } else {
            console.log("Profile complete, redirecting to dashboard")
            router.push("/dashboard")
          }
        } catch (profileError: any) {
          console.warn("Profile check failed, redirecting to consent:", profileError)
          // Any error means profile isn't ready, redirect to consent
          router.push("/consent")
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error)
      setError(error.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    if (!consent) {
      setError("You must provide explicit consent to join the network")
      return
    }

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
      setError(error.message)
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
            <Shield className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 dedsec-glow text-blue-400">Join DedSec</h1>
          <p className="text-sm sm:text-base text-cyan-300">Become part of the collective</p>
        </div>

        <Card className="dedsec-border bg-slate-950/80">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-blue-400 text-lg sm:text-xl">
               Create Account
            </CardTitle>
            <CardDescription className="text-cyan-300 text-sm">
              Join the distributed computing network
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            <form onSubmit={handleSignUp} className="space-y-4">
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
                <Label htmlFor="displayName" className="text-blue-400 flex items-center gap-2 text-sm sm:text-base">
                  <Users className="w-4 h-4" />
                  Display Name
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your display name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-slate-950 border-blue-400 text-blue-400 placeholder-blue-600 text-sm sm:text-base h-10 sm:h-11"
                  required
                  autoComplete="name"
                />
              </div>

              <div>
                <Label htmlFor="inviteCode" className="text-blue-400 flex items-center gap-2 text-sm sm:text-base">
                  <Shield className="w-4 h-4" />
                  Invite Code (Optional)
                </Label>
                <Input
                  id="inviteCode"
                  type="text"
                  placeholder="d3d_XXXXXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="bg-slate-950 border-blue-400 text-blue-400 placeholder-blue-600 text-sm sm:text-base h-10 sm:h-11"
                  autoComplete="off"
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
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-slate-950 border-blue-400 text-blue-400 placeholder-blue-600 text-sm sm:text-base h-10 sm:h-11 pr-10"
                    required
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-10 sm:h-11 px-3 text-blue-400 hover:text-cyan-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-blue-400 flex items-center gap-2 text-sm sm:text-base">
                  <Lock className="w-4 h-4" />
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="bg-slate-950 border-blue-400 text-blue-400 placeholder-blue-600 text-sm sm:text-base h-10 sm:h-11 pr-10"
                    required
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-10 sm:h-11 px-3 text-blue-400 hover:text-cyan-300"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Password Requirements */}
              <div className="bg-slate-900/50 border border-blue-400/30 rounded-lg p-4">
                <h4 className="text-blue-400 font-semibold text-sm mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Password Requirements
                </h4>
                <ul className="text-xs text-cyan-300 space-y-1">
                  <li>• Minimum 12 characters</li>
                  <li>• At least one uppercase letter</li>
                  <li>• At least one lowercase letter</li>
                  <li>• At least one number</li>
                  <li>• At least one special character</li>
                </ul>
              </div>

              {/* Consent Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(checked) => setConsent(checked as boolean)}
                  className="border-blue-400 data-[state=checked]:bg-blue-400 data-[state=checked]:text-slate-950"
                />
                <Label htmlFor="consent" className="text-xs sm:text-sm text-cyan-300 leading-relaxed">
                  I explicitly consent to joining the DedSec distributed computing network and understand that my device will contribute computing power to approved tasks.
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full dedsec-button h-10 sm:h-11 text-sm sm:text-base"
                disabled={isLoading || !consent}
              >
                {isLoading ? "Creating Account..." : "Join Collective"}
              </Button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-blue-400/30"></div>
              </div>
              <div className="relative flex justify-center text-xs sm:text-sm">
                <span className="bg-slate-950 px-2 text-blue-600">OR</span>
              </div>
            </div>

            {/* Google Sign Up */}
            <Button
              onClick={handleGoogleSignUp}
              className="w-full dedsec-button flex items-center gap-2 h-10 sm:h-11 text-sm sm:text-base"
              disabled={isLoading || !consent}
            >
              <Mail className="w-4 h-4" />
              Continue with Google
            </Button>

            {error && (
              <div className="text-red-400 text-xs sm:text-sm text-center p-2 sm:p-3 border border-red-400 rounded">
                {error}
              </div>
            )}

            <div className="text-center text-xs sm:text-sm text-blue-600">
              Already part of the collective?{" "}
              <Link href="/auth/login" className="text-blue-400 hover:text-cyan-300 underline">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="bg-slate-900/50 border border-blue-400/20 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold text-sm mb-2 flex items-center gap-2 justify-center">
              <Shield className="w-4 h-4" />
              Security & Privacy
            </h4>
            <ul className="text-xs text-cyan-300 space-y-1">
              <li>• End-to-end encrypted authentication</li>
              <li>• Strong password requirements</li>
              <li>• Secure session management</li>
              <li>• No arbitrary code execution</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
