'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SubmitModal() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))

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

  const inputClass = 'mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 250ms ease' }}
    >
      <div className="absolute inset-0 bg-black/60 bg-zinc-950/50 backdrop-blur-sm transition-opacity duration-200" onClick={close} />

      <div
        className="relative z-10 bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl overflow-hidden"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'transform 250ms cubic-bezier(0.32, 0, 0.18, 1)',
          maxHeight: '90dvh',
        }}
      >
        {/* Header */}
        <div className="flex items-start bg-zinc-950 justify-between px-7 pt-7 pb-5 border-b border-zinc-800">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">Submit a theater</h1>
            <p className="text-xs text-zinc-600 mt-0.5">Found a theater we should add? Let us know.</p>
          </div>
          <button
            onClick={close}
            className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer flex-shrink-0 mt-0.5"
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13"/>
              <line x1="13" y1="1" x2="1" y2="13"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-7 py-6" style={{ maxHeight: 'calc(90dvh - 80px)' }}>
          {status === 'sent' ? (
            <div className="py-8 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <p className="text-zinc-200 font-medium text-sm mb-1">Thank you</p>
              <p className="text-zinc-600 text-xs">We'll review your submission shortly.</p>
              <button onClick={close} className="mt-6 text-xs text-amber-500 hover:text-amber-400 transition-colors cursor-pointer">
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot */}
              <input name="website" tabIndex={-1} autoComplete="off" style={{ position: 'absolute', left: '-9999px' }} />

              <div>
                <label className="text-xs font-medium text-zinc-500 tracking-wide">Your name</label>
                <input name="name" required placeholder="Name" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 tracking-wide">Your email</label>
                <input name="email" type="email" required placeholder="email@example.com" className={inputClass} />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-500 tracking-wide">Tell us about the theater</label>
                <textarea
                  name="message"
                  required
                  rows={5}
                  placeholder="Name, location, any details you know..."
                  className={inputClass + ' resize-none'}
                />
              </div>

              {status === 'error' && (
                <p className="text-red-500 text-xs">Something went wrong — please try again.</p>
              )}

              <div className="flex items-center justify-between pt-1">
                {/* Cancel link 
                <button
                  type="button"
                  onClick={close}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
                >
                  Cancel
                </button> */}
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-lg text-xs font-medium cursor-pointer transition-colors"
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