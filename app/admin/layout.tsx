"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  Shield, 
  Users, 
  Target, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  Activity,
  Database,
  AlertTriangle,
  Crown
} from "lucide-react"
import { useAdminAuth } from "@/hooks/useAdminAuth"
import { toast } from "sonner"

interface AdminLayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  {
    name: "Dashboard",
    href: "/admin/dashboard",
    icon: Activity,
    description: "Network overview and statistics"
  },
  {
    name: "Users",
    href: "/admin/users",
    icon: Users,
    description: "User management and monitoring"
  },
  {
    name: "Missions",
    href: "/admin/missions",
    icon: Target,
    description: "Mission creation and management"
  },
  {
    name: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    description: "Performance analytics and monitoring"
  },
  {
    name: "System",
    href: "/admin/system",
    icon: Database,
    description: "System configuration and health"
  },
  {
    name: "Security",
    href: "/admin/security",
    icon: Shield,
    description: "Security settings and audit logs"
  }
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { adminSession, isLoading: authLoading, hasPermission, logout } = useAdminAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  useEffect(() => {
    if (!authLoading && !adminSession) {
      router.push("/admin")
    }
  }, [adminSession, authLoading, router])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      toast.success("Logged out successfully")
      router.push("/admin")
    } catch (error) {
      console.error("Logout error:", error)
      toast.error("Failed to logout")
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p>Verifying admin privileges...</p>
        </div>
      </div>
    )
  }

  if (!adminSession) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 to-slate-800 border-r border-cyan-400/20 
        transform transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-cyan-400/20">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-cyan-400 text-slate-950">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-cyan-400">Admin Panel</h1>
                <p className="text-xs text-cyan-300">Control Center</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-cyan-400 hover:bg-cyan-400/10"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Admin Info */}
          <div className="p-4 border-b border-cyan-400/20">
            <Card className="bg-slate-800/50 border-cyan-400/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-cyan-400 font-medium text-sm">
                      {adminSession.user.username}
                    </div>
                    <div className="text-cyan-300 text-xs">
                      {adminSession.user.admin_level || "Administrator"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link key={item.name} href={item.href}>
                  <div className={`
                    flex items-center gap-3 p-3 rounded-lg transition-all duration-200 cursor-pointer group
                    ${isActive 
                      ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/25' 
                      : 'text-cyan-400 hover:bg-cyan-400/10 hover:text-cyan-300 hover:shadow-md'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className={`text-xs ${isActive ? 'text-cyan-100' : 'text-cyan-300'}`}>
                        {item.description}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-cyan-400/20">
            <Button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full bg-red-600 hover:bg-red-500 text-white"
            >
              {isLoggingOut ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:ml-64">
        {/* Top Bar */}
        <div className="bg-gradient-to-r from-slate-900/80 to-slate-800/80 border-b border-cyan-400/20 p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-cyan-400 hover:bg-cyan-400/10"
            >
              <Menu className="w-5 h-5" />
            </Button>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-cyan-300">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                System Online
              </div>
              
              <div className="flex items-center gap-2 text-sm text-cyan-300">
                <Shield className="w-4 h-4" />
                Admin Mode
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="p-4 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
