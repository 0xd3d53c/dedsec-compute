"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { QrCode, Copy, Share2, Gift, Link, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"

interface InviteCode {
  id: string
  code: string
  created_by: string
  used_by?: string
  max_uses: number
  current_uses: number
  expires_at?: string
  is_active: boolean
  created_at: string
}

interface InviteSystemProps {
  currentUserId: string
  userInviteCode: string
}

export function InviteSystem({ currentUserId, userInviteCode }: InviteSystemProps) {
  const [myInviteCodes, setMyInviteCodes] = useState<InviteCode[]>([])
  const [inviteStats, setInviteStats] = useState({
    totalInvites: 0,
    successfulInvites: 0,
    pendingInvites: 0,
  })
  const [newInviteUses, setNewInviteUses] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [qrCodeUrl, setQrCodeUrl] = useState("")

  const supabase = createClient()

  useEffect(() => {
    loadInviteCodes()
    generateQRCode()

    // Set up real-time subscription for invite code usage
    const subscription = supabase
      .channel("invite_codes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "invite_codes",
          filter: `created_by=eq.${currentUserId}`,
        },
        () => {
          loadInviteCodes()
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [currentUserId])

  const loadInviteCodes = async () => {
    try {
      const { data, error } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("created_by", currentUserId)
        .order("created_at", { ascending: false })

      if (error) throw error

      setMyInviteCodes(data || [])

      // Calculate stats
      const totalInvites = data?.length || 0
      const successfulInvites = data?.filter((code) => code.current_uses > 0).length || 0
      const pendingInvites = data?.filter((code) => code.is_active && code.current_uses < code.max_uses).length || 0

      setInviteStats({
        totalInvites,
        successfulInvites,
        pendingInvites,
      })
    } catch (error) {
      console.error("[v0] Error loading invite codes:", error)
    }
  }

  const generateQRCode = () => {
    const inviteUrl = `${window.location.origin}/invite/${userInviteCode}`
    // Using a QR code service (in production, you might want to use a library like qrcode)
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(inviteUrl)}`
    setQrCodeUrl(qrUrl)
  }

  const createInviteCode = async () => {
    setIsCreating(true)
    try {
      const newCode = generateInviteCode()

      const { error } = await supabase.from("invite_codes").insert({
        code: newCode,
        created_by: currentUserId,
        max_uses: newInviteUses,
        current_uses: 0,
        is_active: true,
      })

      if (error) throw error

      await loadInviteCodes()
      toast({
        title: "Invite code created",
        description: `New invite code "${newCode}" created successfully`,
      })
    } catch (error) {
      console.error("[v0] Error creating invite code:", error)
      toast({
        title: "Error",
        description: "Failed to create invite code",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const generateInviteCode = (): string => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copied!",
        description: `${type} copied to clipboard`,
      })
    } catch (error) {
      console.error("[v0] Error copying to clipboard:", error)
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const shareInvite = async (code: string) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`
    const shareData = {
      title: "Join DedSec Compute Network",
      text: "Join me in the distributed computing network and earn rewards!",
      url: inviteUrl,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (error) {
        console.error("[v0] Error sharing:", error)
        copyToClipboard(inviteUrl, "Invite link")
      }
    } else {
      copyToClipboard(inviteUrl, "Invite link")
    }
  }

  const deactivateInviteCode = async (codeId: string) => {
    try {
      const { error } = await supabase.from("invite_codes").update({ is_active: false }).eq("id", codeId)

      if (error) throw error

      await loadInviteCodes()
      toast({
        title: "Invite code deactivated",
        description: "The invite code has been deactivated",
      })
    } catch (error) {
      console.error("[v0] Error deactivating invite code:", error)
      toast({
        title: "Error",
        description: "Failed to deactivate invite code",
        variant: "destructive",
      })
    }
  }

  const getInviteUrl = (code: string) => `${window.location.origin}/invite/${code}`

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <UserPlus className="h-5 w-5" />
            Recruitment Dashboard
          </CardTitle>
          <CardDescription className="text-slate-400">
            Invite others to join the distributed computing network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{inviteStats.totalInvites}</div>
              <div className="text-sm text-slate-400">Total Invites</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{inviteStats.successfulInvites}</div>
              <div className="text-sm text-slate-400">Successful</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{inviteStats.pendingInvites}</div>
              <div className="text-sm text-slate-400">Pending</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-800/50">
          <TabsTrigger value="personal">Personal Invite</TabsTrigger>
          <TabsTrigger value="codes">Invite Codes</TabsTrigger>
          <TabsTrigger value="create">Create New</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <QrCode className="h-5 w-5" />
                Your Personal Invite
              </CardTitle>
              <CardDescription className="text-slate-400">
                Share your personal invite code or QR code with others
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-200">Personal Invite Code</label>
                  <div className="flex gap-2 mt-1">
                    <Input value={userInviteCode} readOnly className="bg-slate-700/50 border-slate-600 font-mono" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(userInviteCode, "Invite code")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => shareInvite(userInviteCode)}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-200">Invite Link</label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={getInviteUrl(userInviteCode)}
                      readOnly
                      className="bg-slate-700/50 border-slate-600 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(getInviteUrl(userInviteCode), "Invite link")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {qrCodeUrl && (
                <div className="flex flex-col items-center gap-4">
                  <div className="text-sm font-medium text-slate-200">QR Code</div>
                  <div className="p-4 bg-white rounded-lg">
                    <img src={qrCodeUrl || "/placeholder.svg"} alt="QR Code" className="w-48 h-48" />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const link = document.createElement("a")
                      link.href = qrCodeUrl
                      link.download = `invite-qr-${userInviteCode}.png`
                      link.click()
                    }}
                  >
                    Download QR Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Gift className="h-5 w-5" />
                Your Invite Codes
              </CardTitle>
              <CardDescription className="text-slate-400">Manage your created invite codes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myInviteCodes.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No invite codes created yet</p>
                ) : (
                  myInviteCodes.map((code) => (
                    <div
                      key={code.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-slate-700/30 border border-slate-600"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-200">{code.code}</span>
                          <Badge variant={code.is_active ? "default" : "secondary"}>
                            {code.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-400 mt-1">
                          Used {code.current_uses} / {code.max_uses} times
                        </div>
                        <div className="text-xs text-slate-500">
                          Created {new Date(code.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(code.code, "Invite code")}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => shareInvite(code.code)}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                        {code.is_active && (
                          <Button variant="destructive" size="sm" onClick={() => deactivateInviteCode(code.id)}>
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="create" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Link className="h-5 w-5" />
                Create New Invite Code
              </CardTitle>
              <CardDescription className="text-slate-400">
                Generate a new invite code with custom usage limits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Maximum Uses</label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={newInviteUses}
                  onChange={(e) => setNewInviteUses(Number.parseInt(e.target.value) || 1)}
                  className="bg-slate-700/50 border-slate-600"
                />
                <p className="text-xs text-slate-400">How many people can use this invite code</p>
              </div>

              <Button onClick={createInviteCode} disabled={isCreating} className="w-full">
                {isCreating ? "Creating..." : "Create Invite Code"}
              </Button>

              <div className="p-4 bg-slate-700/30 rounded-lg border border-slate-600">
                <h4 className="font-medium text-slate-200 mb-2">Invite Rewards</h4>
                <ul className="text-sm text-slate-400 space-y-1">
                  <li>• Earn 50 points for each successful invite</li>
                  <li>• Get 10% of your invitee's contribution score</li>
                  <li>• Unlock exclusive achievements</li>
                  <li>• Build your network and climb the leaderboard</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
