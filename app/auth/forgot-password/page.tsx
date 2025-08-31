"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Mail, Lock, Eye, EyeOff, AlertTriangle, CheckCircle, Clock } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState<"request" | "reset">("request")
  const [resetToken, setResetToken] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if we have a reset token in URL (user clicked email link)
  useEffect(() => {
    const token = searchParams.get("token")
    const type = searchParams.get("type")
    
    if (token && type === "recovery") {
      setResetToken(token)
      setStep("reset")
    }
  }, [searchParams])

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

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

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError("Email address is required")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/forgot-password?type=recovery`,
      })

      if (error) throw error

      setEmailSent(true)
      setCountdown(60) // 60 second cooldown
      setSuccess("Password reset email sent! Check your inbox and spam folder.")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newPassword || !confirmPassword) {
      setError("Both password fields are required")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    const passwordValidation = validatePassword(newPassword)
    if (!passwordValidation.isValid) {
      setError(passwordValidation.errors.join(", "))
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      setSuccess("Password successfully reset! Redirecting to login...")
      setTimeout(() => router.push("/auth/login"), 2000)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendEmail = async () => {
    if (countdown > 0) return
    
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/forgot-password?type=recovery`,
      })

      if (error) throw error

      setCountdown(60)
      setSuccess("Reset email resent successfully!")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (step === "reset") {
    return (
      <div className="min-h-screen bg-slate-950 text-blue-400 matrix-bg flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-500 text-white mb-3 sm:mb-4">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2 dedsec-glow text-blue-400">Reset Password</h1>
            <p className="text-sm sm:text-base text-cyan-300">Create a new secure password</p>
          </div>

          <Card className="dedsec-border bg-slate-950/80">
            <CardHeader className="pb-4 sm:pb-6">
              <CardTitle className="text-blue-400 text-lg sm:text-xl">
                &gt; New Password
              </CardTitle>
              <CardDescription className="text-cyan-300 text-sm">
                Enter your new password following security requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 sm:space-y-6">
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <Label htmlFor="newPassword" className="text-blue-400 flex items-center gap-2 text-sm sm:text-base">
                    <Lock className="w-4 h-4" />
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
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
                      placeholder="Confirm new password"
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

                <Button
                  type="submit"
                  className="w-full dedsec-button h-10 sm:h-11 text-sm sm:text-base"
                  disabled={isLoading}
                >
                  {isLoading ? "Resetting Password..." : "Reset Password"}
                </Button>
              </form>

              {error && (
                <div className="text-red-400 text-xs sm:text-sm text-center p-2 sm:p-3 border border-red-400 rounded">
                  {error}
                </div>
              )}

              {success && (
                <div className="text-green-400 text-xs sm:text-sm text-center p-2 sm:p-3 border border-green-400 rounded flex items-center gap-2 justify-center">
                  <CheckCircle className="w-4 h-4" />
                  {success}
                </div>
              )}

              <div className="text-center text-xs sm:text-sm text-blue-600">
                Remember your password?{" "}
                <Link href="/auth/login" className="text-blue-400 hover:text-cyan-300 underline">
                  Back to login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-blue-400 matrix-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-blue-500 text-white mb-3 sm:mb-4">
            <Shield className="w-6 h-6 sm:w-8 sm:h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 dedsec-glow text-blue-400">Forgot Password</h1>
          <p className="text-sm sm:text-base text-cyan-300">Reset your account password</p>
        </div>

        <Card className="dedsec-border bg-slate-950/80">
          <CardHeader className="pb-4 sm:pb-6">
                          <CardTitle className="text-blue-400 text-lg sm:text-xl">
                &gt; Password Recovery
              </CardTitle>
            <CardDescription className="text-cyan-300 text-sm">
              Enter your email to receive a password reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {!emailSent ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
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

                <Button
                  type="submit"
                  className="w-full dedsec-button h-10 sm:h-11 text-sm sm:text-base"
                  disabled={isLoading}
                >
                  {isLoading ? "Sending Reset Link..." : "Send Reset Link"}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-center p-4 border border-green-400/30 rounded-lg bg-green-400/10">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <p className="text-green-400 text-sm font-medium">Reset email sent!</p>
                  <p className="text-cyan-300 text-xs mt-1">
                    Check your inbox and spam folder for the reset link
                  </p>
                </div>

                <div className="text-center">
                  <Button
                    onClick={handleResendEmail}
                    className="dedsec-button text-xs px-4 py-2"
                    disabled={countdown > 0 || isLoading}
                  >
                    {countdown > 0 ? (
                      <span className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        Resend in {countdown}s
                      </span>
                    ) : (
                      "Resend Email"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-xs sm:text-sm text-center p-2 sm:p-3 border border-red-400 rounded">
                {error}
              </div>
            )}

            {success && !emailSent && (
              <div className="text-green-400 text-xs sm:text-sm text-center p-2 sm:p-3 border border-green-400 rounded">
                {success}
              </div>
            )}

            <div className="text-center text-xs sm:text-sm text-blue-600">
              Remember your password?{" "}
              <Link href="/auth/login" className="text-blue-400 hover:text-cyan-300 underline">
                Back to login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <div className="mt-6 text-center">
          <div className="bg-slate-900/50 border border-blue-400/20 rounded-lg p-4">
            <h4 className="text-blue-400 font-semibold text-sm mb-2 flex items-center gap-2 justify-center">
              <Shield className="w-4 h-4" />
              Security Features
            </h4>
            <ul className="text-xs text-cyan-300 space-y-1">
              <li>• Secure token-based reset links</li>
              <li>• Rate-limited email sending</li>
              <li>• Strong password requirements</li>
              <li>• Secure session management</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
