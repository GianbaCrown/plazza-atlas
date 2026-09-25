'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AboutModal() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 250ms ease' }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} />

      <div
        className="relative z-10 bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] overflow-y-auto"
        style={{ transform: visible ? 'translateY(0)' : 'translateY(16px)', transition: 'transform 250ms ease' }}
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

               <div className="px-8 py-10 overflow-y-auto max-h-[calc(80vh-2rem)]">
          <h1 className="text-2xl font-bold mb-1">About Plazza Atlas</h1>
          <p className="text-gray-400 text-sm mb-6">A digital atlas of lost movie theaters</p>

          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
            </p>
            <p>
              Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
            </p>
            <p>
              Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
            </p>
            <p>
              Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
            <p className="text-xs text-gray-400">Plazza Atlas · {new Date().getFullYear()}</p>
            <button onClick={close} className="text-sm text-amber-600 hover:underline cursor-pointer">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}