import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  // Ensure there is an authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect("/auth/login")
  }

  // Verify admin privileges server-side
  const { data: adminData, error: adminError } = await supabase
    .from("users")
    .select("id, is_admin")
    .eq("id", user.id)
    .eq("is_admin", true)
    .single()

  if (adminError || !adminData) {
    redirect("/admin")
  }

  return (
    <div>
      {children}
    </div>
  )
}


