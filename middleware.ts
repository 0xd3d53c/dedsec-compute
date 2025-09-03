import { updateSession } from "@/lib/supabase/middleware"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  // Enhanced security headers for all routes
  const response = await updateSession(request)
  
  // Add enterprise-grade security headers
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-site')
  response.headers.set('Origin-Agent-Cluster', '?1')
  
  // Content Security Policy for XSS protection
  // Allow Next.js development features in dev mode
  const isDev = process.env.NODE_ENV === 'development'
  const csp = [
    "default-src 'self'",
    // Allow unsafe-inline scripts even in production to prevent inline script errors
    "script-src 'self' 'unsafe-inline' blob: https://cdn.jsdelivr.net",
    "worker-src 'self' blob:",
    "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co${isDev ? " ws://localhost:*" : ""}`,
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ')

  response.headers.set('Content-Security-Policy', csp)

  const clientIP = request.ip || request.headers.get('x-forwarded-for') || 'unknown'
  response.headers.set('X-Client-IP', clientIP)

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}
