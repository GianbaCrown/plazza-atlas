'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TheaterImageBlock from './TheaterImageBlock'

export default function TheaterModal({ slug }: { slug: string }) {
  const router = useRouter()
  const [theater, setTheater] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  // Swipe to close
  const panelRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const [dragOffset, setDragOffset] = useState(0)
  const isDragging = useRef(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('theaters')
      .select(`*, sources ( id, name, url, image_path ), images ( id, storage_path, caption, credit, is_featured, sort_order, image_movies ( movie_id, movies ( title, year, poster_path, tmdb_id ) ) )`)
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
      .then(({ data }: { data: any }) => { setTheater(data); setLoading(false) })
  }, [slug])

  function close() {
    setMounted(false)
    setDragOffset(0)
    setTimeout(() => router.back(), 220)
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (window.innerWidth >= 640) return
    touchStartY.current = e.touches[0].clientY
    isDragging.current = false
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (window.innerWidth >= 640) return
    const scrollTop = panelRef.current?.scrollTop ?? 0
    if (scrollTop > 2) return // let normal scroll happen if not at top
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) {
      isDragging.current = true
      setDragOffset(delta)
    }
  }

  function handleTouchEnd() {
    if (window.innerWidth >= 640) return
    if (isDragging.current && dragOffset > 80) {
      close()
    } else {
      setDragOffset(0)
      isDragging.current = false
    }
  }

  const images = theater
    ? [...(theater.images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
    : []

  // Separate transform for mobile (includes drag) and desktop
  const mobileTransform = mounted
    ? `translateY(${dragOffset}px)`
    : 'translateY(100%)'
  const desktopTransform = mounted ? 'translateX(0)' : 'translateX(100%)'

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-200 ease-out"
        style={{ opacity: mounted ? 0.6 : 0 }}
        onClick={close}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="absolute bg-white overflow-y-auto
          bottom-0 left-0 right-0 
          sm:bottom-auto sm:right-0 sm:top-0 sm:left-auto sm:h-full sm:w-[80vw] sm:rounded-none"
        style={{
          // dvh accounts for browser chrome on mobile (address bar)
          maxHeight: '92dvh',
          // Desktop overrides height via className sm:h-full, applied via CSS
          transform: typeof window !== 'undefined' && window.innerWidth < 640
            ? mobileTransform
            : desktopTransform,
          transition: isDragging.current
            ? 'none'
            : 'transform 220ms cubic-bezier(0.32, 0, 0.18, 1)',
          // Safe area for notch/home indicator
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Close button — top right, always visible */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-sm flex items-center justify-center text-gray-700 hover:text-gray-900 transition cursor-pointer"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13"/>
            <line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>

        <div className="px-6 sm:px-10 py-6 pb-20">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-300">
              <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>
          ) : !theater ? (
            <p className="text-gray-400">Theater not found.</p>
          ) : (
            <>
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 pr-10">{theater.name}</h1>
              {theater.is_open && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                  Still open today
                </span>
              )}
              <p className="text-gray-500 mb-8 text-sm">
                {theater.city}, {theater.country}
                {theater.year_opened && ` · ${theater.year_opened}`}
                {theater.year_closed && ` – ${theater.year_closed}`}
              </p>

              {images.map((img: any) => (
                <TheaterImageBlock key={img.id} img={img} theaterName={theater.name} size="modal" />
              ))}

              {theater.description && (
                <div className="mb-8 text-sm leading-relaxed rich-text-content"
                  dangerouslySetInnerHTML={{ __html: theater.description }} />
              )}

              {theater.nearest_theater_name && (
                <div className="border-t pt-5 mt-8">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Still showing nearby</p>
                  <p className="font-medium text-sm">{theater.nearest_theater_name}</p>
                  <p className="text-xs text-gray-400">{theater.nearest_theater_address}</p>
                </div>
              )}

              {(theater.sources || theater.source_url) && (
                <div className="border-t pt-5 mt-5 flex items-center gap-3">
                  {theater.sources?.image_path && (
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/source-images/${theater.sources.image_path}`}
                      className="w-8 h-8 object-cover rounded" alt={theater.sources?.name}
                    />
                  )}
                  <div>
                    <p className="text-xs text-gray-400">Source</p>
                    {theater.source_url ? (
                      <a href={theater.source_url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-amber-600 hover:underline cursor-pointer">
                        {theater.sources?.name ?? theater.source_url}
                      </a>
                    ) : theater.sources?.url ? (
                      <a href={theater.sources.url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-amber-600 hover:underline cursor-pointer">
                        {theater.sources.name}
                      </a>
                    ) : (
                      <p className="text-sm font-medium">{theater.sources?.name}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}