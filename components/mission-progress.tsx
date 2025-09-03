"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  PlayCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Users, 
  Target,
  TrendingUp,
  Zap
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"

interface MissionProgress {
  mission_id: string
  total_tasks: number
  completed_tasks: number
  in_progress_tasks: number
  failed_tasks: number
  total_participants: number
  completion_rate: number
  estimated_completion: string | null
}

interface Mission {
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

interface UserMission {
  id: string
  mission_id: string
  user_id: string
  status: "accepted" | "in_progress" | "completed" | "failed" | "abandoned"
  started_at: string | null
  completed_at: string | null
}

interface MissionCardProps {
  mission: Mission
  userMission?: UserMission
  onAccept?: (mission: Mission) => void
  onStatusChange?: (userMission: UserMission, status: UserMission["status"]) => void
  showProgress?: boolean
}

export function MissionCard({ 
  mission, 
  userMission, 
  onAccept, 
  onStatusChange, 
  showProgress = true 
}: MissionCardProps) {
  const [progress, setProgress] = useState<MissionProgress | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (showProgress) {
      loadMissionProgress()
    }
  }, [mission.id, showProgress])

  const loadMissionProgress = async () => {
    setLoading(true)
    try {
      // Get mission progress from task_executions
      const { data: taskData, error: taskError } = await supabase
        .from('task_executions')
        .select('status, mission_id')
        .eq('mission_id', mission.id)

      if (taskError) {
        console.error('Failed to load mission progress:', taskError)
        return
      }

      // Get participant count
      const { data: participantData, error: participantError } = await supabase
        .from('user_missions')
        .select('user_id')
        .eq('mission_id', mission.id)
        .in('status', ['accepted', 'in_progress', 'completed'])

      if (participantError) {
        console.error('Failed to load participants:', participantError)
        return
      }

      // Calculate progress
      const totalTasks = taskData?.length || 0
      const completedTasks = taskData?.filter(t => t.status === 'completed').length || 0
      const inProgressTasks = taskData?.filter(t => t.status === 'running').length || 0
      const failedTasks = taskData?.filter(t => t.status === 'failed').length || 0
      const totalParticipants = new Set(participantData?.map(p => p.user_id) || []).size
      const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

      // Estimate completion time
      let estimatedCompletion = null
      if (mission.ends_at && completionRate > 0) {
        const endDate = new Date(mission.ends_at)
        const now = new Date()
        const timeRemaining = endDate.getTime() - now.getTime()
        const estimatedTime = timeRemaining / (completionRate / 100)
        estimatedCompletion = new Date(now.getTime() + estimatedTime).toLocaleDateString()
      }

      setProgress({
        mission_id: mission.id,
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        in_progress_tasks: inProgressTasks,
        failed_tasks: failedTasks,
        total_participants: totalParticipants,
        completion_rate: completionRate,
        estimated_completion: estimatedCompletion
      })
    } catch (error) {
      console.error('Error loading mission progress:', error)
    }
    setLoading(false)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-600'
      case 'medium': return 'bg-yellow-600'
      case 'hard': return 'bg-orange-600'
      case 'legendary': return 'bg-purple-600'
      default: return 'bg-slate-600'
    }
  }

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🟢'
      case 'medium': return '🟡'
      case 'hard': return '🟠'
      case 'legendary': return '🟣'
      default: return '⚪'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-600'
      case 'in_progress': return 'bg-blue-600'
      case 'failed': return 'bg-red-600'
      case 'abandoned': return 'bg-gray-600'
      default: return 'bg-slate-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4" />
      case 'in_progress': return <PlayCircle className="w-4 h-4" />
      case 'failed': return <AlertTriangle className="w-4 h-4" />
      case 'abandoned': return <AlertTriangle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  return (
    <Card className="dedsec-border bg-slate-950/80">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>{getDifficultyIcon(mission.difficulty)}</span>
            <span>{mission.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getDifficultyColor(mission.difficulty)}>
              {mission.difficulty}
            </Badge>
            {userMission && (
              <Badge className={getStatusColor(userMission.status)}>
                <div className="flex items-center gap-1">
                  {getStatusIcon(userMission.status)}
                  {userMission.status}
                </div>
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription className="text-cyan-300">
          {mission.code}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-cyan-300 text-sm leading-relaxed">{mission.description}</p>
        
        {/* Mission Progress */}
        {showProgress && progress && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Mission Progress
              </h4>
              <span className="text-xs text-cyan-300">
                {progress.completion_rate.toFixed(1)}% Complete
              </span>
            </div>
            
            <Progress 
              value={progress.completion_rate} 
              className="h-2 bg-slate-800"
            />
            
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <Target className="w-3 h-3 text-green-400" />
                <span className="text-cyan-300">
                  {progress.completed_tasks}/{progress.total_tasks} Tasks
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-3 h-3 text-blue-400" />
                <span className="text-cyan-300">
                  {progress.total_participants} Participants
                </span>
              </div>
            </div>
            
            {progress.estimated_completion && (
              <div className="flex items-center gap-2 text-xs text-cyan-300">
                <Clock className="w-3 h-3" />
                <span>Est. Completion: {progress.estimated_completion}</span>
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {(mission.tags || []).map((tag) => (
            <span key={tag} className="px-2 py-1 text-xs border border-blue-400/40 rounded">
              #{tag}
            </span>
          ))}
        </div>

        {/* Mission Timeline */}
        <div className="text-xs text-cyan-300 space-y-1">
          {mission.starts_at && (
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3" />
              <span>Starts: {new Date(mission.starts_at).toLocaleString()}</span>
            </div>
          )}
          {mission.ends_at && (
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>Ends: {new Date(mission.ends_at).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-cyan-300">
            {userMission?.started_at && (
              <span>Started: {new Date(userMission.started_at).toLocaleDateString()}</span>
            )}
            {userMission?.completed_at && (
              <span>Completed: {new Date(userMission.completed_at).toLocaleDateString()}</span>
            )}
          </div>
          
          <div className="flex gap-2">
            {!userMission && onAccept && (
              <Button 
                onClick={() => onAccept(mission)} 
                className="dedsec-button"
                size="sm"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Accept
              </Button>
            )}
            
            {userMission && onStatusChange && (
              <>
                {userMission.status === "accepted" && (
                  <Button 
                    size="sm" 
                    onClick={() => onStatusChange(userMission, "in_progress")}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    Start
                  </Button>
                )}
                {userMission.status === "in_progress" && (
                  <Button 
                    size="sm" 
                    className="bg-green-600 hover:bg-green-500" 
                    onClick={() => onStatusChange(userMission, "completed")}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Complete
                  </Button>
                )}
                {userMission.status !== "completed" && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-red-500 text-red-400" 
                    onClick={() => onStatusChange(userMission, "abandoned")}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    Abandon
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MissionCard
