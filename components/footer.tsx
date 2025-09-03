"use client"

import { useRouter } from "next/navigation"
import { Shield, FileText, Github, Mail } from "lucide-react"

export default function Footer() {
  const router = useRouter()

  return (
    <footer className="bg-slate-950/90 border-t border-blue-400/30 mt-auto">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-500 text-white">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-blue-400">DedSecCompute</h3>
                <p className="text-sm text-cyan-300">Distributed Computing Collective</p>
              </div>
            </div>
            <p className="text-sm text-cyan-300">
              Join the collective and contribute your computing power to solve complex problems.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-blue-400 font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button 
                  onClick={() => router.push("/dashboard")}
                  className="text-cyan-300 hover:text-blue-400 transition-colors"
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button 
                  onClick={() => router.push("/missions")}
                  className="text-cyan-300 hover:text-blue-400 transition-colors"
                >
                  Missions
                </button>
              </li>
              <li>
                <button 
                  onClick={() => router.push("/profile")}
                  className="text-cyan-300 hover:text-blue-400 transition-colors"
                >
                  Profile
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-blue-400 font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button 
                  onClick={() => router.push("/policy")}
                  className="text-cyan-300 hover:text-blue-400 transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Privacy Policy
                </button>
              </li>
              <li>
                <button 
                  onClick={() => router.push("/consent")}
                  className="text-cyan-300 hover:text-blue-400 transition-colors"
                >
                  Consent Management
                </button>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-blue-400 font-semibold">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-cyan-300">
                <Mail className="w-4 h-4" />
                privacy@dedseccompute.local
              </li>
              <li className="flex items-center gap-2 text-cyan-300">
                <Github className="w-4 h-4" />
                GitHub
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-blue-400/30 mt-8 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-cyan-300">
              © {new Date().getFullYear()} DedSec Collective | Distributed under the People's License
              </p>
            <div className="flex items-center gap-4 text-sm text-cyan-300">
              <span>GDPR Compliant</span>
              <span>•</span>
              <span>CCPA Compliant</span>
              <span>•</span>
              <span>Open Source</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
