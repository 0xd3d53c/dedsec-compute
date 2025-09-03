import { createClient } from "@/lib/supabase/client"
import { createClient as createServerClient } from "@/lib/supabase/server"

export interface AuthUser {
  id: string
  email?: string
  user_metadata: {
    username?: string
    display_name?: string
  }
}

export interface UserProfile {
  id: string
  username: string
  display_name: string
  profile_picture_url?: string
  invite_code: string
  invited_by?: string
  is_admin: boolean
  is_active: boolean
  two_factor_enabled: boolean
  last_login?: string
  created_at: string
  updated_at: string
}


export async function signInWithGoogle() {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })

  return { data, error }
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getUser() {
  const supabase = await createServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  return { user, error }
}

export async function getUserProfile(userId: string): Promise<{ profile: UserProfile | null; error: any }> {
  const supabase = await createServerClient()

  const { data: profile, error } = await supabase.from("users").select("*").eq("id", userId).single()

  return { profile, error }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single()

  return { data, error }
}

export async function enable2FA(userId: string, secret: string, backupCodes: string[]) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("users")
    .update({
      two_factor_enabled: true,
      two_factor_secret: secret,
      backup_codes: backupCodes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single()

  return { data, error }
}

export async function disable2FA(userId: string) {
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from("users")
    .update({
      two_factor_enabled: false,
      two_factor_secret: null,
      backup_codes: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select()
    .single()

  return { data, error }
}
