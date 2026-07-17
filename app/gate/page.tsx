'use client'
import { useState } from 'react'

export default function GatePage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/gate', {
      method: 'POST',
      body: JSON.stringify({ password }),
      headers: { 'Content-Type': 'application/json' },
    })
    if (res.ok) {
      window.location.href = '/'
    } else {
      setError(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1a2e]">
      <div className="text-center">
        <h1 className="text-white font-serif text-2xl mb-8">Plazza Atlas</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="Enter password"
            className="w-64 px-4 py-2 rounded-full text-center bg-white/10 text-white border border-white/20 placeholder-white/40 focus:outline-none focus:border-white/60"
          />
          {error && <p className="text-red-400 text-sm">Incorrect password</p>}
          <div>
            <button type="submit" className="px-6 py-2 rounded-full bg-amber-600 text-white text-sm font-medium">
              Enter
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}