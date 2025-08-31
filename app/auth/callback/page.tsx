"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Loader2, CheckCircle, AlertTriangle } from "lucide-react"

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading")
  const [message, setMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = createClient()
        
        // Handle the OAuth callback
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        if (data.session?.user) {
          // Check if user profile exists
          const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("username, display_name")
            .eq("id", data.session.user.id)
            .single()

          if (profileError || !profile?.username || !profile?.display_name) {
            // Profile incomplete, redirect to consent page
            setStatus("success")
            setMessage("Redirecting to complete your profile...")
            setTimeout(() => router.push("/consent"), 1500)
          } else {
            // Profile complete, redirect to dashboard
            setStatus("success")
            setMessage("Authentication successful! Redirecting to dashboard...")
            setTimeout(() => router.push("/dashboard"), 1500)
          }
        } else {
          throw new Error("No session found")
        }
      } catch (error: any) {
        console.error("Auth callback error:", error)
        setStatus("error")
        setMessage(error.message || "Authentication failed")
        
        // Redirect to login after error
        setTimeout(() => router.push("/auth/login"), 3000)
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-slate-950 text-blue-400 matrix-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="dedsec-border bg-slate-950/80">
          <CardHeader className="text-center pb-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-500 text-white mb-3">
              <Shield className="w-6 h-6" />
            </div>
            <CardTitle className="text-blue-400 text-lg">
              Authentication
            </CardTitle>
            <CardDescription className="text-cyan-300 text-sm">
              Processing your authentication...
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            {status === "loading" && (
              <div className="space-y-3">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
                <p className="text-blue-400 text-sm">Verifying authentication...</p>
              </div>
            )}

            {status === "success" && (
              <div className="space-y-3">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto" />
                <p className="text-green-400 text-sm">{message}</p>
              </div>
            )}

            {status === "error" && (
              <div className="space-y-3">
                <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
                <p className="text-red-400 text-sm">{message}</p>
                <p className="text-cyan-300 text-xs">Redirecting to login...</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
