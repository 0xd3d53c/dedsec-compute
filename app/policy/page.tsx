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
          DedSecCompute is committed to protecting your privacy and ensuring full transparency
          in how we handle data. We operate under internationally recognized frameworks such
          as the General Data Protection Regulation (GDPR) and the California Consumer Privacy
          Act (CCPA). This page outlines in detail what information we process, how we use it,
          and the measures we take to keep it secure.
        </p>

        {/* Data We Process */}
        <section className="space-y-3 mb-8">
          <h2 className="text-xl text-blue-400 font-semibold">Data We Process</h2>
          <p className="text-cyan-300 text-sm">
            We only collect the minimum data required to operate our distributed computing
            platform securely and efficiently. This includes:
          </p>
          <ul className="list-disc list-inside text-cyan-300 text-sm space-y-1">
            <li><strong>Account identifiers:</strong> Basic details like username and email are stored for login and communication purposes.</li>
            <li><strong>Operational telemetry:</strong> Pseudonymous, aggregated data that ensures tasks are allocated, balanced, and monitored properly.</li>
            <li><strong>Mission participation:</strong> Records of progress and contributions, including security-related audit logs, to ensure accountability.</li>
            <li><strong>Consent records:</strong> Explicit opt-ins for advanced compute features or experimental functionality.</li>
            <li><strong>Support interactions:</strong> Communications with our team (emails or tickets) may be retained for troubleshooting and compliance.</li>
          </ul>
        </section>

        {/* How We Use Data */}
        <section className="space-y-3 mb-8">
          <h2 className="text-xl text-blue-400 font-semibold">How We Use Your Data</h2>
          <ul className="list-disc list-inside text-cyan-300 text-sm space-y-1">
            <li>To authenticate accounts and manage user sessions.</li>
            <li>To coordinate distributed compute missions and ensure fair resource use.</li>
            <li>To maintain security, detect abuse, and enforce platform policies.</li>
            <li>To provide user support and resolve technical issues.</li>
            <li>To meet legal or regulatory obligations where applicable.</li>
          </ul>
        </section>

        {/* Your Rights */}
        <section className="space-y-3 mb-8">
          <h2 className="text-xl text-blue-400 font-semibold">Your Rights</h2>
          <p className="text-cyan-300 text-sm">
            We recognize and respect your privacy rights under applicable laws:
          </p>
          <ul className="list-disc list-inside text-cyan-300 text-sm space-y-1">
            <li><strong>GDPR (Articles 15–20):</strong> You may request access, correction, deletion, restriction, or portability of your data.</li>
            <li><strong>CCPA:</strong> You have the right to opt out of any sale or sharing of your data. DedSecCompute does not sell personal data.</li>
            <li><strong>Consent withdrawal:</strong> You can revoke your consent at any time. Participation in compute tasks halts immediately when revoked.</li>
            <li><strong>Transparency:</strong> You can ask for details on how your data is processed, including retention periods and safeguards.</li>
          </ul>
        </section>

        {/* Security Controls */}
        <section className="space-y-3 mb-8">
          <h2 className="text-xl text-blue-400 font-semibold">Security Controls</h2>
          <p className="text-cyan-300 text-sm">
            Security is fundamental to our mission. We use modern best practices and
            cryptographic safeguards to keep your information safe:
          </p>
          <ul className="list-disc list-inside text-cyan-300 text-sm space-y-1">
            <li><strong>Encryption in transit:</strong> All traffic is protected with TLS 1.3, strict Content Security Policy (CSP), and HSTS.</li>
            <li><strong>Database protections:</strong> Row-Level Security (RLS) prevents unauthorized access to records.</li>
            <li><strong>Authentication:</strong> Multi-Factor Authentication (MFA) is supported; admin functions require RBAC enforcement.</li>
            <li><strong>Client-side security:</strong> Sensitive cached data is encrypted using AES-GCM before leaving your device.</li>
            <li><strong>Auditing:</strong> Continuous monitoring and audit logs help detect anomalies or misuse in real time.</li>
          </ul>
        </section>

        {/* Data Retention */}
        <section className="space-y-3 mb-8">
          <h2 className="text-xl text-blue-400 font-semibold">Data Retention</h2>
          <p className="text-cyan-300 text-sm">
            We retain personal data only for as long as it is necessary to fulfill the
            purposes described in this policy or to meet legal obligations. When data is no
            longer required, it is securely deleted or anonymized.
          </p>
        </section>

        {/* Third Parties */}
        <section className="space-y-3 mb-8">
          <h2 className="text-xl text-blue-400 font-semibold">Third-Party Services</h2>
          <p className="text-cyan-300 text-sm">
            DedSecCompute may use trusted third-party providers (such as cloud hosting or
            security monitoring services). These providers are contractually bound to follow
            strict confidentiality and data protection obligations consistent with GDPR and CCPA.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-3 mb-6">
          <h2 className="text-xl text-blue-400 font-semibold">Contact</h2>
          <p className="text-cyan-300 text-sm">
            If you have any privacy concerns, wish to exercise your rights, or need further
            information about this policy, you may contact us at:
          </p>
          <p className="text-cyan-300 text-sm font-mono">privacy@dedseccompute.local</p>
        </section>
      </div>
    </div>
  )
}
