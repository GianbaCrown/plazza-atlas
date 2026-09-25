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
  const movieCache = useRef<Record<number, any>>({})

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
      .then(({ data }: { data: any }) => {
        setTheater(data)
        setLoading(false)

        // Prefetch all movie details in parallel as soon as theater loads
        // so they're cached before user taps a poster
        if (data?.images) {
          const tmdbIds = new Set<number>()
          data.images.forEach((img: any) => {
            img.image_movies?.forEach((im: any) => {
              if (im.movies?.tmdb_id) tmdbIds.add(im.movies.tmdb_id)
            })
          })
          tmdbIds.forEach((id) => {
            fetch(`/api/tmdb/movie?id=${id}`)
              .then((r) => r.json())
              .then((d) => { movieCache.current[id] = d })
              .catch(() => {})
          })
        }
      })
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
    if (scrollTop > 2) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) { isDragging.current = true; setDragOffset(delta) }
  }

  function handleTouchEnd() {
    if (window.innerWidth >= 640) return
    if (isDragging.current && dragOffset > 80) close()
    else { setDragOffset(0); isDragging.current = false }
  }

  const images = theater
    ? [...(theater.images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
    : []

  const mobileTransform = mounted ? `translateY(${dragOffset}px)` : 'translateY(100%)'
  const desktopTransform = mounted ? 'translateX(0)' : 'translateX(100%)'

  return (
    <div className="fixed inset-0 z-50">

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm transition-opacity duration-200"
        style={{ opacity: mounted ? 1 : 0 }}
        onClick={close}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
                className="absolute bg-zinc-950 overflow-y-auto
          bottom-0 left-0 right-0
          sm:bottom-auto sm:right-0 sm:top-0 sm:left-auto sm:h-full sm:w-[80vw] sm:rounded-l-xl"
        style={{
          maxHeight: typeof window !== 'undefined' && window.innerWidth < 640 ? '100dvh' : '100%',
          transform: typeof window !== 'undefined' && window.innerWidth < 640
            ? mobileTransform : desktopTransform,
          transition: isDragging.current ? 'none' : 'transform 220ms cubic-bezier(0.32, 0, 0.18, 1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >

       {/* Drag handle — visual only, no swipe gesture (conflicts with pull-to-refresh) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-0.5 rounded-full bg-zinc-700" />
        </div>

        <button
          onClick={close}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700/80 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13"/>
            <line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>

        {/* Content */}
        <div className="px-6 sm:px-10 py-6 pb-24">

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <svg className="animate-spin w-5 h-5 text-zinc-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            </div>

          ) : !theater ? (
            <p className="text-zinc-600 text-sm">Theater not found.</p>

          ) : (
            <>
              {/* Header */}
              <div className="mb-7 pr-8">

                {/* Still open label */}
                {theater.is_open && (
                  <div className="inline-flex items-center gap-1.5 mb-3">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    </span>
                    <span className="text-[10px] font-medium tracking-widest uppercase text-emerald-500/80">
                      Still open today
                    </span>
                  </div>
                )}

                <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight leading-snug mb-1.5">
                  {theater.name}
                </h1>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-500 text-xs tracking-wide">
                    {[theater.city, theater.country].filter(Boolean).join(', ')}
                  </span>
                  {(theater.year_opened || theater.year_closed) && (
                    <>
                      <span className="text-zinc-700 text-xs">·</span>
                      <span className="text-zinc-500 text-xs">
                        {theater.year_opened && theater.year_closed
                          ? `${theater.year_opened} – ${theater.year_closed}`
                          : theater.year_opened
                            ? `est. ${theater.year_opened}`
                            : `closed ${theater.year_closed}`}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-zinc-800 mb-7" />

              {/* Images */}
              <div className="theater-modal-dark">
                {images.map((img: any) => (
                  <TheaterImageBlock key={img.id} img={img} theaterName={theater.name} size="modal" />
                ))}
              </div>

              {/* Description */}
              {theater.description && (
                <div
                  className="mb-8 text-sm text-zinc-400 leading-relaxed rich-text-content"
                  dangerouslySetInnerHTML={{ __html: theater.description }}
                />
              )}

              {/* Nearest theater */}
              {theater.nearest_theater_name && (
                <div className="border border-zinc-800 rounded-lg px-4 py-3.5 mb-5">
                  <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-600 mb-1">
                    Still showing nearby
                  </p>
                  <p className="text-sm text-zinc-300 font-medium">{theater.nearest_theater_name}</p>
                  {theater.nearest_theater_address && (
                    <p className="text-xs text-zinc-600 mt-0.5">{theater.nearest_theater_address}</p>
                  )}
                </div>
              )}

              {/* Source */}
              {(theater.sources || theater.source_url) && (
                <div className="flex items-center gap-3 pt-5 border-t border-zinc-800/60">
                  {theater.sources?.image_path && (
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/source-images/${theater.sources.image_path}`}
                      className="w-7 h-7 object-cover rounded opacity-80"
                      alt={theater.sources?.name}
                    />
                  )}
                  <div>
                    <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-600 mb-0.5">Source</p>
                    {theater.source_url ? (
                      
                        <a href={theater.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
                        >
                        {theater.sources?.name ?? theater.source_url}
                      </a>
                    ) : theater.sources?.url ? (
                      
                        <a href={theater.sources.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
                      >
                        {theater.sources.name}
                      </a>
                    ) : (
                      <p className="text-xs text-zinc-400">{theater.sources?.name}</p>
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