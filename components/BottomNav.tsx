'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function BottomNav() {
  const router = useRouter()

  async function handleRandom() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { count } = await supabase
      .from('theaters').select('id', { count: 'exact', head: true }).eq('status', 'published')
    if (!count) return
    const offset = Math.floor(Math.random() * count)
    const { data } = await supabase
      .from('theaters').select('slug').eq('status', 'published').range(offset, offset)
    if (data?.[0]) router.push(`/theaters/${data[0].slug}`)
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
          className="text-white/80 hover:text-white transition px-2 py-0.5 rounded-full hover:bg-white/10 cursor-pointer"
        >
          Random
        </button>
      </div>
    </div>
  )
}