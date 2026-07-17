'use client'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const supabase = createClient()
  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/admin/login'
  }
  return <button onClick={handleLogout} className="text-sm text-gray-500 hover:underline">Log out</button>
}