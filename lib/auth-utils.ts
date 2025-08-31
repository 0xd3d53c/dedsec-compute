import { createClient } from "./supabase/client"

export interface User2FA {
  id: string
  username: string
  display_name: string
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
            display_name: userData.display_name,
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
      const { data: { user }, error } = await this.supabase.auth.getUser()
      
      if (error) {
        return { success: false, error: error.message }
      }

      if (!user) {
        return { success: false, error: "No user found" }
      }

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
          display_name: userData.display_name,
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

  async enable2FA(): Promise<AuthResponse> {
    try {
      // This would integrate with a 2FA service like TOTP
      // For now, we'll just update the user record
      const { data: { user } } = await this.supabase.auth.getUser()
      
      if (!user) {
        return { success: false, error: "No user found" }
      }

      const { error } = await this.supabase
        .from("users")
        .update({ two_factor_enabled: true })
        .eq("id", user.id)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: "Failed to enable 2FA" }
    }
  }

  async disable2FA(): Promise<AuthResponse> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser()
      
      if (!user) {
        return { success: false, error: "No user found" }
      }

      const { error } = await this.supabase
        .from("users")
        .update({ two_factor_enabled: false })
        .eq("id", user.id)

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
