'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function BottomNav() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleRandom() {
    setLoading(true)
    const supabase = createClient()
    const { count } = await supabase
      .from('theaters').select('id', { count: 'exact', head: true }).eq('status', 'published')
    if (!count) { setLoading(false); return }
    const offset = Math.floor(Math.random() * count)
    const { data } = await supabase
      .from('theaters').select('slug').eq('status', 'published').range(offset, offset)
    if (data?.[0]) router.push(`/theaters/${data[0].slug}`)
    setLoading(false)
  }

  return (
    <div className="fixed bottom-4 left-4 z-30">
      <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md rounded-full px-4 py-2 text-sm border border-white/10">
        <Link href="/about" className="text-white/80 hover:text-white transition px-2 py-0.5 rounded-full hover:bg-white/10 cursor-pointer">
          About
        </Link>
        <span className="text-white/20">·</span>
        <Link href="/submit" className="text-white/80 hover:text-white transition px-2 py-0.5 rounded-full hover:bg-white/10 cursor-pointer">
          Submit
        </Link>
        <span className="text-white/20">·</span>
        <button
          onClick={handleRandom}
          disabled={loading}
          className="text-white/80 hover:text-white transition px-2 py-0.5 rounded-full hover:bg-white/10 cursor-pointer disabled:opacity-40"
        >
          {loading ? '···' : 'Random'}
        </button>
      </div>
    </div>
  )
}