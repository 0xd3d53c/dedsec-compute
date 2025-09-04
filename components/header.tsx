"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Shield, LogOut, Settings, User, Menu, X } from "lucide-react"
import { getAvatarFallback } from "@/lib/profile-utils"
import { useSession } from "@/hooks/useSession"

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const [userProfile, setUserProfile] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, isValid, isLoading, signOut } = useSession()
  const supabase = createClient()

  useEffect(() => {
    const loadUserProfile = async () => {
      if (user && isValid) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()
        setUserProfile(profile)
      } else {
        setUserProfile(null)
      }
    }
    loadUserProfile()

    // Set up real-time subscription for profile updates
    if (user && isValid) {
      const channel = supabase
        .channel('profile-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'users',
            filter: `id=eq.${user.id}`
          },
          (payload) => {
            console.log('Profile updated:', payload.new)
            setUserProfile(payload.new as any)
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    }
  }, [user, isValid])

  const handleLogout = async () => {
    const result = await signOut()
    if (!result.error) {
      router.push("/")
    }
  }

  const isAuthPage = pathname.startsWith("/auth")
  const isPublicPage = pathname === "/" || isAuthPage

  // Show loading state
  if (isLoading) {
    return (
      <header className="bg-slate-950/90 border-b border-blue-400/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="h-8 w-8 bg-slate-700 rounded animate-pulse"></div>
          </div>
        </div>
      </header>
    )
  }

  // Redirect to login if not authenticated and not on public page
  if (!isPublicPage && (!user || !isValid)) {
    router.push("/auth/login")
    return null
  }

  if (isPublicPage) {
    return (
      <header className="bg-slate-950/90 border-b border-blue-400/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold dedsec-glow text-blue-400">DedSecCompute</h1>
                <p className="text-sm text-cyan-300">Distributed Computing Collective</p>
              </div>
            </div>
            
            {!isAuthPage && (
              <Button 
                onClick={() => router.push("/auth/login")} 
                className="dedsec-button"
              >
                Join Network
              </Button>
            )}
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-slate-950/90 border-b border-blue-400/30 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold dedsec-glow text-blue-400">DedSecCompute</h1>
              <p className="text-sm text-cyan-300">Distributed Computing Collective</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            <nav className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => router.push("/dashboard")}
                className={`text-cyan-300 hover:text-blue-400 ${pathname === "/dashboard" ? "text-blue-400" : ""}`}
              >
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => router.push("/missions")}
                className={`text-cyan-300 hover:text-blue-400 ${pathname === "/missions" ? "text-blue-400" : ""}`}
              >
                Missions
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => router.push("/profile")}
                className={`text-cyan-300 hover:text-blue-400 ${pathname === "/profile" ? "text-blue-400" : ""}`}
              >
                Profile
              </Button>
            </nav>

            {/* User Profile Section */}
            {userProfile && (
              <div className="flex items-center gap-3 bg-slate-900/50 rounded-lg px-3 py-2 border border-blue-400/30">
                <div className="flex items-center gap-2">
                  {userProfile?.profile_picture_url ? (
                    <img
                      src={userProfile.profile_picture_url}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover border border-blue-400/50"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                      {getAvatarFallback(userProfile?.username)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-blue-400">
                      {userProfile?.username || "User"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            
            <Button onClick={handleLogout} className="dedsec-button text-sm px-3">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-cyan-300 hover:text-blue-400"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-blue-400/30 pt-4">
            <nav className="flex flex-col gap-2">
              <Button 
                variant="ghost" 
                onClick={() => {
                  router.push("/dashboard")
                  setIsMenuOpen(false)
                }}
                className={`text-cyan-300 hover:text-blue-400 justify-start ${pathname === "/dashboard" ? "text-blue-400" : ""}`}
              >
                Dashboard
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => {
                  router.push("/missions")
                  setIsMenuOpen(false)
                }}
                className={`text-cyan-300 hover:text-blue-400 justify-start ${pathname === "/missions" ? "text-blue-400" : ""}`}
              >
                Missions
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => {
                  router.push("/profile")
                  setIsMenuOpen(false)
                }}
                className={`text-cyan-300 hover:text-blue-400 justify-start ${pathname === "/profile" ? "text-blue-400" : ""}`}
              >
                Profile
              </Button>
              
              <div className="pt-2 border-t border-blue-400/30 mt-2">
                <Button onClick={handleLogout} className="dedsec-button w-full">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
