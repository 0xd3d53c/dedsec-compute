"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  Target, 
  CheckCircle,
  Loader2
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "sonner"

interface Mission {
  id: string
  code: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary'
  tags: string[]
  is_active: boolean
  requires_admin: boolean
  max_participants: number | null
  starts_at: string | null
  ends_at: string | null
  created_by: string | null
  created_at: string
  _count?: {
    participants: number
    completed: number
  }
}

interface MissionFormData {
  code: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard' | 'legendary'
  tags: string[]
  is_active: boolean
  requires_admin: boolean
  max_participants: number | null
  starts_at: string | null
  ends_at: string | null
}

export default function AdminMissionsPage() {
  const router = useRouter()
  const { adminSession, isLoading: authLoading, hasPermission } = useAdminAuth()
  const [missions, setMissions] = useState<Mission[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingMission, setEditingMission] = useState<Mission | null>(null)
  const [formData, setFormData] = useState<MissionFormData>({
    code: '',
    title: '',
    description: '',
    difficulty: 'medium',
    tags: [],
    is_active: true,
    requires_admin: false,
    max_participants: null,
    starts_at: null,
    ends_at: null
  })
  const [tagInput, setTagInput] = useState('')

  useEffect(() => {
    if (!authLoading && !adminSession) {
      router.push("/admin")
      return
    }

    if (adminSession && hasPermission("manage_missions")) {
      fetchMissions()
    }
  }, [adminSession, authLoading, router, hasPermission])

  const fetchMissions = async () => {
    if (!adminSession) return

    setIsLoading(true)
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("missions")
        .select(`
          *,
          _count:user_missions(count)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get participant counts
      const missionsWithCounts = await Promise.all(
        data.map(async (mission) => {
          const { count: participants } = await supabase
            .from("user_missions")
            .select("*", { count: "exact", head: true })
            .eq("mission_id", mission.id)

          const { count: completed } = await supabase
            .from("user_missions")
            .select("*", { count: "exact", head: true })
            .eq("mission_id", mission.id)
            .eq("status", "completed")

          return {
            ...mission,
            _count: {
              participants: participants || 0,
              completed: completed || 0
            }
          }
        })
      )

      setMissions(missionsWithCounts)
    } catch (error) {
      console.error("Error fetching missions:", error)
      toast.error("Failed to fetch missions")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!adminSession) return

    try {
      const supabase = createClient()
      
      if (editingMission) {
        // Update existing mission
        const { error } = await supabase
          .from("missions")
          .update({
            ...formData,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingMission.id)

        if (error) throw error

        toast.success("Mission updated successfully")
      } else {
        // Create new mission
        const { error } = await supabase
          .from("missions")
          .insert({
            ...formData,
            created_by: adminSession.user.id
          })

        if (error) throw error

        toast.success("Mission created successfully")
      }

      setIsDialogOpen(false)
      setEditingMission(null)
      resetForm()
      fetchMissions()
    } catch (error: any) {
      console.error("Error saving mission:", error)
      toast.error(error.message || "Failed to save mission")
    }
  }

  const handleDelete = async (missionId: string) => {
    if (!adminSession) return

    try {
      const supabase = createClient()

      // Check if mission has active participants
      const { count: activeParticipants } = await supabase
        .from("user_missions")
        .select("*", { count: "exact", head: true })
        .eq("mission_id", missionId)
        .in("status", ["accepted", "in_progress"])

      if (activeParticipants && activeParticipants > 0) {
        toast.error("Cannot delete mission with active participants")
        return
      }

      // Soft delete by setting inactive
      const { error } = await supabase
        .from("missions")
        .update({ is_active: false })
        .eq("id", missionId)

      if (error) throw error

      toast.success("Mission deleted successfully")
      fetchMissions()
    } catch (error: any) {
      console.error("Error deleting mission:", error)
      toast.error(error.message || "Failed to delete mission")
    }
  }

  const resetForm = () => {
    setFormData({
      code: '',
      title: '',
      description: '',
      difficulty: 'medium',
      tags: [],
      is_active: true,
      requires_admin: false,
      max_participants: null,
      starts_at: null,
      ends_at: null
    })
  }

  const openEditDialog = (mission: Mission) => {
    setEditingMission(mission)
    setFormData({
      code: mission.code,
      title: mission.title,
      description: mission.description,
      difficulty: mission.difficulty,
      tags: mission.tags || [],
      is_active: mission.is_active,
      requires_admin: mission.requires_admin,
      max_participants: mission.max_participants,
      starts_at: mission.starts_at,
      ends_at: mission.ends_at
    })
    setIsDialogOpen(true)
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-600'
      case 'medium': return 'bg-yellow-600'
      case 'hard': return 'bg-orange-600'
      case 'legendary': return 'bg-red-600'
      default: return 'bg-gray-600'
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading admin panel...</p>
        </div>
      </div>
    )
  }

  if (!adminSession || !hasPermission("manage_missions")) {
    router.push("/admin")
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400">
      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-400 text-slate-950">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-cyan-400" style={{ textShadow: "0 0 10px currentColor" }}>
                Mission Management
              </h1>
              <p className="text-cyan-300">
                Create, edit, and monitor network missions
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setIsDialogOpen(true)} 
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Mission
          </Button>
        </header>

        {/* Mission Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-cyan-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Target className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Total Missions</p>
                  <p className="text-2xl font-bold text-cyan-400">{missions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Active Missions</p>
                  <p className="text-2xl font-bold text-green-400">
                    {missions.filter(m => m.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Total Participants</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {missions.reduce((sum, m) => sum + (m._count?.participants || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Completion Rate</p>
                  <p className="text-2xl font-bold text-orange-400">
                    {missions.length > 0 
                      ? Math.round((missions.reduce((sum, m) => sum + (m._count?.completed || 0), 0) / 
                                   Math.max(missions.reduce((sum, m) => sum + (m._count?.participants || 0), 0), 1)) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Missions Table */}
        <Card className="border-cyan-400 bg-slate-950/80">
          <CardHeader>
            <CardTitle className="text-cyan-400">All Missions</CardTitle>
            <CardDescription className="text-cyan-300">
              Manage network missions and monitor participation
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading missions...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-cyan-400">Mission</TableHead>
                      <TableHead className="text-cyan-400">Difficulty</TableHead>
                      <TableHead className="text-cyan-400">Status</TableHead>
                      <TableHead className="text-cyan-400">Participants</TableHead>
                      <TableHead className="text-cyan-400">Progress</TableHead>
                      <TableHead className="text-cyan-400">Created</TableHead>
                      <TableHead className="text-cyan-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missions.map((mission) => (
                      <TableRow key={mission.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-cyan-400">{mission.title}</div>
                            <div className="text-sm text-cyan-300">@{mission.code}</div>
                            <div className="text-xs text-cyan-600 mt-1">
                              {mission.description.substring(0, 60)}...
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getDifficultyColor(mission.difficulty)}>
                            {mission.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={mission.is_active ? "default" : "secondary"}>
                            {mission.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="text-cyan-400 font-medium">
                              {mission._count?.participants || 0}
                            </div>
                            {mission.max_participants && (
                              <div className="text-xs text-cyan-600">/ {mission.max_participants}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="text-green-400 font-medium">
                              {mission._count?.completed || 0}
                            </div>
                            <div className="text-xs text-cyan-600">
                              {mission._count?.participants ? 
                                Math.round(((mission._count.completed || 0) / mission._count.participants) * 100) : 0}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-cyan-300">
                            {new Date(mission.created_at).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(mission)}
                              className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950"
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-400 text-red-400 hover:bg-red-400 hover:text-white"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Mission</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{mission.title}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(mission.id)}
                                    className="bg-red-600 hover:bg-red-500"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mission Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-slate-950 border-cyan-400 text-cyan-400 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">
                {editingMission ? "Edit Mission" : "Create New Mission"}
              </DialogTitle>
              <DialogDescription className="text-cyan-300">
                Configure mission parameters and requirements
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="code" className="text-cyan-400">Mission Code</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="MISSION_001"
                    className="bg-slate-900 border-cyan-400 text-cyan-400"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="difficulty" className="text-cyan-400">Difficulty</Label>
                  <Select
                    value={formData.difficulty}
                    onValueChange={(value: 'easy' | 'medium' | 'hard' | 'legendary') => 
                      setFormData(prev => ({ ...prev, difficulty: value }))
                    }
                  >
                    <SelectTrigger className="bg-slate-900 border-cyan-400 text-cyan-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-cyan-400">
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="legendary">Legendary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="title" className="text-cyan-400">Mission Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter mission title"
                  className="bg-slate-900 border-cyan-400 text-cyan-400"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-cyan-400">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the mission objectives and requirements"
                  className="bg-slate-900 border-cyan-400 text-cyan-400 min-h-[100px]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max_participants" className="text-cyan-400">Max Participants</Label>
                  <Input
                    id="max_participants"
                    type="number"
                    value={formData.max_participants || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      max_participants: e.target.value ? parseInt(e.target.value) : null 
                    }))}
                    placeholder="Unlimited"
                    className="bg-slate-900 border-cyan-400 text-cyan-400"
                    min="1"
                  />
                </div>

                <div>
                  <Label htmlFor="starts_at" className="text-cyan-400">Start Date</Label>
                  <Input
                    id="starts_at"
                    type="datetime-local"
                    value={formData.starts_at ? formData.starts_at.slice(0, 16) : ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      starts_at: e.target.value ? new Date(e.target.value).toISOString() : null 
                    }))}
                    className="bg-slate-900 border-cyan-400 text-cyan-400"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="ends_at" className="text-cyan-400">End Date</Label>
                <Input
                  id="ends_at"
                  type="datetime-local"
                  value={formData.ends_at ? formData.ends_at.slice(0, 16) : ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    ends_at: e.target.value ? new Date(e.target.value).toISOString() : null 
                  }))}
                  className="bg-slate-900 border-cyan-400 text-cyan-400"
                />
              </div>

              <div>
                <Label className="text-cyan-400">Tags</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag and press Enter"
                    className="bg-slate-900 border-cyan-400 text-cyan-400 flex-1"
                  />
                  <Button type="button" onClick={addTag} className="bg-cyan-600 hover:bg-cyan-500">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="border-cyan-400 text-cyan-400">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 text-cyan-400 hover:text-red-400"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded border-cyan-400 text-cyan-400 focus:ring-cyan-400"
                  />
                  <Label htmlFor="is_active" className="text-cyan-400">Active</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="requires_admin"
                    checked={formData.requires_admin}
                    onChange={(e) => setFormData(prev => ({ ...prev, requires_admin: e.target.checked }))}
                    className="rounded border-cyan-400 text-cyan-400 focus:ring-cyan-400"
                  />
                  <Label htmlFor="requires_admin" className="text-cyan-400">Requires Admin Approval</Label>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false)
                    setEditingMission(null)
                    resetForm()
                  }}
                  className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white">
                  {editingMission ? "Update Mission" : "Create Mission"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
