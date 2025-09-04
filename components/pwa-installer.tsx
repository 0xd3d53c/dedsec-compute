"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Download, 
  Smartphone, 
  Monitor, 
  Tablet, 
  CheckCircle, 
  AlertTriangle,
  Info
} from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export default function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [platform, setPlatform] = useState<string>("")
  const [showInstall, setShowInstall] = useState(false)

  useEffect(() => {
    // Check if PWA is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    // Check if PWA installation is supported
    const checkPWASupport = () => {
      const isSupported = 'serviceWorker' in navigator && 'PushManager' in window
      setIsSupported(isSupported)
      
      if (isSupported) {
        // Detect platform
        const userAgent = navigator.userAgent.toLowerCase()
        if (userAgent.includes('android')) {
          setPlatform('Android')
          setShowInstall(true)
        } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
          setPlatform('iOS')
          setShowInstall(true)
        } else if (userAgent.includes('windows')) {
          setPlatform('Windows')
          setShowInstall(true)
        } else if (userAgent.includes('linux')) {
          setPlatform('Linux')
          setShowInstall(true)
        } else if (userAgent.includes('mac')) {
          setPlatform('macOS')
          setShowInstall(true)
        }
      }
    }

    checkPWASupport()

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstall(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstall(false)
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        
        if (outcome === 'accepted') {
          console.log('PWA installation accepted')
          setIsInstalled(true)
          setShowInstall(false)
        } else {
          console.log('PWA installation dismissed')
        }
        
        setDeferredPrompt(null)
      } catch (error) {
        console.error('PWA installation failed:', error)
      }
    }
  }

  const getInstallInstructions = () => {
    switch (platform) {
      case 'Android':
        return {
          title: 'Install on Android',
          description: 'Tap the menu button and select "Add to Home Screen"',
          icon: <Smartphone className="w-6 h-6" />,
          steps: [
            'Open Chrome browser',
            'Tap the menu button (⋮)',
            'Select "Add to Home Screen"',
            'Tap "Add" to install'
          ]
        }
      case 'iOS':
        return {
          title: 'Install on iOS',
          description: 'Use Safari browser and add to home screen',
          icon: <Smartphone className="w-6 h-6" />,
          steps: [
            'Open Safari browser',
            'Tap the share button (□↑)',
            'Select "Add to Home Screen"',
            'Tap "Add" to install'
          ]
        }
      case 'Windows':
        return {
          title: 'Install on Windows',
          description: 'Use Edge browser and install as app',
          icon: <Monitor className="w-6 h-6" />,
          steps: [
            'Open Edge browser',
            'Click the menu button (⋯)',
            'Select "Apps" → "Install this site as an app"',
            'Click "Install"'
          ]
        }
      case 'macOS':
        return {
          title: 'Install on macOS',
          description: 'Use Safari browser and add to dock',
          icon: <Monitor className="w-6 h-6" />,
          steps: [
            'Open Safari browser',
            'Click "File" → "Add to Dock"',
            'Or use the share button and select "Add to Dock"'
          ]
        }
      case 'Linux':
        return {
          title: 'Install on Linux',
          description: 'Use Chrome/Chromium and install as app',
          icon: <Monitor className="w-6 h-6" />,
          steps: [
            'Open Chrome/Chromium browser',
            'Click the menu button (⋮)',
            'Select "More tools" → "Create shortcut"',
            'Check "Open as window" and click "Create"'
          ]
        }
      default:
        return {
          title: 'Install App',
          description: 'Add this app to your device for easy access',
          icon: <Download className="w-6 h-6" />,
          steps: [
            'Use a modern browser (Chrome, Edge, Safari)',
            'Look for the install option in the browser menu',
            'Follow the browser-specific installation steps'
          ]
        }
    }
  }

  if (isInstalled) {
    return (
      <Card className="border-green-400 bg-green-950/20">
        <CardHeader>
          <CardTitle className="text-green-400 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            App Installed
          </CardTitle>
          <CardDescription className="text-green-300">
            DedSec Compute is now installed on your device!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-green-200 text-sm">
            You can now access the app directly from your home screen, dock, or start menu.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!isSupported) {
    return (
      <Card className="border-yellow-400 bg-yellow-950/20">
        <CardHeader>
          <CardTitle className="text-yellow-400 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Installation Not Supported
          </CardTitle>
          <CardDescription className="text-yellow-300">
            Your browser doesn't support PWA installation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-yellow-200 text-sm">
            Try using a modern browser like Chrome, Edge, or Safari to install the app.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!showInstall) {
    return null
  }

  const instructions = getInstallInstructions()

  return (
    <Card className="border-blue-400 bg-blue-950/20">
      <CardHeader>
        <CardTitle className="text-blue-400 flex items-center gap-2">
          {instructions.icon}
          {instructions.title}
        </CardTitle>
        <CardDescription className="text-blue-300">
          {instructions.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-blue-400 text-blue-400">
            {platform}
          </Badge>
          <Badge variant="outline" className="border-cyan-400 text-cyan-400">
            PWA Ready
          </Badge>
        </div>
        
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-blue-300">Installation Steps:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-blue-200">
            {instructions.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>

        {deferredPrompt && (
          <div className="pt-2">
            <Button 
              onClick={handleInstallClick}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Install App Now
            </Button>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 bg-blue-900/30 rounded-lg border border-blue-400/30">
          <Info className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-200">
            <p className="font-medium mb-1">Why Install?</p>
            <ul className="space-y-1">
              <li>• Faster access from your device</li>
              <li>• Works offline for basic features</li>
              <li>• Native app-like experience</li>
              <li>• Better performance and battery life</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
