"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { User, Shield, Key, Smartphone, Save, Upload, Copy, CheckCircle, AlertTriangle } from "lucide-react"
import { authManager } from "@/lib/auth-utils"

interface UserProfile {
  id: string
  username: string
  display_name: string
  phone?: string
  country_code?: string
  profile_picture_url?: string
  two_factor_enabled: boolean
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Profile form state
  const [displayName, setDisplayName] = useState("")
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [profilePictureUrl, setProfilePictureUrl] = useState("")

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [totpSecret, setTotpSecret] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth/login")
        return
      }

      setUser(user)
      await loadProfile(user.id)
    } catch (error) {
      console.error("[v0] Auth check failed:", error)
      router.push("/auth/login")
    }
  }

  const loadProfile = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase.from("users").select("*").eq("id", userId).single()

      if (error) throw error

      setProfile(profileData)
      setDisplayName(profileData.display_name || "")
      setProfilePictureUrl(profileData.profile_picture_url || "")
      setIs2FAEnabled(profileData.two_factor_enabled || false)
      setBackupCodes(profileData.backup_codes || [])
      setIsLoading(false)
    } catch (error) {
      console.error("[v0] Failed to load profile:", error)
      setMessage({ type: "error", text: "Failed to load profile data" })
      setIsLoading(false)
    }
  }

  const validateImageFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return "Only JPG and PNG files are allowed"
    }

    // Check file size (4MB = 4 * 1024 * 1024 bytes)
    const maxSize = 4 * 1024 * 1024
    if (file.size > maxSize) {
      return "File size must be less than 4MB"
    }

    return null
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validationError = validateImageFile(file)
    if (validationError) {
      setMessage({ type: "error", text: validationError })
      return
    }

    setProfilePicture(file)
    setMessage({ type: "success", text: "Image selected successfully" })
  }

  const updateProfile = async () => {
    if (!profile) return

    setIsSaving(true)
    try {
      let uploadedImageUrl = profilePictureUrl

      // Upload profile picture if selected
      if (profilePicture) {
        const fileExt = profilePicture.name.split(".").pop()
        const fileName = `${profile.id}/${Date.now()}.${fileExt}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("profile-pictures")
          .upload(fileName, profilePicture, {
            cacheControl: '3600',
            upsert: true
          })

        if (uploadError) throw uploadError

        const {
          data: { publicUrl },
        } = supabase.storage.from("profile-pictures").getPublicUrl(fileName)

        uploadedImageUrl = publicUrl
      }

      const { error } = await supabase
        .from("users")
        .update({
          display_name: displayName,
          profile_picture_url: uploadedImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) throw error

      setMessage({ type: "success", text: "Profile updated successfully!" })
      setProfilePicture(null) // Clear the selected file
      await loadProfile(profile.id)
    } catch (error) {
      console.error("[v0] Failed to update profile:", error)
      setMessage({ type: "error", text: "Failed to update profile" })
    }
    setIsSaving(false)
  }

  const setup2FA = async () => {
    if (!profile) return

    try {
      const result = await authManager.enable2FA(profile.id)

      if (result.success && result.secret && result.qrCode) {
        setTotpSecret(result.secret)
        setQrCodeUrl(result.qrCode)
        setMessage({ type: "success", text: "2FA setup initiated. Scan the QR code with your authenticator app." })
      } else {
        setMessage({ type: "error", text: result.error || "Failed to setup 2FA" })
      }
    } catch (error) {
      console.error("[v0] Failed to setup 2FA:", error)
      setMessage({ type: "error", text: "Failed to setup 2FA" })
    }
  }

  const verify2FA = async () => {
    if (!profile || !verificationCode) return

    try {
      const result = await authManager.verify2FA(profile.id, verificationCode)

      if (result.success) {
        setIs2FAEnabled(true)
        setMessage({ type: "success", text: "2FA enabled successfully! Save your backup codes." })
        
        // Reload profile to get backup codes
        await loadProfile(profile.id)
        setShowBackupCodes(true)
      } else {
        setMessage({ type: "error", text: result.error || "Invalid verification code" })
      }
    } catch (error) {
      console.error("[v0] Failed to verify 2FA:", error)
      setMessage({ type: "error", text: "Failed to verify 2FA code" })
    }
  }

  const disable2FA = async () => {
    if (!profile) return

    try {
      const result = await authManager.disable2FA(profile.id)

      if (result.success) {
        setIs2FAEnabled(false)
        setQrCodeUrl("")
        setTotpSecret("")
        setBackupCodes([])
        setShowBackupCodes(false)
        setMessage({ type: "success", text: "2FA disabled successfully" })
        await loadProfile(profile.id)
      } else {
        setMessage({ type: "error", text: result.error || "Failed to disable 2FA" })
      }
    } catch (error) {
      console.error("[v0] Failed to disable 2FA:", error)
      setMessage({ type: "error", text: "Failed to disable 2FA" })
    }
  }

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" })
      return
    }

    if (newPassword.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters long" })
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setMessage({ type: "success", text: "Password changed successfully" })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      console.error("[v0] Failed to change password:", error)
      setMessage({ type: "error", text: "Failed to change password" })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setMessage({ type: "success", text: "Copied to clipboard!" })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center">
        <div className="text-center">
          <User className="w-16 h-16 mx-auto mb-4 animate-spin" />
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-400 text-slate-950">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-cyan-400" style={{ textShadow: "0 0 10px currentColor" }}>
                Profile Settings
              </h1>
              <p className="text-cyan-300">Manage your account and security settings</p>
            </div>
          </div>
          <Button onClick={() => router.push("/dashboard")} className="bg-cyan-600 hover:bg-cyan-500">
            Back to Dashboard
          </Button>
        </header>

        {message && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              message.type === "success"
                ? "bg-emerald-900/20 border-emerald-400 text-emerald-400"
                : "bg-red-900/20 border-red-400 text-red-400"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
              {message.text}
            </div>
          </div>
        )}

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-slate-950 border border-cyan-400">
            <TabsTrigger value="profile" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              Security
            </TabsTrigger>
            <TabsTrigger value="2fa" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white">
              Two-Factor Auth
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="border border-cyan-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
                <CardDescription className="text-cyan-300">Update your profile details and picture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={profilePictureUrl || "/placeholder.svg"} />
                    <AvatarFallback className="text-2xl">{profile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="picture" className="text-cyan-400">
                      Profile Picture
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="picture"
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleImageUpload}
                        className="bg-slate-950 border-cyan-400 text-cyan-400"
                      />
                      <Button size="sm" className="bg-cyan-600 hover:bg-cyan-500">
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-cyan-300">
                      Supported formats: JPG, PNG. Maximum size: 4MB
                    </p>
                    {profilePicture && (
                      <p className="text-xs text-emerald-400">
                        Selected: {profilePicture.name} ({(profilePicture.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username" className="text-cyan-400">
                      Username (Cannot be changed)
                    </Label>
                    <Input
                      id="username"
                      value={profile?.username || ""}
                      disabled
                      className="bg-slate-800 border-slate-600 text-slate-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="display_name" className="text-cyan-400">
                      Display Name
                    </Label>
                    <Input
                      id="display_name"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="bg-slate-950 border-cyan-400 text-cyan-400"
                      placeholder="Your display name"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="phone" className="text-cyan-400">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      value={`${profile?.country_code || ""}${profile?.phone || ""}`}
                      disabled
                      className="bg-slate-800 border-slate-600 text-slate-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="created" className="text-cyan-400">
                      Member Since
                    </Label>
                    <Input
                      id="created"
                      value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : ""}
                      disabled
                      className="bg-slate-800 border-slate-600 text-slate-400"
                    />
                  </div>
                </div>

                <Button onClick={updateProfile} disabled={isSaving} className="bg-cyan-600 hover:bg-cyan-500">
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="border border-cyan-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Key className="w-5 h-5" />
                  Password & Security
                </CardTitle>
                <CardDescription className="text-cyan-300">
                  Change your password and manage security settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current_password" className="text-cyan-400">
                      Current Password
                    </Label>
                    <Input
                      id="current_password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="bg-slate-950 border-cyan-400 text-cyan-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new_password" className="text-cyan-400">
                      New Password
                    </Label>
                    <Input
                      id="new_password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="bg-slate-950 border-cyan-400 text-cyan-400"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirm_password" className="text-cyan-400">
                      Confirm New Password
                    </Label>
                    <Input
                      id="confirm_password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="bg-slate-950 border-cyan-400 text-cyan-400"
                    />
                  </div>
                </div>

                <Button
                  onClick={changePassword}
                  className="bg-cyan-600 hover:bg-cyan-500"
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                >
                  <Key className="w-4 h-4 mr-2" />
                  Change Password
                </Button>

                <div className="pt-6 border-t border-slate-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-cyan-400">Two-Factor Authentication</h4>
                      <p className="text-sm text-cyan-300">
                        {is2FAEnabled ? "2FA is currently enabled" : "Add an extra layer of security"}
                      </p>
                    </div>
                    <Badge className={is2FAEnabled ? "bg-emerald-600" : "bg-slate-600"}>
                      {is2FAEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="2fa">
            <Card className="border border-cyan-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-cyan-400 flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Two-Factor Authentication
                </CardTitle>
                <CardDescription className="text-cyan-300">
                  Secure your account with time-based one-time passwords
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {!is2FAEnabled ? (
                  <div className="space-y-4">
                    {!qrCodeUrl ? (
                      <div className="text-center">
                        <p className="text-cyan-300 mb-4">
                          Two-factor authentication adds an extra layer of security to your account.
                        </p>
                        <Button onClick={setup2FA} className="bg-cyan-600 hover:bg-cyan-500">
                          <Shield className="w-4 h-4 mr-2" />
                          Enable 2FA
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center">
                          <h4 className="font-medium text-cyan-400 mb-2">Scan QR Code</h4>
                          <p className="text-sm text-cyan-300 mb-4">
                            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                          </p>
                          <div className="inline-block p-4 bg-white rounded-lg">
                            <img src={qrCodeUrl || "/placeholder.svg"} alt="2FA QR Code" className="w-48 h-48" />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="verification_code" className="text-cyan-400">
                            Enter verification code from your app
                          </Label>
                          <div className="flex gap-2">
                            <Input
                              id="verification_code"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value)}
                              className="bg-slate-950 border-cyan-400 text-cyan-400"
                              placeholder="000000"
                              maxLength={6}
                            />
                            <Button
                              onClick={verify2FA}
                              disabled={verificationCode.length !== 6}
                              className="bg-emerald-600 hover:bg-emerald-500"
                            >
                              Verify
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-emerald-900/20 border border-emerald-400 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="w-6 h-6 text-emerald-400" />
                        <div>
                          <h4 className="font-medium text-emerald-400">2FA Enabled</h4>
                          <p className="text-sm text-emerald-300">Your account is protected with 2FA</p>
                        </div>
                      </div>
                      <Button
                        onClick={disable2FA}
                        variant="outline"
                        className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white bg-transparent"
                      >
                        Disable 2FA
                      </Button>
                    </div>

                    {showBackupCodes && backupCodes.length > 0 && (
                      <div className="p-4 bg-amber-900/20 border border-amber-400 rounded-lg">
                        <h4 className="font-medium text-amber-400 mb-2">Backup Codes</h4>
                        <p className="text-sm text-amber-300 mb-4">
                          Save these backup codes in a safe place. You can use them to access your account if you lose
                          your authenticator device.
                        </p>
                        <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                          {backupCodes.map((code, index) => (
                            <div key={index} className="flex items-center justify-between bg-slate-800 p-2 rounded">
                              <span className="text-cyan-400">{code}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(code)}
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
