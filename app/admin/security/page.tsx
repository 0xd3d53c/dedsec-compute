"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Search, 
  Filter, 
  Download,
  Clock,
  User,
  Activity,
  Lock,
  Unlock,
  Loader2,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "sonner"

interface AdminLog {
  id: string
  admin_id: string
  action: string
  target_type: string
  target_id: string | null
  details: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
  admin?: {
    username: string
  }
}

interface SecurityEvent {
  id: string
  user_id: string
  event_type: string
  severity: string
  description: string
  metadata: any
  created_at: string
  user?: {
    username: string
  }
}

interface CompromiseEvent {
  id: string
  user_id: string
  compromise_type: string
  confidence_score: number
  indicators: string[]
  metadata: any
  created_at: string
  user?: {
    username: string
  }
}

export default function AdminSecurityPage() {
  const router = useRouter()
  const { adminSession, isLoading: authLoading, hasPermission } = useAdminAuth()
  const [adminLogs, setAdminLogs] = useState<AdminLog[]>([])
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([])
  const [compromiseEvents, setCompromiseEvents] = useState<CompromiseEvent[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [eventTypeFilter, setEventTypeFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [timeRange, setTimeRange] = useState("24h")

  useEffect(() => {
    if (!authLoading && !adminSession) {
      router.push("/admin")
      return
    }

    if (adminSession && hasPermission("view_logs")) {
      fetchSecurityData()
    }
  }, [adminSession, authLoading, router, hasPermission])

  const fetchSecurityData = async () => {
    if (!adminSession) return

    setIsLoading(true)
    try {
      const supabase = createClient()

      // Fetch admin logs
      const fetchAdminLogs = async () => {
        try {
          // Note: admin_logs requires service_role access
          // In production, this should be handled server-side via API routes
          setAdminLogs([])
        } catch (error) {
          console.error('Failed to fetch admin logs:', error)
          setAdminLogs([])
        }
      }

      // Fetch security events (if table exists)
      try {
        const { data: events, error: eventsError } = await supabase
          .from("security_events")
          .select(`
            *,
            user:users(username)
          `)
          .order("created_at", { ascending: false })
          .limit(100)

        if (eventsError) {
          console.log("Security events table not available or error:", eventsError.message)
          setSecurityEvents([])
        } else {
          setSecurityEvents(events || [])
        }
      } catch (error) {
        console.log("Security events table not available")
        setSecurityEvents([])
      }

      // Fetch compromise events (if table exists)
      try {
        const { data: compromises, error: compromisesError } = await supabase
          .from("compromise_events")
          .select(`
            *,
            user:users(username)
          `)
          .order("created_at", { ascending: false })
          .limit(100)

        if (compromisesError) {
          console.log("Compromise events table not available or error:", compromisesError.message)
          setCompromiseEvents([])
        } else {
          setCompromiseEvents(compromises || [])
        }
      } catch (error) {
        console.log("Compromise events table not available")
        setCompromiseEvents([])
      }

    } catch (error) {
      console.error("Error fetching security data:", error)
      toast.error("Failed to fetch security data")
    } finally {
      setIsLoading(false)
    }
  }

  const getEventTypeColor = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'login':
      case 'login_success':
        return 'bg-green-600'
      case 'login_failed':
      case 'failed':
        return 'bg-red-600'
      case 'admin_login':
      case 'admin_action':
        return 'bg-purple-600'
      case 'security':
      case 'compromise':
        return 'bg-orange-600'
      default:
        return 'bg-gray-600'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical':
        return 'bg-red-600'
      case 'high':
        return 'bg-orange-600'
      case 'medium':
        return 'bg-yellow-600'
      case 'low':
        return 'bg-green-600'
      default:
        return 'bg-gray-600'
    }
  }

  const getCompromiseColor = (confidenceScore: number) => {
    if (confidenceScore >= 80) return 'bg-red-600'
    if (confidenceScore >= 60) return 'bg-orange-600'
    if (confidenceScore >= 40) return 'bg-yellow-600'
    return 'bg-green-600'
  }

  const exportLogs = async () => {
    try {
      const csvContent = [
        ['Timestamp', 'Admin', 'Action', 'Target Type', 'Target ID', 'IP Address', 'Details'],
        ...adminLogs.map(log => [
          new Date(log.created_at).toISOString(),
          log.admin?.username || 'Unknown',
          log.action,
          log.target_type,
          log.target_id || 'N/A',
          log.ip_address || 'N/A',
          JSON.stringify(log.details)
        ])
      ].map(row => row.join(',')).join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `admin_logs_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success("Logs exported successfully")
    } catch (error) {
      console.error("Export error:", error)
      toast.error("Failed to export logs")
    }
  }

  const getSecurityStats = () => {
    const totalEvents = adminLogs.length + securityEvents.length + compromiseEvents.length
    const criticalEvents = securityEvents.filter(e => e.severity === 'critical').length
    const compromiseCount = compromiseEvents.length
    const recentActivity = adminLogs.filter(log => 
      new Date(log.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length

    return { totalEvents, criticalEvents, compromiseCount, recentActivity }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading security panel...</p>
        </div>
      </div>
    )
  }

  if (!adminSession || !hasPermission("view_logs")) {
    router.push("/admin")
    return null
  }

  const securityStats = getSecurityStats()

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400">
      <div className="container mx-auto px-4 py-8">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-600 text-white">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-cyan-400" style={{ textShadow: "0 0 10px currentColor" }}>
                Security & Audit
              </h1>
              <p className="text-cyan-300">
                Monitor security events and administrative actions
              </p>
            </div>
          </div>
          <Button 
            onClick={exportLogs} 
            className="bg-cyan-600 hover:bg-cyan-500 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Logs
          </Button>
        </header>

        {/* Security Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-cyan-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Activity className="w-8 h-8 text-cyan-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Total Events</p>
                  <p className="text-2xl font-bold text-cyan-400">{securityStats.totalEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Critical Events</p>
                  <p className="text-2xl font-bold text-red-400">{securityStats.criticalEvents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-orange-400" />
                <div>
                  <p className="text-cyan-300 text-sm">Compromises</p>
                  <p className="text-2xl font-bold text-orange-400">{securityStats.compromiseCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-400 bg-slate-950/80">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-400" />
                <div>
                  <p className="text-cyan-300 text-sm">24h Activity</p>
                  <p className="text-2xl font-bold text-blue-400">{securityStats.recentActivity}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-cyan-400 bg-slate-950/80 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search" className="text-cyan-400 text-sm">Search Events</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-cyan-400" />
                  <Input
                    id="search"
                    placeholder="Search by action, user, or details..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-slate-900 border-cyan-400 text-cyan-400 pl-10"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="event-filter" className="text-cyan-400 text-sm">Event Type</Label>
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger className="bg-slate-900 border-cyan-400 text-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-cyan-400">
                    <SelectItem value="all">All Events</SelectItem>
                    <SelectItem value="login">Login Events</SelectItem>
                    <SelectItem value="admin">Admin Actions</SelectItem>
                    <SelectItem value="security">Security Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="severity-filter" className="text-cyan-400 text-sm">Severity</Label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="bg-slate-900 border-cyan-400 text-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-cyan-400">
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="time-filter" className="text-cyan-400 text-sm">Time Range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="bg-slate-900 border-cyan-400 text-cyan-400">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-cyan-400">
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Security Tabs */}
        <Tabs defaultValue="admin-logs" className="space-y-6">
          <TabsList className="bg-slate-950 border border-cyan-400 w-full grid grid-cols-3 h-auto p-1">
            <TabsTrigger
              value="admin-logs"
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-sm py-2 px-3"
            >
              <Activity className="w-4 h-4 mr-2" />
              Admin Logs
            </TabsTrigger>
            <TabsTrigger
              value="security-events"
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-sm py-2 px-3"
            >
              <Shield className="w-4 h-4 mr-2" />
              Security Events
            </TabsTrigger>
            <TabsTrigger
              value="compromises"
              className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white text-sm py-2 px-3"
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Compromises
            </TabsTrigger>
          </TabsList>

          <TabsContent value="admin-logs">
            <Card className="border-cyan-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-cyan-400">Administrative Action Logs</CardTitle>
                <CardDescription className="text-cyan-300">
                  All administrative actions and system access logs
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Loading admin logs...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-cyan-400">Timestamp</TableHead>
                          <TableHead className="text-cyan-400">Admin</TableHead>
                          <TableHead className="text-cyan-400">Action</TableHead>
                          <TableHead className="text-cyan-400">Target</TableHead>
                          <TableHead className="text-cyan-400">IP Address</TableHead>
                          <TableHead className="text-cyan-400">Details</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="text-sm text-cyan-300">
                                {new Date(log.created_at).toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-cyan-400 font-medium">
                                {log.admin?.username || 'Unknown'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getEventTypeColor(log.action)}>
                                {log.action}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-cyan-300">
                                {log.target_type}: {log.target_id || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-cyan-300 font-mono">
                                {log.ip_address || 'N/A'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-cyan-300 max-w-xs truncate">
                                {JSON.stringify(log.details)}
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
          </TabsContent>

          <TabsContent value="security-events">
            <Card className="border-green-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-green-400">Security Events</CardTitle>
                <CardDescription className="text-cyan-300">
                  Security-related events and alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {securityEvents.length === 0 ? (
                  <div className="text-center py-8 text-cyan-600">
                    <Shield className="w-12 h-12 mx-auto mb-4" />
                    <p>No security events found</p>
                    <p className="text-sm">Security events will appear here when detected</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableRow>
                            <TableHead className="text-cyan-400">Timestamp</TableHead>
                            <TableHead className="text-cyan-400">User</TableHead>
                            <TableHead className="text-cyan-400">Event Type</TableHead>
                            <TableHead className="text-cyan-400">Severity</TableHead>
                            <TableHead className="text-cyan-400">Description</TableHead>
                            <TableHead className="text-cyan-400">Metadata</TableHead>
                          </TableRow>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {securityEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              <div className="text-sm text-cyan-300">
                                {new Date(event.created_at).toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-cyan-400 font-medium">
                                {event.user?.username || 'Unknown'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getEventTypeColor(event.event_type)}>
                                {event.event_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getSeverityColor(event.severity)}>
                                {event.severity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-cyan-300 max-w-xs">
                                {event.description}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-cyan-300 max-w-xs truncate">
                                {JSON.stringify(event.metadata)}
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
          </TabsContent>

          <TabsContent value="compromises">
            <Card className="border-red-400 bg-slate-950/80">
              <CardHeader>
                <CardTitle className="text-red-400">Compromise Detection Events</CardTitle>
                <CardDescription className="text-cyan-300">
                  Detected security compromises and suspicious activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                {compromiseEvents.length === 0 ? (
                  <div className="text-center py-8 text-cyan-600">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4" />
                    <p>No compromise events detected</p>
                    <p className="text-sm">System is secure - no compromises found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-cyan-400">Timestamp</TableHead>
                          <TableHead className="text-cyan-400">User</TableHead>
                          <TableHead className="text-cyan-400">Type</TableHead>
                          <TableHead className="text-cyan-400">Confidence</TableHead>
                          <TableHead className="text-cyan-400">Indicators</TableHead>
                          <TableHead className="text-cyan-400">Metadata</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {compromiseEvents.map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              <div className="text-sm text-cyan-300">
                                {new Date(event.created_at).toLocaleString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-cyan-400 font-medium">
                                {event.user?.username || 'Unknown'}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-red-600">
                                {event.compromise_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getCompromiseColor(event.confidence_score)}>
                                {event.confidence_score}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {event.indicators.map((indicator, index) => (
                                  <Badge key={index} variant="outline" className="text-xs border-red-400 text-red-400">
                                    {indicator}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-cyan-300 max-w-xs truncate">
                                {JSON.stringify(event.metadata)}
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
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
