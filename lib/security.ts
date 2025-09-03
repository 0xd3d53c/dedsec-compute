// Client-side compromise heuristics for web context
// Note: True root/jailbreak detection requires native OS APIs. These checks are best-effort.

export interface CompromiseReport {
  isSuspected: boolean
  reasons: string[]
}

export function detectCompromise(): CompromiseReport {
  const reasons: string[] = []

  // Insecure context
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    reasons.push('Insecure context (no HTTPS)')
  }

  // Headless / automation
  if (typeof navigator !== 'undefined' && (navigator as any).webdriver) {
    reasons.push('Automation detected (webdriver)')
  }

  // DevTools opened heuristic
  try {
    const threshold = 160
    const widthThreshold = window.outerWidth - window.innerWidth > threshold
    const heightThreshold = window.outerHeight - window.innerHeight > threshold
    if (widthThreshold || heightThreshold) {
      reasons.push('DevTools likely open')
    }
  } catch {}

  // Tampered userAgent typical flags
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  if (/HeadlessChrome|PhantomJS|node\.js|jsdom/i.test(ua)) {
    reasons.push('Headless environment detected')
  }

  return {
    isSuspected: reasons.length > 0,
    reasons,
  }
}


