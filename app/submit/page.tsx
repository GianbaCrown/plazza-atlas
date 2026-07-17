'use client'
import { useState } from 'react'

export default function SubmitPage() {
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const res = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
        website: formData.get('website'), // honeypot
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    setStatus(res.ok ? 'sent' : 'error')
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Submit a theater</h1>
      {status === 'sent' ? (
        <p>Thanks — we'll review it shortly.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="name" required placeholder="Your name" className="w-full border rounded px-3 py-2" />
          <input name="email" type="email" required placeholder="Your email" className="w-full border rounded px-3 py-2" />
          <textarea name="message" required placeholder="Tell us about the theater" rows={5} className="w-full border rounded px-3 py-2" />
          {/* Honeypot — hidden from real users via CSS, bots fill it in anyway */}
          <input
            name="website"
            tabIndex={-1}
            autoComplete="off"
            style={{ position: 'absolute', left: '-9999px' }}
          />
          <button type="submit" className="bg-amber-600 text-white px-4 py-2 rounded">Send</button>
          {status === 'error' && <p className="text-red-600 text-sm">Something went wrong, try again.</p>}
        </form>
      )}
    </div>
  )
}