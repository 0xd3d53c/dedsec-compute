"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Lock } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

export default function AdminLoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (username === "admin" && password === "admin") {
        console.log("[v0] Admin login successful with default credentials")

        // Store admin session
        localStorage.setItem(
          "admin_session",
          JSON.stringify({
            id: "admin",
            username: "admin",
            loginTime: new Date().toISOString(),
          }),
        )

        // Try to log to database if available, but don't fail if it's not
        try {
          const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          )

          await supabase.from("admin_logs").insert({
            admin_id: "admin",
            action: "admin_login",
            details: { username, login_method: "password" },
            ip_address: "127.0.0.1",
          })
        } catch (dbError) {
          console.log("[v0] Database logging failed, but continuing with login")
        }

        router.push("/admin/dashboard")
        return
      }

      // If not default credentials, try database lookup
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const { data: adminUser, error: userError } = await supabase
        .from("users")
        .select("id, username, is_admin")
        .eq("username", username)
        .eq("is_admin", true)
        .single()

      if (userError || !adminUser) {
        setError("Invalid admin credentials")
        setIsLoading(false)
        return
      }

      // For demo purposes, check against default password
      if (password === "admin") {
        await supabase.from("admin_logs").insert({
          admin_id: adminUser.id,
          action: "admin_login",
          details: { username, login_method: "password" },
          ip_address: "127.0.0.1",
        })

        localStorage.setItem(
          "admin_session",
          JSON.stringify({
            id: adminUser.id,
            username: adminUser.username,
            loginTime: new Date().toISOString(),
          }),
        )

        router.push("/admin/dashboard")
      } else {
        setError("Invalid admin credentials")
      }
    } catch (err) {
      console.error("[v0] Admin login error:", err)
      setError("Authentication failed")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-cyan-400 text-slate-950 mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-cyan-400" style={{ textShadow: "0 0 10px currentColor" }}>
            Admin Access
          </h1>
          <p className="text-cyan-300">Restricted Area - Authorized Personnel Only</p>
        </div>

        <Card
          className="border border-cyan-400 bg-slate-950/80"
          style={{ boxShadow: "0 0 10px rgba(34, 211, 238, 0.3)" }}
        >
          <CardHeader>
            <CardTitle className="text-cyan-400 text-xl flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {">"} Administrator Login
            </CardTitle>
            <CardDescription className="text-cyan-300">
              Enter admin credentials to access system controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-cyan-400">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-slate-950 border-cyan-400 text-cyan-400 placeholder-cyan-600"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-cyan-400">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-950 border-cyan-400 text-cyan-400 placeholder-cyan-600"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold"
                disabled={isLoading}
              >
                {isLoading ? "Authenticating..." : "Access Admin Panel"}
              </Button>
            </form>

            {error && (
              <div className="mt-4 text-red-400 text-sm text-center p-2 border border-red-400 rounded">{error}</div>
            )}

            <div className="mt-6 text-center text-xs text-cyan-600">
              <p>Default credentials: admin/admin</p>
              <p>Change credentials from admin dashboard</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
