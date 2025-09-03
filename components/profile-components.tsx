"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { User, Camera, Shield, Key, Save } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { 
  validateProfilePictureFile, 
  uploadProfilePicture, 
  updateUserProfilePicture,
  getAvatarFallback 
} from "@/lib/profile-utils"

interface QuickProfileProps {
  user: {
    id: string
    username: string
    display_name: string
    profile_picture_url?: string
    two_factor_enabled: boolean
  }
  onProfileUpdate: () => void
}

export function QuickProfileCard({ user, onProfileUpdate }: QuickProfileProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [displayName, setDisplayName] = useState(user.display_name || "")
  const [profilePicture, setProfilePicture] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const supabase = createClient()

  const handleUpdate = async () => {
    setIsLoading(true)
    try {
      let uploadedImageUrl = user.profile_picture_url

      // Upload profile picture if selected
      if (profilePicture) {
        const uploadResult = await uploadProfilePicture(user.id, profilePicture)
        
        if (uploadResult.success) {
          uploadedImageUrl = uploadResult.url!
        } else {
          console.error("Profile picture upload failed:", uploadResult.error)
          // Continue with update even if image upload fails
        }
      }

      const { error } = await supabase
        .from("users")
        .update({
          username: displayName, // Use username instead of display_name since display_name was removed
          profile_picture_url: uploadedImageUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (!error) {
        setIsOpen(false)
        onProfileUpdate()
      }
    } catch (error) {
      console.error("[v0] Failed to update profile:", error)
    }
    setIsLoading(false)
  }

  return (
    <Card className="border border-cyan-400 bg-slate-950/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-cyan-400 text-lg flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={user.profile_picture_url || "/placeholder.svg"} />
            <AvatarFallback className="text-lg">{getAvatarFallback(user.username)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-medium text-cyan-400">{user.username}</h3>
            <p className="text-sm text-cyan-300">@{user.username}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={user.two_factor_enabled ? "bg-emerald-600" : "bg-slate-600"}>
                <Shield className="w-3 h-3 mr-1" />
                {user.two_factor_enabled ? "2FA On" : "2FA Off"}
              </Badge>
            </div>
          </div>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-cyan-600 hover:bg-cyan-500">
              <Camera className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-slate-950 border-cyan-400 text-cyan-400">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">Edit Profile</DialogTitle>
              <DialogDescription className="text-cyan-300">Update your profile information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-cyan-400">
                  Username
                </Label>
                <Input
                  id="username"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="bg-slate-950 border-cyan-400 text-cyan-400"
                />
              </div>
              <div>
                <Label htmlFor="profile_picture" className="text-cyan-400">
                  Profile Picture
                </Label>
                <Input
                  id="profile_picture"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProfilePicture(e.target.files?.[0] || null)}
                  className="bg-slate-950 border-cyan-400 text-cyan-400"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdate} disabled={isLoading} className="bg-cyan-600 hover:bg-cyan-500">
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

interface SecurityStatusProps {
  user: {
    id: string
    two_factor_enabled: boolean
    last_login?: string
  }
}

export function SecurityStatusCard({ user }: SecurityStatusProps) {
  const securityScore = user.two_factor_enabled ? 85 : 45

  return (
    <Card className="border border-cyan-400 bg-slate-950/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-cyan-400 text-lg flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Security Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-cyan-300">Security Score</span>
            <span
              className={`font-bold ${securityScore >= 80 ? "text-emerald-400" : securityScore >= 60 ? "text-amber-400" : "text-red-400"}`}
            >
              {securityScore}/100
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${
                securityScore >= 80 ? "bg-emerald-400" : securityScore >= 60 ? "bg-amber-400" : "bg-red-400"
              }`}
              style={{ width: `${securityScore}%` }}
            />
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-cyan-300">Two-Factor Auth:</span>
            <Badge className={user.two_factor_enabled ? "bg-emerald-600" : "bg-red-600"}>
              {user.two_factor_enabled ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-cyan-300">Last Login:</span>
            <span className="text-cyan-400">
              {user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
            </span>
          </div>
        </div>

        <Button className="w-full bg-cyan-600 hover:bg-cyan-500">
          <Key className="w-4 h-4 mr-2" />
          Manage Security
        </Button>
      </CardContent>
    </Card>
  )
}
