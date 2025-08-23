import Link from "next/link"
import { Shield, Users, Zap, Eye, Cpu, Network, Lock, Globe, Terminal, Code, Database } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-blue-400 matrix-bg">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {/* Header */}
        <header className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-500 text-white mb-4 sm:mb-6">
            <Shield className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold mb-3 sm:mb-4 dedsec-glow text-blue-400">
            DedSecCompute
          </h1>
          <p className="text-lg sm:text-xl text-cyan-300 mb-3 sm:mb-4">Distributed Computing Network</p>
          <p className="text-base sm:text-lg text-blue-300 font-mono italic">"Power to the Collective"</p>
        </header>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          {/* Welcome Message */}
          <div className="dedsec-border rounded-lg p-4 sm:p-8 mb-6 sm:mb-8 bg-slate-950/50">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-blue-400">
              {">"} Welcome to the Collective
            </h2>
            <p className="text-sm sm:text-base text-cyan-300 mb-4 sm:mb-6 leading-relaxed">
              Join a distributed computing network where your device contributes to meaningful operations. Every
              follower strengthens the collective, unlocking more powerful capabilities. Together, we harness the power
              of distributed computing to tackle complex mathematical problems, data analysis, and cryptographic
              challenges.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="text-center p-4 border border-blue-400/30 rounded-lg">
                <Users className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-blue-400" />
                <h3 className="font-bold mb-2 text-sm sm:text-base text-blue-400">Join the Network</h3>
                <p className="text-xs sm:text-sm text-cyan-300">
                  Become a follower and contribute your computing power to the collective
                </p>
              </div>
              <div className="text-center p-4 border border-blue-400/30 rounded-lg">
                <Zap className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-orange-400" />
                <h3 className="font-bold mb-2 text-sm sm:text-base text-orange-400">Real Computing</h3>
                <p className="text-xs sm:text-sm text-cyan-300">
                  Perform actual mathematical operations, prime searches, and data processing
                </p>
              </div>
              <div className="text-center p-4 border border-blue-400/30 rounded-lg">
                <Eye className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-cyan-400" />
                <h3 className="font-bold mb-2 text-sm sm:text-base text-cyan-400">Full Transparency</h3>
                <p className="text-xs sm:text-sm text-cyan-300">
                  Monitor your contribution and network activity in real-time with complete visibility
                </p>
              </div>
            </div>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 mb-6 sm:mb-8">
            {/* Security & Privacy */}
            <div className="dedsec-border rounded-lg p-4 sm:p-6 bg-slate-950/30">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                <h3 className="text-lg sm:text-xl font-bold text-blue-400">Security First</h3>
              </div>
              <ul className="space-y-1 sm:space-y-2 text-cyan-300 text-xs sm:text-sm">
                <li>• Cryptographically signed and verified tasks only</li>
                <li>• No arbitrary code execution on your device</li>
                <li>• Anonymous device capabilities sharing</li>
                <li>• Explicit consent required for all operations</li>
                <li>• Auto-pause on low battery or overheating</li>
              </ul>
            </div>

            {/* Network Power */}
            <div className="dedsec-border rounded-lg p-4 sm:p-6 bg-slate-950/30">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <Network className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
                <h3 className="text-lg sm:text-xl font-bold text-orange-400">Collective Power</h3>
              </div>
              <ul className="space-y-1 sm:space-y-2 text-cyan-300 text-xs sm:text-sm">
                <li>• Real-time hardware detection and monitoring</li>
                <li>• Intelligent resource allocation and load balancing</li>
                <li>• Background processing with safety controls</li>
                <li>• Operations unlock based on network compute thresholds</li>
                <li>• Live network statistics and performance metrics</li>
              </ul>
            </div>

            {/* Hardware Support */}
            <div className="dedsec-border rounded-lg p-4 sm:p-6 bg-slate-950/30">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <Cpu className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                <h3 className="text-lg sm:text-xl font-bold text-cyan-400">Hardware Detection</h3>
              </div>
              <ul className="space-y-1 sm:space-y-2 text-cyan-300 text-xs sm:text-sm">
                <li>• ARM64, ARM, x86, and x86_64 architecture support</li>
                <li>• Real-time CPU core and RAM detection</li>
                <li>• Android device optimization and monitoring</li>
                <li>• Configurable resource contribution limits</li>
                <li>• Temperature and battery level monitoring</li>
              </ul>
            </div>

            {/* Social Features */}
            <div className="dedsec-border rounded-lg p-4 sm:p-6 bg-slate-950/30">
              <div className="flex items-center gap-3 mb-3 sm:mb-4">
                <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                <h3 className="text-lg sm:text-xl font-bold text-blue-400">Social Network</h3>
              </div>
              <ul className="space-y-1 sm:space-y-2 text-cyan-300 text-xs sm:text-sm">
                <li>• Unique invite codes starting with "d3d_"</li>
                <li>• QR code generation for easy sharing</li>
                <li>• Follower system and leaderboards</li>
                <li>• Achievement system and contribution tracking</li>
                <li>• Real-time network activity monitoring</li>
              </ul>
            </div>
          </div>

          {/* Technical Capabilities */}
          <div className="dedsec-border rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 bg-slate-950/30">
            <div className="flex items-center gap-3 mb-4">
              <Terminal className="w-6 h-6 text-blue-400" />
              <h3 className="text-xl font-bold text-blue-400">Technical Capabilities</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 border border-blue-400/20 rounded">
                <Code className="w-5 h-5 text-cyan-400" />
                <div>
                  <h4 className="font-bold text-cyan-400 text-sm">Real-time Processing</h4>
                  <p className="text-xs text-cyan-300">Live mathematical computations</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border border-blue-400/20 rounded">
                <Database className="w-5 h-5 text-orange-400" />
                <div>
                  <h4 className="font-bold text-orange-400 text-sm">Distributed Storage</h4>
                  <p className="text-xs text-cyan-300">Secure data distribution</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border border-blue-400/20 rounded">
                <Shield className="w-5 h-5 text-blue-400" />
                <div>
                  <h4 className="font-bold text-blue-400 text-sm">Cryptographic Security</h4>
                  <p className="text-xs text-cyan-300">End-to-end encryption</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8">
            <Link
              href="/auth/login"
              className="dedsec-button px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-center font-bold text-base sm:text-lg hover:scale-105 transition-transform"
            >
              {">"} Access Network
            </Link>
            <Link
              href="/auth/signup"
              className="dedsec-button px-6 sm:px-8 py-3 sm:py-4 rounded-lg text-center font-bold text-base sm:text-lg hover:scale-105 transition-transform"
            >
              {">"} Join Collective
            </Link>
          </div>

          {/* Admin Access */}
          <div className="text-center mb-8">
            <Link
              href="/admin"
              className="text-orange-400 hover:text-orange-300 text-xs sm:text-sm underline opacity-50 hover:opacity-100 transition-opacity"
            >
              Admin Access
            </Link>
          </div>
        </div>

        {/* Enhanced Footer */}
        <footer className="text-center mt-12 sm:mt-16 border-t border-blue-400/30 pt-6 sm:pt-8">
          <div className="mb-4 sm:mb-6">
            <p className="text-blue-400 font-bold text-lg sm:text-xl font-mono mb-2">"We are DedSec. We are Legion."</p>
            <p className="text-cyan-400 text-sm sm:text-base italic mb-2">
              "Information wants to be free. Computing power should be shared."
            </p>
            <p className="text-blue-300 text-xs sm:text-sm font-mono">
              "The network is our weapon. The collective is our strength."
            </p>
          </div>

          <div className="text-blue-300 text-xs sm:text-sm space-y-1 mb-4">
            <p>DedSecCompute v2.0 | Consent-based distributed computing</p>
            <p>All operations are cryptographically signed and verified</p>
            <p className="font-mono text-xs">
              {">"} Power to the people. Power to the collective. {"<"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs text-slate-400 mb-4">
            <p>🔒 Zero-trust security model</p>
            <p>⚡ Real-time resource monitoring</p>
            <p>🌐 Global distributed network</p>
          </div>

          <div className="text-xs text-slate-500 border-t border-blue-400/20 pt-4">
            <p>© 2024 DedSec Collective | Distributed under the People's License</p>
            <p className="font-mono mt-1">"Hack the planet. Share the power."</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
