import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy & Compliance | DedSecCompute",
}

export default function PolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-blue-400">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-3xl font-bold dedsec-glow text-blue-400 mb-4">Privacy & Compliance</h1>
        <p className="text-cyan-300 mb-6">
          We adhere to GDPR and CCPA. This page summarizes how we collect, process, and protect your data.
        </p>

        <section className="space-y-2 mb-6">
          <h2 className="text-xl text-blue-400 font-semibold">Data We Process</h2>
          <ul className="list-disc list-inside text-cyan-300 text-sm">
            <li>Account identifiers (username, email).</li>
            <li>Operational telemetry necessary for distributed computing (aggregate, pseudonymous).</li>
            <li>Mission participation and progress; audit logs for security.</li>
            <li>Explicit consent records for optional compute features.</li>
          </ul>
        </section>

        <section className="space-y-2 mb-6">
          <h2 className="text-xl text-blue-400 font-semibold">Your Rights</h2>
          <ul className="list-disc list-inside text-cyan-300 text-sm">
            <li>Access, rectification, deletion, restriction, portability (GDPR Articles 15–20).</li>
            <li>Opt-out of sale/share (CCPA). We do not sell personal data.</li>
            <li>Withdraw consent at any time. Compute stops immediately upon revocation.</li>
          </ul>
        </section>

        <section className="space-y-2 mb-6">
          <h2 className="text-xl text-blue-400 font-semibold">Security Controls</h2>
          <ul className="list-disc list-inside text-cyan-300 text-sm">
            <li>TLS 1.3 enforced; strong CSP and HSTS.</li>
            <li>RLS at the database layer; MFA available; RBAC for admin functions.</li>
            <li>Client-side encryption for sensitive cache using AES-GCM.</li>
          </ul>
        </section>

        <section className="space-y-2 mb-6">
          <h2 className="text-xl text-blue-400 font-semibold">Contact</h2>
          <p className="text-cyan-300 text-sm">For requests: privacy@dedseccompute.local</p>
        </section>
      </div>
    </div>
  )
}


