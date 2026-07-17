'use client'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    console.log('Login result:', error)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/admin'
    }
  }

  return (
    <form onSubmit={handleLogin} className="max-w-sm mx-auto mt-20 space-y-3">
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full border rounded px-3 py-2" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full border rounded px-3 py-2" />
      <button type="submit" disabled={loading} className="bg-amber-600 text-white px-4 py-2 rounded w-full">
        {loading ? 'Logging in...' : 'Log in'}
      </button>
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </form>
  )
}