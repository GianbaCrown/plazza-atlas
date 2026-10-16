'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AboutModal() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))

    // Lock only the body — don't touch internal elements
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prev
    }
  }, [])

   function close() {
    requestAnimationFrame(() => setVisible(false))
    setTimeout(() => router.back(), 220)
  }

  return (
       <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:px-4">
          <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        style={{ opacity: visible ? 1 : 0, transition: 'opacity 220ms ease' }}
        onClick={close}
      />

             <div className="relative z-10 bg-zinc-950/80 w-[90%] border border-zinc-800 rounded-lg sm:rounded-lg shadow-sm max-w-lg sm:max-w-lg overflow-hidden"
                 style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 220ms ease, transform 220ms cubic-bezier(0.32, 0, 0.18, 1)',
          maxHeight: '80dvh',
        }}
        >
        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-5 border-b border-zinc-800">
          <div>
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">About Plazza Atlas</h1>
          {/*   <p className="text-xs text-zinc-400 mt-0.5 tracking-wide">The world map of movie wonder.</p> */}
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
          <div className="space-y-4 text-sm text-zinc-300 leading-relaxed mb-24">


            <p>If you could time-travel, where and when would you go?</p> 

            <p>Some may choose to go back to the dinosaurs, others straight to the Big Bang or Ancient Egypt.</p>
              
            <p>Me? First I might do a quick stop in 1989, right in front the marquee of Plazza Lumière, in my hometown of Besançon, France.</p>

            <p>1989 was the year I truly fell in love with movies. I&nbsp;had just turned 8 years old, and I&nbsp;went to see Cinema Paradiso with my grand-mother. The film made such an impression on me that I spent the next three years memorizing every movie image that I could find, in magazines, in cinema lobbies and in promotional posters across the street.</p>
              
            <p>Years later, I became oddly enamored by photographic archives of movie theatres, and it took me a while to trace this newfound passion back to that early rush of fascination. There’s something incredibly moving in the way these images capture the passing of time, from the ephemeral nature of movie programming, down to these glimpses of nearby businesses or random strangers walking&nbsp;by. </p>

            <p>This site doesn't mean to compete with the patient and exhaustive archival work of international projects like <a className="text-amber-500 font-medium" target="_blank" href="https://cinematreasures.org/">Cinema Treasures</a>, or <a className="text-amber-500 font-medium" target="_blank" href="https://sallesdecinemas.blogspot.com/">Ciné-Façades</a> in France, though the latter has been very influential in reactivating my love for theatre marquees.</p>

            <p>The ambition is not to keep track of every cinema that ever existed, it is simply to collect evocative images of places, movies and moments. If it can become a way to embrace the joy of moviegoing, to rediscover certain films – curios and classics alike – or to buy a ticket for a movie, then this site will have served its purpose. </p>
           
                       <img className="mt-8 border border-zinc-800" src="/plazza-lumiere-besancon-1988.jpg" />
                       <p className="text-[10px] text-zinc-400 mb-8 ">The Plazza Lumière in Besançon, France, circa 1988</p>
            <hr className="border-t border-zinc-800 my-4 mt-6 mb-6" />

            <p className="text-zinc-400 text-[10px]">If you want to share images, add a precision or a correction, or request for an image to be credited or taken down, please do reach out hello@plazza-atlas.cc.</p>
          </div>

      
        </div>
      </div>
    </div>
  )
}

