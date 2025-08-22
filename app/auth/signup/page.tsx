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
import { Shield, Phone, Mail, Users } from "lucide-react"

export default function SignUpPage() {
  const [phone, setPhone] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!consent) {
      setError("You must provide explicit consent to join the network")
      return
    }

    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phone,
        options: {
          shouldCreateUser: true,
          data: {
            display_name: displayName,
            phone: phone,
            invite_code: inviteCode,
          },
        },
      })

      if (error) throw error
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
      router.push("/consent")
    } catch (error: any) {
      setError(error.message)
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
          redirectTo: `${window.location.origin}/consent`,
          queryParams: {
            display_name: displayName,
            invite_code: inviteCode,
          },
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
    <div className="min-h-screen bg-black text-green-400 matrix-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-400 text-black mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2 dedsec-glow">Join DedSecCompute</h1>
          <p className="text-green-300">Become part of the collective</p>
        </div>

        <Card className="dedsec-border bg-black/80">
          <CardHeader>
            <CardTitle className="text-green-400 text-xl">
              {otpSent ? "> Verify Access Code" : "> Register New Follower"}
            </CardTitle>
            <CardDescription className="text-green-300">
              {otpSent
                ? "Enter the verification code sent to your phone"
                : "Create your account to join the distributed computing network"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!otpSent ? (
              <>
                {/* Registration Form */}
                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <Label htmlFor="displayName" className="text-green-400 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Display Name
                    </Label>
                    <Input
                      id="displayName"
                      type="text"
                      placeholder="Anonymous Hacker"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-black border-green-400 text-green-400 placeholder-green-600"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone" className="text-green-400 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="bg-black border-green-400 text-green-400 placeholder-green-600"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="inviteCode" className="text-green-400">
                      Invite Code (Optional)
                    </Label>
                    <Input
                      id="inviteCode"
                      type="text"
                      placeholder="d3d_XXXXXXXX"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="bg-black border-green-400 text-green-400 placeholder-green-600"
                    />
                  </div>

                  {/* Consent Checkbox */}
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="consent"
                      checked={consent}
                      onCheckedChange={(checked) => setConsent(checked as boolean)}
                      className="border-green-400 data-[state=checked]:bg-green-400 data-[state=checked]:text-black"
                    />
                    <Label htmlFor="consent" className="text-sm text-green-300 leading-relaxed">
                      I explicitly consent to joining this distributed computing network and understand that:
                      <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                        <li>My device will contribute computing power to approved operations</li>
                        <li>Resource usage will be limited to my specified caps</li>
                        <li>Only cryptographically signed tasks will be executed</li>
                        <li>I can pause or leave the network at any time</li>
                        <li>My device information will be shared anonymously</li>
                      </ul>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full dedsec-button" disabled={isLoading || !consent}>
                    {isLoading ? "Sending OTP..." : "Send Verification Code"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-green-400/30"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="bg-black px-2 text-green-600">OR</span>
                  </div>
                </div>

                {/* Google Sign Up */}
                <Button
                  onClick={handleGoogleSignUp}
                  className="w-full dedsec-button flex items-center gap-2"
                  disabled={isLoading || !consent}
                >
                  <Mail className="w-4 h-4" />
                  Continue with Google
                </Button>
              </>
            ) : (
              /* OTP Verification Form */
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <Label htmlFor="otp" className="text-green-400">
                    Verification Code
                  </Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="bg-black border-green-400 text-green-400 placeholder-green-600 text-center text-2xl tracking-widest"
                    maxLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full dedsec-button" disabled={isLoading}>
                  {isLoading ? "Verifying..." : "Join Collective"}
                </Button>
                <Button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="w-full bg-transparent border border-green-400 text-green-400 hover:bg-green-400 hover:text-black"
                >
                  Back to Registration
                </Button>
              </form>
            )}

            {error && <div className="text-red-400 text-sm text-center p-2 border border-red-400 rounded">{error}</div>}

            <div className="text-center text-sm text-green-600">
              Already part of the collective?{" "}
              <Link href="/auth/login" className="text-green-400 hover:text-green-300 underline">
                Access network
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
