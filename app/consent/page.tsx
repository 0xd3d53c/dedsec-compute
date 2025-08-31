"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { detectHardware } from "@/lib/hardware-detection"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, AlertTriangle, CheckCircle } from "lucide-react"

export default function ConsentPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleConsent = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      // Detect hardware capabilities
      const deviceInfo = await detectHardware()

      // Create follower record
      const { error: followerError } = await supabase.from("followers").insert({
        user_id: user.id,
        device_info: deviceInfo,
        max_cpu_percent: 25,
        max_memory_mb: 512,
        only_when_charging: true,
        only_when_idle: true,
        is_contributing: false,
      })

      if (followerError) throw followerError

      // Update network metrics
      await supabase.rpc("update_network_metrics")

      router.push("/dashboard")
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-black text-green-400 matrix-bg flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-400 text-black mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2 dedsec-glow">DedSec Network</h1>
          <p className="text-green-300">Distributed Computing Collective</p>
        </div>

        <Card className="dedsec-border bg-black/80">
          <CardHeader>
            <CardTitle className="text-green-400 text-2xl flex items-center gap-2">
              <AlertTriangle className="w-6 h-6" />
              Explicit Consent Required
            </CardTitle>
            <CardDescription className="text-green-300">
              Important: You are about to join a distributed computing network. Please read and confirm your
              understanding.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="dedsec-border rounded-lg p-6 bg-black/50">
              <h3 className="text-green-400 font-bold mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />I consent to:
              </h3>
              <ul className="space-y-3 text-green-300">
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>Donating up to 25% of my CPU for approved computing tasks</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>Using up to 512MB GPU memory for network operations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>Contributing only when my device is charging and idle</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>Running cryptographically signed and verified tasks only</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-400 mt-1">•</span>
                  <span>Sharing anonymous device capabilities with the network</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
              <h4 className="text-yellow-400 font-bold mb-2">Safety Guarantees:</h4>
              <ul className="text-yellow-300 text-sm space-y-1">
                <li>• Automatic pause on low battery or overheating</li>
                <li>• No arbitrary code execution - only pre-approved tasks</li>
                <li>• Full transparency with real-time monitoring</li>
                <li>• Immediate stop/leave options always available</li>
              </ul>
            </div>

            {error && <div className="text-red-400 text-sm text-center p-2 border border-red-400 rounded">{error}</div>}

            <div className="flex gap-4">
              <Button
                onClick={handleCancel}
                className="flex-1 bg-transparent border border-red-400 text-red-400 hover:bg-red-400 hover:text-black"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleConsent} className="flex-1 dedsec-button" disabled={isLoading}>
                {isLoading ? "Joining Network..." : "I Consent & Join"}
              </Button>
            </div>

            <p className="text-xs text-green-600 text-center">
              By clicking "I Consent & Join", you acknowledge that you have read and understood the terms of
              participation in this distributed computing network.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
