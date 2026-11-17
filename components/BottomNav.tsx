'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import dynamic from 'next/dynamic'

const TimeMachine = dynamic(() => import('./TimeMachine'), { ssr: false })

type Props = {
  onRandom?: () => void
  onSearchOpen?: () => void
}

export default function BottomNav({ onRandom, onSearchOpen }: Props) {
  const router = useRouter()
    const [timeOpen, setTimeOpen] = useState(false)

  async function handleRandom() {
    if (onRandom) { onRandom(); return }
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { count } = await supabase.from('theaters').select('id', { count: 'exact', head: true }).eq('status', 'published')
    if (!count) return
    const offset = Math.floor(Math.random() * count)
    const { data } = await supabase.from('theaters').select('slug').eq('status', 'published').range(offset, offset)
    if (data?.[0]) router.push(`/theaters/${data[0].slug}`)
  }

  const btnClass = "font-medium shadow-md pl-4 pr-4 text-xs min-w-24 h-9 rounded-full flex items-center justify-left bg-black/40 backdrop-blur-md border border-zinc-600 text-zinc-100 hover:text-white hover:border-zinc-500 hover:bg-zinc-800/60 transition-all duration-150 cursor-pointer"

  return (
    <div className="fixed bottom-4 pl-2 left-4 z-30 flex flex-col gap-2">

      {/* Random */}
      <button onClick={handleRandom} className={btnClass} aria-label="Random theater">
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" className="w-4 h-4" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.484 9.166L15 7h5m0 0l-3-3m3 3l-3 3M4 17h4l1.577-2.253M4 7h4l7 10h5m0 0l-3 3m3-3l-3-3"/></svg>
     <span className="ml-2">Random</span>
      </button>

      {/* Search 
      <button onClick={() => onSearchOpen?.()} className={btnClass} aria-label="Search">
        <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m21 21l-3.5-3.5M17 10a7 7 0 1 1-14 0a7 7 0 0 1 14 0Z"/></svg>
       <span className="ml-2">Search</span>
      </button> */}

            {/* TIME MACHINE: comment out this whole button to hide the feature */}
      <button onClick={() => setTimeOpen(true)} className={btnClass} aria-label="Time machine">
        <svg width="15" height="15" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <path d="M12 7v5l4 2" />
        </svg>
          <span className="ml-2">Rewind</span>
      </button>

      {/* About */}
      <Link href="/about" className={btnClass} aria-label="About">
       <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" className="w-4 h-4" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.529 9.988a2.502 2.502 0 1 1 5 .191A2.44 2.44 0 0 1 12 12.582V14m-.01 3.008H12M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0"/></svg>
      <span className="ml-2">About</span>
      </Link>

      {/* Commented out — backup links
      <Link href="/about" ...>About</Link>
      <button onClick={() => onSearchOpen?.()}>Search</button>
      <Link href="/submit" ...>Contact</Link>
      */}
            {timeOpen && <TimeMachine onClose={() => setTimeOpen(false)} />}
    </div>
  )
}