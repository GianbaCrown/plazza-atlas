'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AboutModal() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 250ms ease' }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />

      <div
        className="relative z-10 bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl overflow-hidden"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'transform 250ms cubic-bezier(0.32, 0, 0.18, 1)',
          maxHeight: '85dvh',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-5 border-b border-zinc-800/60">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">About Plazza Atlas</h1>
            <p className="text-xs text-zinc-600 mt-0.5 tracking-wide">A digital atlas of lost movie theaters</p>
          </div>
          <button
            onClick={close}
            className="w-6 h-6 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer flex-shrink-0 mt-0.5"
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13"/>
              <line x1="13" y1="1" x2="1" y2="13"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto px-7 py-6" style={{ maxHeight: 'calc(85dvh - 80px)' }}>
          <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
            <p>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt.
            </p>
            <p>
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
            </p>
          </div>

          <div className="mt-8 pt-5 border-t border-zinc-800/60">
            <p className="text-[10px] text-zinc-700 tracking-wide">Plazza Atlas · {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}