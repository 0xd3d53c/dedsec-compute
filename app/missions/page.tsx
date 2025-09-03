"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, CheckCircle2, AlertTriangle, PlayCircle, ListChecks } from "lucide-react"

type Mission = {
  id: string
  code: string
  title: string
  description: string
  difficulty: "easy" | "medium" | "hard" | "legendary"
  tags: string[] | null
  is_active: boolean
  requires_admin: boolean
  starts_at: string | null
  ends_at: string | null
}

type UserMission = {
  id: string
  mission_id: string
  user_id: string
  status: "accepted" | "in_progress" | "completed" | "failed" | "abandoned"
  started_at: string | null
  completed_at: string | null
}

export default function MissionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [missions, setMissions] = useState<Mission[]>([])
  const [myMissions, setMyMissions] = useState<UserMission[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUserId(user.id)

      await Promise.all([loadMissions(), loadMyMissions(user.id)])
      setLoading(false)

      // realtime subscriptions
      const channel = supabase
        .channel("missions_rt")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "missions" }, () => loadMissions())
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "missions" }, () => loadMissions())
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_missions" }, (payload) => {
          if (payload.new && payload.new.user_id === user.id) loadMyMissions(user.id)
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_missions" }, (payload) => {
          if (payload.new && payload.new.user_id === user.id) loadMyMissions(user.id)
        })
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    }
    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase])

  const loadMissions = async () => {
    const { data } = await supabase
      .from("missions")
      .select("id, code, title, description, difficulty, tags, is_active, requires_admin, starts_at, ends_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
    setMissions((data as Mission[]) || [])
  }

  const loadMyMissions = async (uid: string) => {
    const { data } = await supabase
      .from("user_missions")
      .select("id, mission_id, user_id, status, started_at, completed_at")
      .eq("user_id", uid)
      .order("updated_at", { ascending: false })
    setMyMissions((data as UserMission[]) || [])
  }

  const acceptMission = async (mission: Mission) => {
    if (!userId) return
    // upsert enrollment
    const { error } = await supabase
      .from("user_missions")
      .insert({ mission_id: mission.id, user_id: userId, status: "accepted", started_at: new Date().toISOString() })
    if (!error) {
      await supabase.from("mission_updates").insert({ mission_id: mission.id, user_id: userId, event_type: "accepted", payload: {} })
      await loadMyMissions(userId)
    }
  }

  const setStatus = async (um: UserMission, status: UserMission["status"]) => {
    const update: any = { status }
    if (status === "in_progress" && !um.started_at) update.started_at = new Date().toISOString()
    if (status === "completed") update.completed_at = new Date().toISOString()
    await supabase.from("user_missions").update(update).eq("id", um.id)
    await supabase.from("mission_updates").insert({ mission_id: um.mission_id, user_id: um.user_id, event_type: status, payload: {} })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-blue-400 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-blue-400">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold dedsec-glow text-blue-400">Missions</h1>
          <p className="text-cyan-300">Accept and track real missions in the network.</p>
        </div>

        <Tabs defaultValue="available" className="space-y-6">
          <TabsList className="bg-slate-950 border border-blue-400 grid grid-cols-2 w-full">
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="my">My Missions</TabsTrigger>
          </TabsList>

          <TabsContent value="available">
            <div className="grid sm:grid-cols-2 gap-6">
              {missions.map((m) => (
                <Card key={m.id} className="dedsec-border bg-slate-950/80">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{m.title}</span>
                      <Badge>{m.difficulty}</Badge>
                    </CardTitle>
                    <CardDescription className="text-cyan-300">{m.code}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-cyan-300 text-sm leading-relaxed">{m.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {(m.tags || []).map((t) => (
                        <span key={t} className="px-2 py-1 text-xs border border-blue-400/40 rounded">#{t}</span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-cyan-300">
                        {m.starts_at && <span>Starts: {new Date(m.starts_at).toLocaleString()} </span>}
                        {m.ends_at && <span>Ends: {new Date(m.ends_at).toLocaleString()}</span>}
                      </div>
                      <Button className="dedsec-button" onClick={() => acceptMission(m)}>
                        <PlayCircle className="w-4 h-4 mr-2" /> Accept
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {missions.length === 0 && (
                <div className="col-span-2 text-center text-blue-600">No missions available.</div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="my">
            <div className="space-y-4">
              {myMissions.map((um) => (
                <Card key={um.id} className="dedsec-border bg-slate-950/80">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ListChecks className="w-4 h-4" />
                        <span className="text-sm text-cyan-300">Status:</span>
                        <Badge>{um.status}</Badge>
                      </div>
                      <div className="text-xs text-cyan-300">
                        {um.started_at && <span>Started: {new Date(um.started_at).toLocaleString()} </span>}
                        {um.completed_at && <span>Completed: {new Date(um.completed_at).toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {um.status === "accepted" && (
                        <Button size="sm" onClick={() => setStatus(um, "in_progress")}>Start</Button>
                      )}
                      {um.status === "in_progress" && (
                        <Button size="sm" className="bg-green-600 hover:bg-green-500" onClick={() => setStatus(um, "completed")}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Complete
                        </Button>
                      )}
                      {um.status !== "completed" && (
                        <Button size="sm" variant="outline" className="border-red-500 text-red-400" onClick={() => setStatus(um, "abandoned")}>
                          <AlertTriangle className="w-4 h-4 mr-1" /> Abandon
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {myMissions.length === 0 && (
                <div className="text-center text-blue-600">You have not accepted any missions yet.</div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


