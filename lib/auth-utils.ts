import { createClient } from "./supabase/client"
import { getSessionManager } from "./session-manager"

// Use ES6 import for speakeasy v2.0.0
import * as speakeasy from 'speakeasy'
import * as QRCode from 'qrcode'

export interface User2FA {
  id: string
  username: string
  email: string
  profile_picture_url?: string
  two_factor_enabled: boolean
  is_admin: boolean
}

export interface AuthResponse {
  success: boolean
  user?: User2FA
  error?: string
  requires_2fa?: boolean
}

export class AuthManager {
  private supabase = createClient()
  private sessionManager = getSessionManager()

  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user) {
        // Check if user has 2FA enabled
        const { data: userData, error: userError } = await this.supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .single()

        if (userError) {
          return { success: false, error: "Failed to fetch user data" }
        }

        if (userData.two_factor_enabled) {
          return { success: false, requires_2fa: true }
        }

        return {
          success: true,
          user: {
            id: userData.id,
            username: userData.username,
            email: userData.email || data.user.email || "",
            profile_picture_url: userData.profile_picture_url,
            two_factor_enabled: userData.two_factor_enabled,
            is_admin: userData.is_admin,
          },
        }
      }

      return { success: false, error: "Authentication failed" }
    } catch (error) {
      return { success: false, error: "Failed to authenticate" }
    }
  }

  async signUpWithEmail(email: string, password: string, userData: any): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: userData,
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      if (data.user) {
        return { success: true }
      }

      return { success: false, error: "Failed to create user" }
    } catch (error) {
      return { success: false, error: "Failed to create user" }
    }
  }

  async signInWithGoogle(): Promise<AuthResponse> {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to initiate Google sign-in" }
    }
  }

  async resetPassword(email: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/auth/forgot-password?type=recovery`,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to send reset email" }
    }
  }

  async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to update password" }
    }
  }

  async signOut(): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.auth.signOut()
      
      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to sign out" }
    }
  }

  async getCurrentUser(): Promise<AuthResponse> {
    try {
      // Use session manager for validated session
      const sessionState = this.sessionManager.getState()
      
      if (!sessionState.isValid || !sessionState.user) {
        return { success: false, error: "No valid session found" }
      }

      const user = sessionState.user

      // Fetch additional user data
      const { data: userData, error: userError } = await this.supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single()

      if (userError) {
        return { success: false, error: "Failed to fetch user data" }
      }

      return {
        success: true,
        user: {
          id: userData.id,
          username: userData.username,
          email: userData.email || user.email || "",
          profile_picture_url: userData.profile_picture_url,
          two_factor_enabled: userData.two_factor_enabled,
          is_admin: userData.is_admin,
        },
      }
    } catch (error) {
      return { success: false, error: "Failed to get current user" }
    }
  }

  async validateSession(): Promise<{ isValid: boolean; error?: string }> {
    try {
      const sessionState = this.sessionManager.getState()
      
      if (sessionState.isLoading) {
        return { isValid: false, error: "Session validation in progress" }
      }

      if (!sessionState.isValid) {
        return { isValid: false, error: sessionState.error || "Invalid session" }
      }

      return { isValid: true }
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : "Session validation failed" 
      }
    }
  }

  async enable2FA(userId: string): Promise<{ success: boolean; secret?: string; qrCode?: string; error?: string }> {
    try {
      console.log('Starting 2FA setup for user:', userId)
      
      // Generate a new secret using speakeasy
      const secret = speakeasy.generateSecret({
        name: `DedSecCompute`,
        issuer: 'DedSecCompute',
        length: 32, // Standard length
        symbols: false // Ensure no special characters that might cause issues
      })

      console.log('Generated secret:', secret.base32)

      if (!secret.base32) {
        return { success: false, error: "Failed to generate 2FA secret" }
      }

      // Generate QR code
      let qrCodeUrl: string
      try {
        qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        })
        console.log('Generated QR code successfully')
      } catch (qrError) {
        console.error('QR code generation error:', qrError)
        return { success: false, error: "Failed to generate QR code" }
      }

      // Store the secret in the database (but don't enable 2FA yet)
      const { error } = await this.supabase
        .from("users")
        .update({ 
          two_factor_secret: secret.base32,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId)

      if (error) {
        console.error('Database update error:', error)
        return { success: false, error: `Database error: ${error.message}` }
      }

      console.log('2FA setup completed successfully')

      return { 
        success: true, 
        secret: secret.base32, 
        qrCode: qrCodeUrl 
      }
    } catch (error) {
      console.error('2FA setup error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to setup 2FA" 
      }
    }
  }

  async verify2FA(userId: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the user's 2FA secret
      const { data: userData, error: userError } = await this.supabase
        .from("users")
        .select("two_factor_secret")
        .eq("id", userId)
        .single()

      if (userError) {
        console.error("Database error fetching 2FA secret:", userError)
        return { success: false, error: "Database error: " + userError.message }
      }

      if (!userData || !userData.two_factor_secret) {
        return { success: false, error: "2FA not configured. Please set up 2FA first." }
      }

      // Clean the token (remove spaces, etc.)
      const cleanToken = token.replace(/\s/g, '')

      // Validate the secret format
      if (!userData.two_factor_secret || userData.two_factor_secret.length < 16) {
        return { success: false, error: "Invalid 2FA secret format. Please set up 2FA again." }
      }

      // Verify the token using speakeasy v2.0.0 API
      let verified = false
      try {
        // Ensure proper secret formatting for v2.0.0
        const secret = userData.two_factor_secret.trim().toUpperCase()
        
        // Try different approaches for v2.0.0 compatibility
        try {
          // First try with explicit encoding
          verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: cleanToken,
            window: 2,
            time: Math.floor(Date.now() / 1000)
          })
        } catch (innerError) {
          console.log('First verification attempt failed, trying alternative approach:', innerError)
          
          // Alternative approach: try without explicit time
          verified = speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: cleanToken,
            window: 2
          })
        }
      } catch (verifyError) {
        console.error('Speakeasy verification error:', verifyError)
        return { success: false, error: "2FA verification failed. Please try again or contact support." }
      }

      if (!verified) {
        return { success: false, error: "Invalid verification code. Please check your authenticator app and try again." }
      }

      // Enable 2FA and generate backup codes
      const backupCodes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      )

      const { error: updateError } = await this.supabase
        .from("users")
        .update({ 
          two_factor_enabled: true,
          backup_codes: backupCodes,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId)

      if (updateError) {
        console.error("Database error updating 2FA status:", updateError)
        return { success: false, error: "Database error: " + updateError.message }
      }

      return { success: true }
    } catch (error) {
      console.error("2FA verification error:", error)
      return { success: false, error: "Failed to verify 2FA code: " + (error as Error).message }
    }
  }

  async disable2FA(userId: string): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase
        .from("users")
        .update({ 
          two_factor_enabled: false,
          two_factor_secret: null,
          backup_codes: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to disable 2FA" }
    }
  }
}

export const authManager = new AuthManager()
