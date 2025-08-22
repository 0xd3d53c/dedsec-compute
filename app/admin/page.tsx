"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Lock } from "lucide-react"

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

    if (username === "admin" && password === "admin") {
      // Store admin session in localStorage for demo purposes
      localStorage.setItem("admin_session", "true")
      router.push("/admin/dashboard")
    } else {
      setError("Invalid admin credentials")
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-black text-red-400 matrix-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-400 text-black mb-4">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-red-400" style={{ textShadow: "0 0 10px currentColor" }}>
            Admin Access
          </h1>
          <p className="text-red-300">Restricted Area - Authorized Personnel Only</p>
        </div>

        <Card className="border border-red-400 bg-black/80" style={{ boxShadow: "0 0 10px rgba(255, 0, 0, 0.3)" }}>
          <CardHeader>
            <CardTitle className="text-red-400 text-xl flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {">"} Administrator Login
            </CardTitle>
            <CardDescription className="text-red-300">
              Enter admin credentials to access system controls
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-red-400">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-black border-red-400 text-red-400 placeholder-red-600"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-red-400">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="admin"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-black border-red-400 text-red-400 placeholder-red-600"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold"
                disabled={isLoading}
              >
                {isLoading ? "Authenticating..." : "Access Admin Panel"}
              </Button>
            </form>

            {error && (
              <div className="mt-4 text-red-400 text-sm text-center p-2 border border-red-400 rounded">{error}</div>
            )}

            <div className="mt-6 text-center text-xs text-red-600">
              <p>Default credentials: admin/admin</p>
              <p>Change credentials from admin dashboard</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
