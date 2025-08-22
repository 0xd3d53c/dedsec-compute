import { createClient } from "./supabase/client"

export interface User2FA {
  id: string
  username: string
  display_name: string
  phone: string
  country_code: string
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

  async signInWithPhone(phone: string, countryCode: string): Promise<AuthResponse> {
    try {
      const fullPhone = `${countryCode}${phone}`

      const { data, error } = await this.supabase.auth.signInWithOtp({
        phone: fullPhone,
        options: {
          shouldCreateUser: false,
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to send OTP" }
    }
  }

  async verifyOTP(phone: string, countryCode: string, token: string): Promise<AuthResponse> {
    try {
      const fullPhone = `${countryCode}${phone}`

      const { data, error } = await this.supabase.auth.verifyOtp({
        phone: fullPhone,
        token,
        type: "sms",
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
            display_name: userData.display_name,
            phone: userData.phone,
            country_code: userData.country_code,
            profile_picture_url: userData.profile_picture_url,
            two_factor_enabled: userData.two_factor_enabled,
            is_admin: userData.is_admin,
          },
        }
      }

      return { success: false, error: "Authentication failed" }
    } catch (error) {
      return { success: false, error: "Failed to verify OTP" }
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
      return { success: false, error: "Failed to sign in with Google" }
    }
  }

  async signUp(username: string, phone: string, countryCode: string, displayName: string): Promise<AuthResponse> {
    try {
      const fullPhone = `${countryCode}${phone}`

      // Generate unique invite code
      const inviteCode = `d3d_${Math.random().toString(36).substring(2, 10).toUpperCase()}`

      const { data, error } = await this.supabase.auth.signUp({
        phone: fullPhone,
        options: {
          data: {
            username,
            display_name: displayName,
            country_code: countryCode,
            invite_code: inviteCode,
          },
        },
      })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to create account" }
    }
  }

  async enable2FA(userId: string): Promise<{ success: boolean; secret?: string; qrCode?: string; error?: string }> {
    try {
      // Generate TOTP secret
      const secret = this.generateTOTPSecret()
      const qrCode = this.generateQRCode(secret, userId)

      // Store secret in database (encrypted in production)
      const { error } = await this.supabase
        .from("users")
        .update({
          two_factor_secret: secret,
          two_factor_enabled: false, // Will be enabled after verification
        })
        .eq("id", userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, secret, qrCode }
    } catch (error) {
      return { success: false, error: "Failed to setup 2FA" }
    }
  }

  async verify2FA(userId: string, token: string): Promise<AuthResponse> {
    try {
      const { data: userData, error } = await this.supabase
        .from("users")
        .select("two_factor_secret")
        .eq("id", userId)
        .single()

      if (error || !userData.two_factor_secret) {
        return { success: false, error: "2FA not configured" }
      }

      const isValid = this.verifyTOTPToken(userData.two_factor_secret, token)

      if (!isValid) {
        return { success: false, error: "Invalid 2FA code" }
      }

      // Enable 2FA if this is first verification
      await this.supabase.from("users").update({ two_factor_enabled: true }).eq("id", userId)

      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to verify 2FA" }
    }
  }

  async updateProfile(userId: string, updates: Partial<User2FA>): Promise<AuthResponse> {
    try {
      const { error } = await this.supabase.from("users").update(updates).eq("id", userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to update profile" }
    }
  }

  async resetPassword(phone: string, countryCode: string): Promise<AuthResponse> {
    try {
      const fullPhone = `${countryCode}${phone}`

      const { error } = await this.supabase.auth.resetPasswordForPhone(fullPhone)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to reset password" }
    }
  }

  async signOut(): Promise<void> {
    await this.supabase.auth.signOut()
  }

  private generateTOTPSecret(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    let secret = ""
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return secret
  }

  private generateQRCode(secret: string, userId: string): string {
    const issuer = "DedSecCompute"
    const label = `${issuer}:${userId}`
    const otpauth = `otpauth://totp/${encodeURIComponent(label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauth)}`
  }

  private verifyTOTPToken(secret: string, token: string): boolean {
    // Simplified TOTP verification - in production use a proper TOTP library
    const timeStep = Math.floor(Date.now() / 30000)
    const expectedToken = this.generateTOTPToken(secret, timeStep)
    const previousToken = this.generateTOTPToken(secret, timeStep - 1)
    const nextToken = this.generateTOTPToken(secret, timeStep + 1)

    return token === expectedToken || token === previousToken || token === nextToken
  }

  private generateTOTPToken(secret: string, timeStep: number): string {
    // Simplified TOTP generation - in production use a proper TOTP library
    const hash = this.hmacSHA1(secret, timeStep.toString())
    const offset = Number.parseInt(hash.slice(-1), 16)
    const code = Number.parseInt(hash.slice(offset * 2, offset * 2 + 8), 16) & 0x7fffffff
    return (code % 1000000).toString().padStart(6, "0")
  }

  private hmacSHA1(key: string, data: string): string {
    // Simplified HMAC-SHA1 - in production use crypto.subtle or a proper library
    return btoa(key + data).slice(0, 40)
  }
}

export const authManager = new AuthManager()
