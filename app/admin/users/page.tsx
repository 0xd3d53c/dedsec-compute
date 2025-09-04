"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Users, 
  Shield, 
  UserCheck, 
  UserX, 
  Crown, 
  Activity, 
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Loader2,
  TrendingUp,
  Cpu,
  MemoryStick
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "sonner"

interface User {
  id: string
  username: string
  email: string
  profile_picture_url?: string
  invite_code: string
  invited_by?: string
  is_admin: boolean
  is_active: boolean
  two_factor_enabled: boolean
  last_login?: string
  created_at: string
  updated_at: string
  _count?: {
    followers: number
    following: number
    missions: number
    completed_missions: number
    compute_hours: number
  }
}

interface UserSession {
  id: string
  device_id: string
  is_contributing: boolean
  max_cpu_percent: number
  max_memory_mb: number
  last_active: string
  hardware_specs: any
}

export default function AdminUsersPage() {
  const router = useRouter()
  const { adminSession, isLoading: authLoading, hasPermission } = useAdminAuth()
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userSessions, setUserSessions] = useState<UserSession[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false)
  const [isSessionsDialogOpen, setIsSessionsDialogOpen] = useState(false)

  useEffect(() => {
    if (!authLoading && !adminSession) {
      router.push("/admin")
      return
    }

    if (adminSession && hasPermission("view_users")) {
      fetchUsers()
    }
  }, [adminSession, authLoading, router, hasPermission])

  useEffect(() => {
    filterUsers()
  }, [users, searchTerm, statusFilter, roleFilter])

  const fetchUsers = async () => {
    if (!adminSession) return

    setIsLoading(true)
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("users")
        .select(`
          *,
          _count:followers(count),
          _count:user_missions(count)
        `)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Get additional user statistics
      const usersWithStats = await Promise.all(
        data.map(async (user) => {
          // Get following count
          const { count: following } = await supabase
            .from("followers")
            .select("*", { count: "exact", head: true })
            .eq("follower_id", user.id)

          // Get completed missions count
          const { count: completedMissions } = await supabase
            .from("user_missions")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("status", "completed")

          // Get compute hours from task executions
          const { data: taskExecutions } = await supabase
            .from("task_executions")
            .select("compute_time_ms")
            .eq("user_id", user.id)
            .eq("status", "completed")

          const computeHours = taskExecutions?.reduce((sum, task) => 
            sum + (task.compute_time_ms || 0), 0) / (1000 * 60 * 60) || 0

          return {
            ...user,
            _count: {
              followers: user._count?.followers || 0,
              following: following || 0,
              missions: user._count?.missions || 0,
              completed_missions: completedMissions || 0,
              compute_hours: Math.round(computeHours * 100) / 100
            }
          }
        })
      )

      setUsers(usersWithStats)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast.error("Failed to fetch users")
    } finally {
      setIsLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(user => 
        statusFilter === "active" ? user.is_active : !user.is_active
      )
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => 
        roleFilter === "admin" ? user.is_admin : !user.is_admin
      )
    }

    setFilteredUsers(filtered)
  }

  const fetchUserSessions = async (userId: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", userId)
        .order("last_active", { ascending: false })

      if (error) throw error
      setUserSessions(data || [])
    } catch (error) {
      console.error("Error fetching user sessions:", error)
      toast.error("Failed to fetch user sessions")
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    if (!adminSession) return

    try {
      const supabase = createClient()
      const newStatus = !currentStatus

      const { error } = await supabase
        .from("users")
        .update({ 
          is_active: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId)

      if (error) throw error

      toast.success(`User ${newStatus ? 'activated' : 'deactivated'} successfully`)
      fetchUsers()
    } catch (error: any) {
      console.error("Error updating user status:", error)
      toast.error(error.message || "Failed to update user status")
    }
  }

  const toggleAdminStatus = async (userId: string, currentStatus: boolean) => {
    if (!adminSession) return

    try {
      const supabase = createClient()
      const newStatus = !currentStatus

      const { error } = await supabase
        .from("users")
        .update({ 
          is_admin: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId)

      if (error) throw error

      toast.success(`Admin privileges ${newStatus ? 'granted' : 'revoked'} successfully`)
      fetchUsers()
    } catch (error: any) {
      console.error("Error updating admin status:", error)
      toast.error(error.message || "Failed to update admin status")
    }
  }

  const deleteUser = async (userId: string) => {
    if (!adminSession) return

    try {
      const supabase = createClient()

      // Check if user has active sessions or missions
      const { count: activeSessions } = await supabase
        .from("user_sessions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_contributing", true)

      const { count: activeMissions } = await supabase
        .from("user_missions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .in("status", ["accepted", "in_progress"])

      if (activeSessions && activeSessions > 0) {
        toast.error("Cannot delete user with active computing sessions")
        return
      }

      if (activeMissions && activeMissions > 0) {
        toast.error("Cannot delete user with active missions")
        return
      }

      // Soft delete by setting inactive
      const { error } = await supabase
        .from("users")
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId)

      if (error) throw error

      toast.success("User deleted successfully")
      fetchUsers()
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast.error(error.message || "Failed to delete user")
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? "bg-green-600" : "bg-red-600"
  }

  const getRoleColor = (isAdmin: boolean) => {
    return isAdmin ? "bg-purple-600" : "bg-gray-600"
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

  if (!adminSession || !hasPermission("view_users")) {
    router.push("/admin")
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400">
      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-cyan-400 text-slate-950">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-cyan-400" style={{ textShadow: "0 0 10px currentColor" }}>
                User Management
              </h1>
              <p className="text-cyan-300">
                Monitor and manage network users
              </p>
            </div>
          </div>
        </header>

        {/* User Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-cyan-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Total Users</p>
                  <p className="text-2xl font-bold text-cyan-400">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <UserCheck className="w-8 h-8 text-green-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Active Users</p>
                  <p className="text-2xl font-bold text-green-400">
                    {users.filter(u => u.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Crown className="w-8 h-8 text-purple-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Administrators</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {users.filter(u => u.is_admin).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Contributing</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {users.filter(u => u.is_active).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="border-cyan-400 bg-slate-950/80 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="text-cyan-400 text-sm">Search Users</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  <Input
                    id="search"
                    placeholder="Search by username or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-900 border-cyan-400 text-cyan-400 pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="status-filter" className="text-cyan-400 text-sm">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-900 border-cyan-400 text-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-cyan-400">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="role-filter" className="text-cyan-400 text-sm">Role</Label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="bg-slate-900 border-cyan-400 text-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-cyan-400">
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Administrators</SelectItem>
                    <SelectItem value="user">Regular Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="border-cyan-400 bg-slate-950/80">
          <CardHeader>
            <CardTitle className="text-cyan-400">Network Users</CardTitle>
            <CardDescription className="text-cyan-300">
              {filteredUsers.length} users found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                <p>Loading users...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-cyan-400">User</TableHead>
                      <TableHead className="text-cyan-400">Status</TableHead>
                      <TableHead className="text-cyan-400">Role</TableHead>
                      <TableHead className="text-cyan-400">Stats</TableHead>
                      <TableHead className="text-cyan-400">Last Active</TableHead>
                      <TableHead className="text-cyan-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-cyan-400">{user.username}</div>
                            <div className="text-sm text-cyan-300">{user.email}</div>
                            <div className="text-xs text-cyan-600">Invite: {user.invite_code}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(user.is_active)}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRoleColor(user.is_admin)}>
                            {user.is_admin ? "Admin" : "User"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-xs text-cyan-300">
                              Missions: {user._count?.missions || 0}
                            </div>
                            <div className="text-xs text-cyan-300">
                              Compute: {user._count?.compute_hours || 0}h
                            </div>
                            <div className="text-xs text-cyan-300">
                              Followers: {user._count?.followers || 0}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-cyan-300">
                            {user.last_login 
                              ? new Date(user.last_login).toLocaleDateString()
                              : "Never"
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user)
                                fetchUserSessions(user.id)
                                setIsSessionsDialogOpen(true)
                              }}
                              className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-slate-950"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleUserStatus(user.id, user.is_active)}
                              className={`border-${user.is_active ? 'red' : 'green'}-400 text-${user.is_active ? 'red' : 'green'}-400 hover:bg-${user.is_active ? 'red' : 'green'}-400 hover:text-white`}
                            >
                              {user.is_active ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                            </Button>

                            {hasPermission("manage_admins") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleAdminStatus(user.id, user.is_admin)}
                                className={`border-${user.is_admin ? 'red' : 'purple'}-400 text-${user.is_admin ? 'red' : 'purple'}-400 hover:bg-${user.is_admin ? 'red' : 'purple'}-400 hover:text-white`}
                              >
                                {user.is_admin ? <UserX className="w-3 h-3" /> : <Crown className="w-3 h-3" />}
                              </Button>
                            )}

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
                                  <AlertDialogTitle>Delete User</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete "{user.username}"? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUser(user.id)}
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

        {/* User Sessions Dialog */}
        <Dialog open={isSessionsDialogOpen} onOpenChange={setIsSessionsDialogOpen}>
          <DialogContent className="bg-slate-950 border-cyan-400 text-cyan-400 max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">
                User Sessions: {selectedUser?.username}
              </DialogTitle>
              <DialogDescription className="text-cyan-300">
                Active computing sessions and device information
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* User Info */}
              <Card className="border-cyan-400 bg-slate-900/50">
                <CardContent className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-cyan-300">Username:</span>
                      <div className="text-cyan-400 font-medium">{selectedUser?.username}</div>
                    </div>
                    <div>
                      <span className="text-cyan-300">Email:</span>
                      <div className="text-cyan-400 font-medium">{selectedUser?.email}</div>
                    </div>
                    <div>
                      <span className="text-cyan-300">Status:</span>
                      <Badge className={getStatusColor(selectedUser?.is_active || false)}>
                        {selectedUser?.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-cyan-300">Role:</span>
                      <Badge className={getRoleColor(selectedUser?.is_admin || false)}>
                        {selectedUser?.is_admin ? "Admin" : "User"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sessions Table */}
              <div>
                <h3 className="text-lg font-semibold text-cyan-400 mb-4">Active Sessions</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-cyan-400">Device ID</TableHead>
                        <TableHead className="text-cyan-400">Status</TableHead>
                        <TableHead className="text-cyan-400">Resources</TableHead>
                        <TableHead className="text-cyan-400">Hardware</TableHead>
                        <TableHead className="text-cyan-400">Last Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>
                            <div className="text-cyan-400 font-mono text-sm">
                              {session.device_id.substring(0, 8)}...
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={session.is_contributing ? "default" : "secondary"}>
                              {session.is_contributing ? "Contributing" : "Idle"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-xs text-cyan-300">
                                CPU: {session.max_cpu_percent}%
                              </div>
                              <div className="text-xs text-cyan-300">
                                Memory: {session.max_memory_mb}MB
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs text-cyan-300">
                              {session.hardware_specs?.platform || "Unknown"}
                            </div>
                            <div className="text-xs text-cyan-300">
                              {session.hardware_specs?.cpu_cores || 0} cores
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-cyan-300">
                              {new Date(session.last_active).toLocaleString()}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {userSessions.length === 0 && (
                  <div className="text-center py-8 text-cyan-600">
                    <Activity className="w-12 h-12 mx-auto mb-4" />
                    <p>No active sessions found</p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setIsSessionsDialogOpen(false)}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
