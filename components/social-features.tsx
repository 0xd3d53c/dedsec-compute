"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, UserPlus, Trophy, Star, Search, Crown, Medal, Award } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface UserProfile {
  id: string
  username: string
  display_name: string
  profile_picture_url?: string
  total_operations?: number
  contribution_score?: number
  rank?: number
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  points: number
  earned_at?: string
}

interface LeaderboardEntry {
  user: UserProfile
  total_operations: number
  contribution_score: number
  rank: number
}

interface SocialFeaturesProps {
  currentUserId: string
}

export function SocialFeatures({ currentUserId }: SocialFeaturesProps) {
  const [followers, setFollowers] = useState<UserProfile[]>([])
  const [following, setFollowing] = useState<UserProfile[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const supabase = createClient()

  useEffect(() => {
    loadSocialData()

    // Set up real-time subscriptions
    const followersSubscription = supabase
      .channel("followers")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "followers",
          filter: `following_id=eq.${currentUserId}`,
        },
        () => {
          loadFollowers()
        },
      )
      .subscribe()

    const achievementsSubscription = supabase
      .channel("user_achievements")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_achievements",
          filter: `user_id=eq.${currentUserId}`,
        },
        () => {
          loadAchievements()
        },
      )
      .subscribe()

    return () => {
      followersSubscription.unsubscribe()
      achievementsSubscription.unsubscribe()
    }
  }, [currentUserId])

  const loadSocialData = async () => {
    await Promise.all([loadFollowers(), loadFollowing(), loadLeaderboard(), loadAchievements()])
    setIsLoading(false)
  }

  const loadFollowers = async () => {
    try {
      const { data, error } = await supabase
        .from("followers")
        .select(
          `
          follower_id,
          users!followers_follower_id_fkey (
            id, username, display_name, profile_picture_url
          )
        `,
        )
        .eq("following_id", currentUserId)

      if (error) throw error

      const followerProfiles = data.map((item: any) => item.users).filter(Boolean)
      setFollowers(followerProfiles)
    } catch (error) {
      console.error("[v0] Error loading followers:", error)
    }
  }

  const loadFollowing = async () => {
    try {
      const { data, error } = await supabase
        .from("followers")
        .select(
          `
          following_id,
          users!followers_following_id_fkey (
            id, username, display_name, profile_picture_url
          )
        `,
        )
        .eq("follower_id", currentUserId)

      if (error) throw error

      const followingProfiles = data.map((item: any) => item.users).filter(Boolean)
      setFollowing(followingProfiles)
    } catch (error) {
      console.error("[v0] Error loading following:", error)
    }
  }

  const loadLeaderboard = async () => {
    try {
      // Get top users by contribution score
      const { data, error } = await supabase
        .from("users")
        .select("id, username, display_name, profile_picture_url")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error

      // Calculate scores and ranks (simplified for demo)
      const leaderboardData: LeaderboardEntry[] = data.map((user, index) => ({
        user,
        total_operations: Math.floor(Math.random() * 10000) + 1000,
        contribution_score: Math.floor(Math.random() * 5000) + 500,
        rank: index + 1,
      }))

      // Sort by contribution score
      leaderboardData.sort((a, b) => b.contribution_score - a.contribution_score)
      leaderboardData.forEach((entry, index) => {
        entry.rank = index + 1
      })

      setLeaderboard(leaderboardData)
    } catch (error) {
      console.error("[v0] Error loading leaderboard:", error)
    }
  }

  const loadAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from("user_achievements")
        .select(
          `
          earned_at,
          achievements (
            id, name, description, icon, points
          )
        `,
        )
        .eq("user_id", currentUserId)

      if (error) throw error

      const userAchievements = data.map((item: any) => ({
        ...item.achievements,
        earned_at: item.earned_at,
      }))

      setAchievements(userAchievements)
    } catch (error) {
      console.error("[v0] Error loading achievements:", error)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, display_name, profile_picture_url")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq("id", currentUserId)
        .eq("is_active", true)
        .limit(10)

      if (error) throw error

      setSearchResults(data || [])
    } catch (error) {
      console.error("[v0] Error searching users:", error)
    }
  }

  const followUser = async (userId: string) => {
    try {
      const { error } = await supabase.from("followers").insert({
        follower_id: currentUserId,
        following_id: userId,
      })

      if (error) throw error

      // Refresh following list
      loadFollowing()
    } catch (error) {
      console.error("[v0] Error following user:", error)
    }
  }

  const unfollowUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", userId)

      if (error) throw error

      // Refresh following list
      loadFollowing()
    } catch (error) {
      console.error("[v0] Error unfollowing user:", error)
    }
  }

  const isFollowing = (userId: string) => {
    return following.some((user) => user.id === userId)
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-400" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <Trophy className="h-4 w-4 text-slate-400" />
    }
  }

  const getAchievementIcon = (iconName: string) => {
    switch (iconName) {
      case "cpu":
        return "🖥️"
      case "zap":
        return "⚡"
      case "users":
        return "👥"
      case "target":
        return "🎯"
      case "clock":
        return "⏰"
      default:
        return "🏆"
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-100">
            <Users className="h-5 w-5 animate-spin" />
            Loading Social Features...
          </CardTitle>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="leaderboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/50">
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="social">Social</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Trophy className="h-5 w-5" />
                Top Contributors
              </CardTitle>
              <CardDescription className="text-slate-400">
                Leading users by contribution score and computing power
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboard.map((entry) => (
                  <div
                    key={entry.user.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {getRankIcon(entry.rank)}
                      <span className="text-slate-300 font-mono">#{entry.rank}</span>
                    </div>

                    <Avatar className="h-10 w-10">
                      <AvatarImage src={entry.user.profile_picture_url || "/placeholder.svg"} />
                      <AvatarFallback>{entry.user.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <div className="font-medium text-slate-200">{entry.user.display_name}</div>
                      <div className="text-sm text-slate-400">@{entry.user.username}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-medium text-slate-200">
                        {entry.contribution_score.toLocaleString()} pts
                      </div>
                      <div className="text-xs text-slate-400">{entry.total_operations.toLocaleString()} ops</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="social" className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <Users className="h-5 w-5" />
                  Followers ({followers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {followers.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No followers yet</p>
                  ) : (
                    followers.map((user) => (
                      <div key={user.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profile_picture_url || "/placeholder.svg"} />
                          <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-200">{user.display_name}</div>
                          <div className="text-xs text-slate-400">@{user.username}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-100">
                  <UserPlus className="h-5 w-5" />
                  Following ({following.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {following.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">Not following anyone yet</p>
                  ) : (
                    following.map((user) => (
                      <div key={user.id} className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.profile_picture_url || "/placeholder.svg"} />
                          <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-200">{user.display_name}</div>
                          <div className="text-xs text-slate-400">@{user.username}</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => unfollowUser(user.id)} className="text-xs">
                          Unfollow
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="achievements" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Star className="h-5 w-5" />
                Your Achievements ({achievements.length})
              </CardTitle>
              <CardDescription className="text-slate-400">
                Unlock achievements by contributing to the network
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {achievements.length === 0 ? (
                  <p className="text-slate-400 text-center py-8 col-span-2">
                    No achievements yet. Start contributing to unlock them!
                  </p>
                ) : (
                  achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="flex items-center gap-4 p-4 rounded-lg bg-slate-700/30 border border-slate-600"
                    >
                      <div className="text-2xl">{getAchievementIcon(achievement.icon)}</div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-200">{achievement.name}</div>
                        <div className="text-sm text-slate-400">{achievement.description}</div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {achievement.points} pts
                          </Badge>
                          {achievement.earned_at && (
                            <span className="text-xs text-slate-500">
                              {new Date(achievement.earned_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-100">
                <Search className="h-5 w-5" />
                Find Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search by username or display name..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    searchUsers(e.target.value)
                  }}
                  className="bg-slate-700/50 border-slate-600"
                />
              </div>

              <div className="space-y-3">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.profile_picture_url || "/placeholder.svg"} />
                      <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-slate-200">{user.display_name}</div>
                      <div className="text-sm text-slate-400">@{user.username}</div>
                    </div>
                    <Button
                      size="sm"
                      variant={isFollowing(user.id) ? "outline" : "default"}
                      onClick={() => (isFollowing(user.id) ? unfollowUser(user.id) : followUser(user.id))}
                    >
                      {isFollowing(user.id) ? "Unfollow" : "Follow"}
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
