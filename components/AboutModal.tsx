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
       <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-150"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={close}
      />

             <div className="relative z-10 bg-zinc-950 border border-zinc-800 rounded-t-2xl sm:rounded-sm shadow-sm w-full sm:max-w-xl overflow-hidden"
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
          <div className="space-y-4 text-sm text-zinc-200 leading-relaxed">
            <p>If you could time-travel, where and when would you go?</p> 

            <p>Some may choose to go back to the dinosaurs, others straight to the Big Bang or Ancient Egypt.</p>
              
            <p>Me? First I might do a quick stop in 1989, right in front the marquee of Plazza Lumière, in my hometown of Besançon, France.</p>

            <p>1989 was the year I fell in love movies. I went to see Cinema Paradiso with my grand-mother, and the film made such an impression on me that I spent the next two or three years memorizing every movie image that I could find, in magazines, in cinemas and in posters across the street.</p>
              
            <p>Years later, I became oddly enamored by photographic archives of movie theatres, and it took me a while to trace this newfound passion with that early rush of fascination. There’s something incredibly moving in the way these images capture the passing of time, from the ephemeral nature of movie programming, down to these glimpses of nearby businesses or random strangers walking by. </p>

            <p>This site doesn't mean to compete with the patient and exhaustive archival work of international projects like Cinema Treasures, or Ciné Façades in France, though the latter has been very influential in reawakening my love for theatre marquees.</p>

            <p>My ambition is not to keep track of every cinema that ever existed, it is simply to collect evocative images of places, movies and moments. If it can become a way to embrace the joy of moviegoing, to rediscover certain films – curios and classics alike – or to buy a ticket for a movie, then this site will have served its purpose. </p>

            <p>If you want to share images, add a precision or a correction, or request for an image to be credited or taken down, please do reach out hello@plazza-atlas.cc.</p>
          </div>

          <div className="mt-8 pt-5 border-t border-zinc-800/60">
            <p className="text-[10px] text-zinc-700 tracking-wide">Plazza Atlas · {new Date().getFullYear()}</p>
          </div>
        </div>
      </div>
    </div>
  )
}