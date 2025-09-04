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
import { User, Shield, Key, Smartphone, Save, Copy, CheckCircle, AlertTriangle } from "lucide-react"
import { authManager } from "@/lib/auth-utils"
import { 
  validateProfilePictureFile, 
  getAvatarFallback
} from "@/lib/profile-utils"
import { sanitizeUsername } from "@/lib/security-utils"
import { uploadFileWithTUS, generateFileName } from "@/lib/tus-upload"



interface UserProfile {
  id: string
  username: string
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
  const [username, setUsername] = useState("")
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [profilePictureUrl, setProfilePictureUrl] = useState("")

  // 2FA state
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [totpSecret, setTotpSecret] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  // Upload state
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const supabase = createClient()



  useEffect(() => {
    checkAuth()
  }, [])

  // Effect to manage profile picture URL state
  useEffect(() => {
    if (profile?.profile_picture_url && profile.profile_picture_url.trim() !== "") {
      setProfilePictureUrl(profile.profile_picture_url)
    } else {
      setProfilePictureUrl("")
    }
  }, [profile?.profile_picture_url])

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
      setMessage({ type: "error", text: "Authentication failed. Redirecting to login in 2 seconds..." })
      setTimeout(() => router.push("/auth/login"), 2000)
    }
  }

  const loadProfile = async (userId: string) => {
    try {
      const { data: profileData, error } = await supabase.from("users").select("*").eq("id", userId).single()

      if (error) throw error

      setProfile(profileData)
      setUsername(profileData.username || "")
      setIs2FAEnabled(profileData.two_factor_enabled || false)
      setBackupCodes(profileData.backup_codes || [])
      setIsLoading(false)
    } catch (error) {
      console.error("[v0] Failed to load profile:", error)
      setMessage({ type: "error", text: "Failed to load profile data. Please refresh the page and try again." })
      setIsLoading(false)
    }
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validation = validateProfilePictureFile(file)
    if (!validation.isValid) {
      setMessage({ type: "error", text: validation.error || "Invalid file format or size" })
      return
    }

    // Set the file and start upload
    setProfilePicture(file)
    setMessage({ type: "success", text: "Image selected, starting upload..." })
    
    // Start automatic upload
    await uploadProfilePicture(file)
  }

  const uploadProfilePicture = async (file: File) => {
    if (!profile) {
      setMessage({ type: "error", text: "Profile not loaded. Please refresh the page and try again." })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    
    try {
      const fileName = generateFileName(profile.id, file.name)
      
      const result = await uploadFileWithTUS({
        bucketName: 'profile-pictures',
        fileName: fileName,
        file: file,
        onProgress: (percentage: number) => {
          setUploadProgress(percentage)
        },
        onSuccess: (url: string) => {
          setProfilePictureUrl(url)
          setProfile(prev => prev ? {
            ...prev,
            profile_picture_url: url
          } : null)
          
          // Update the database to persist the profile picture URL
          updateProfilePictureInDatabase(url)
          
          setMessage({ type: "success", text: "Profile picture uploaded successfully!" })
        },
        onError: (error: any) => {
          console.error('Upload error:', error)
          setMessage({ type: "error", text: "Upload failed. Please try again." })
        }
      })

      if (!result.success) {
        setMessage({ type: "error", text: result.error || "Upload failed" })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setMessage({ type: "error", text: "Upload failed. Please try again." })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }
  const updateProfilePictureInDatabase = async (imageUrl: string) => {
    if (!profile) return

    try {
      const { error } = await supabase
        .from("users")
        .update({
          profile_picture_url: imageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) {
        console.error("Failed to update profile picture in database:", error)
        setMessage({ type: "error", text: "Profile picture uploaded but failed to save to database. Please refresh and try again." })
      } else {
        console.log("Profile picture URL saved to database successfully")
      }
    } catch (error) {
      console.error("Error updating profile picture in database:", error)
    }
  }
  
  const setup2FA = async () => {
    if (!profile) {
      setMessage({ type: "error", text: "Profile not loaded. Please refresh the page and try again." })
      return
    }

    try {
      const result = await authManager.enable2FA(profile.id)

      if (result.success && result.secret && result.qrCode) {
        setTotpSecret(result.secret)
        setQrCodeUrl(result.qrCode)
        setMessage({ type: "success", text: "2FA setup initiated. Scan the QR code with your authenticator app." })
      } else {
        setMessage({ type: "error", text: result.error || "Failed to setup 2FA. Please check your connection and try again." })
      }
    } catch (error) {
      console.error("[v0] Failed to setup 2FA:", error)
      setMessage({ type: "error", text: "Failed to setup 2FA. Please check your connection and try again." })
    }
  }

  const verify2FA = async () => {
    if (!profile) {
      setMessage({ type: "error", text: "Profile not loaded. Please refresh the page and try again." })
      return
    }

    if (!verificationCode) {
      setMessage({ type: "error", text: "Please enter a verification code" })
      return
    }

    try {
      const result = await authManager.verify2FA(profile.id, verificationCode)

      if (result.success) {
        setIs2FAEnabled(true)
        setMessage({ type: "success", text: "2FA enabled successfully! Save your backup codes." })
        
        // Reload profile to get backup codes
        await loadProfile(profile.id)
        setShowBackupCodes(true)
      } else {
        setMessage({ type: "error", text: result.error || "Invalid verification code. Please check your authenticator app and try again." })
      }
    } catch (error) {
      console.error("[v0] Failed to verify 2FA:", error)
      setMessage({ type: "error", text: "Failed to verify 2FA code. Please check your connection and try again." })
    }
  }

  const disable2FA = async () => {
    if (!profile) {
      setMessage({ type: "error", text: "Profile not loaded. Please refresh the page and try again." })
      return
    }

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
        setMessage({ type: "error", text: result.error || "Failed to disable 2FA. Please check your connection and try again." })
      }
    } catch (error) {
      console.error("[v0] Failed to disable 2FA:", error)
      setMessage({ type: "error", text: "Failed to disable 2FA. Please check your connection and try again." })
    }
  }

  const changePassword = async () => {
    if (!profile) {
      setMessage({ type: "error", text: "Profile not loaded. Please refresh the page and try again." })
      return
    }

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
      setMessage({ type: "error", text: "Failed to change password. Please check your input and try again." })
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage({ type: "success", text: "Copied to clipboard!" })
    } catch (error) {
      console.error("Failed to copy to clipboard:", error)
      setMessage({ type: "error", text: "Failed to copy to clipboard" })
    }
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

  function updateProfile(event: React.MouseEvent<HTMLButtonElement>): void {
    throw new Error("Function not implemented.")
  }

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-cyan-400" style={{ textShadow: "0 0 10px currentColor" }}>
            Profile Settings
          </h1>
          <p className="text-cyan-300">Manage your account and security settings</p>
        </div>

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
                    <AvatarImage 
                      src={profilePictureUrl} 
                      alt="Profile picture"
                      showLoadingState={false} // Disable loading state to prevent infinite spinner
                    />
                    <AvatarFallback className="text-2xl">{getAvatarFallback(profile?.username)}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="picture" className="text-cyan-400">
                      Profile Picture
                    </Label>
                    <Input
                      id="picture"
                      type="file"
                      accept="image/jpeg,image/jpg,image/png"
                      onChange={handleImageUpload}
                      className="bg-slate-950 border-cyan-400 text-cyan-400"
                    />
                    <p className="text-xs text-cyan-300">
                      Supported formats: JPG, PNG. Maximum size: 4MB
                    </p>
                    {profilePicture && (
                      <p className="text-xs text-emerald-400">
                        Selected: {profilePicture.name} ({(profilePicture.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                    
                    {/* Upload Progress */}
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-cyan-400">Uploading...</span>
                          <span className="text-cyan-300">{uploadProgress.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className="bg-cyan-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username" className="text-cyan-400">
                      Username
                    </Label>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="bg-slate-950 border-cyan-400 text-cyan-400"
                      placeholder="Your username"
                    />
                  </div>
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

