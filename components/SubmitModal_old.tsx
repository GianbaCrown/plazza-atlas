'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SubmitModal() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))

    const scrollables = Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) => {
      const s = window.getComputedStyle(el)
      return s.overflowY === 'auto' || s.overflowY === 'scroll'
    })
    const snapshots = scrollables.map((el) => ({ el, overflowY: el.style.overflowY }))
    scrollables.forEach((el) => { el.style.overflowY = 'hidden' })
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKey)

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prev
      snapshots.forEach(({ el, overflowY }) => { el.style.overflowY = overflowY })
    }
  }, [])

  function close() {
    setVisible(false)
    setTimeout(() => router.back(), 200)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const res = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify({
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
        website: formData.get('website'),
      }),
      headers: { 'Content-Type': 'application/json' },
    })
    setStatus(res.ok ? 'sent' : 'error')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 250ms ease' }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      <div
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-y-auto"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'transform 250ms ease',
        }}
      >
        <button
          onClick={close}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition cursor-pointer"
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13"/>
            <line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>

        <div className="px-8 py-10">
          <h1 className="text-2xl font-bold mb-1">Submit a theater</h1>
          <p className="text-gray-400 text-sm mb-6">Found a theater we should add? Let us know.</p>

          {status === 'sent' ? (
            <div className="text-center py-8">
              <p className="text-emerald-600 font-medium mb-2">Thank you!</p>
              <p className="text-gray-500 text-sm">We'll review your submission shortly.</p>
              <button onClick={close} className="mt-6 text-sm text-amber-600 hover:underline cursor-pointer">
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot */}
              <input name="website" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px' }} />

              <div>
                <label className="text-sm font-medium text-gray-700">Your name</label>
                <input
                  name="name"
                  required
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Your email</label>
                <input
                  name="email"
                  type="email"
                  required
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Tell us about the theater</label>
                <textarea
                  name="message"
                  required
                  rows={5}
                  placeholder="Name, location, any details you know..."
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {status === 'error' && (
                <p className="text-red-600 text-sm">Something went wrong — please try again.</p>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={close}
                  className="text-sm text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium cursor-pointer transition"
                >
                  Send
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}