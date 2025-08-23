"use client"

import type React from "react"
import { parsePhoneNumber, isValidPhoneNumber } from "libphonenumber-js"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Phone, Mail } from "lucide-react"

export default function LoginPage() {
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const validatePhoneNumber = (phoneNumber: string): { isValid: boolean; formatted?: string; error?: string } => {
    try {
      if (!phoneNumber.trim()) {
        return { isValid: false, error: "Phone number is required" }
      }

      const parsed = parsePhoneNumber(phoneNumber)
      if (!parsed) {
        return { isValid: false, error: "Invalid phone number format" }
      }

      if (!isValidPhoneNumber(phoneNumber)) {
        return { isValid: false, error: "Invalid phone number" }
      }

      return {
        isValid: true,
        formatted: parsed.formatInternational(),
      }
    } catch (error) {
      return { isValid: false, error: "Invalid phone number format" }
    }
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    const phoneValidation = validatePhoneNumber(phone)
    if (!phoneValidation.isValid) {
      setError(phoneValidation.error || "Invalid phone number")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneValidation.formatted!,
        options: {
          shouldCreateUser: true,
        },
      })

      if (error) throw error
      setPhone(phoneValidation.formatted!) // Update with formatted number
      setOtpSent(true)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phone,
        token: otp,
        type: "sms",
      })

      if (error) throw error
      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message)
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
          redirectTo: `${window.location.origin}/dashboard`,
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
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 dedsec-glow text-blue-400">DedSecCompute</h1>
          <p className="text-sm sm:text-base text-cyan-300">Distributed Computing Collective</p>
        </div>

        <Card className="dedsec-border bg-slate-950/80">
          <CardHeader className="pb-4 sm:pb-6">
            <CardTitle className="text-blue-400 text-lg sm:text-xl">
              {otpSent ? "> Verify Access Code" : "> Access Network"}
            </CardTitle>
            <CardDescription className="text-cyan-300 text-sm">
              {otpSent ? "Enter the verification code sent to your phone" : "Authenticate to join the collective"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 sm:space-y-6">
            {!otpSent ? (
              <>
                {/* Phone OTP Form */}
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <Label htmlFor="phone" className="text-blue-400 flex items-center gap-2 text-sm sm:text-base">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-slate-950 border-blue-400 text-blue-400 placeholder-blue-600 text-sm sm:text-base h-10 sm:h-11"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full dedsec-button h-10 sm:h-11 text-sm sm:text-base"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending OTP..." : "Send OTP"}
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

                {/* Google Sign In */}
                <Button
                  onClick={handleGoogleSignIn}
                  className="w-full dedsec-button flex items-center gap-2 h-10 sm:h-11 text-sm sm:text-base"
                  disabled={isLoading}
                >
                  <Mail className="w-4 h-4" />
                  Continue with Google
                </Button>
              </>
            ) : (
              /* OTP Verification Form */
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <Label htmlFor="otp" className="text-blue-400 text-sm sm:text-base">
                    Verification Code
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="bg-slate-950 border-blue-400 text-blue-400 placeholder-blue-600 text-center text-xl sm:text-2xl tracking-widest h-12 sm:h-14"
                    maxLength={6}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full dedsec-button h-10 sm:h-11 text-sm sm:text-base"
                  disabled={isLoading}
                >
                  {isLoading ? "Verifying..." : "Verify & Access"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full bg-transparent border border-blue-400 text-blue-400 hover:bg-blue-400 hover:text-slate-950 h-10 sm:h-11 text-sm sm:text-base"
                >
                  Back to Phone Entry
                </Button>
              </form>
            )}

            {error && (
              <div className="text-red-400 text-xs sm:text-sm text-center p-2 sm:p-3 border border-red-400 rounded">
                {error}
              </div>
            )}

            <div className="text-center text-xs sm:text-sm text-blue-600">
              New to the collective?{" "}
              <Link href="/auth/signup" className="text-blue-400 hover:text-cyan-300 underline">
                Join now
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Admin Access */}
        <div className="text-center mt-4 sm:mt-6">
          <Link
            href="/admin"
            className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm underline opacity-50 hover:opacity-100 transition-opacity"
          >
            Admin Access
          </Link>
        </div>
      </div>
    </div>
  )
}
