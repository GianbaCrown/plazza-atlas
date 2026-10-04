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

    // Core theater + images — this must succeed
    supabase
      .from('theaters')
      .select(`
        *,
        images (
          id, storage_path, caption, credit, is_featured, sort_order,
          image_movies ( movie_id, movies ( title, year, poster_path, tmdb_id ) )
        )
      `)
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
      .then(({ data, error }: { data: any; error: any }) => {
        if (error || !data) { setLoading(false); return }
        setTheater(data)
        setLoading(false)

        // Prefetch movie details
        if (data.images) {
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

        // Fetch sources separately — failure won't break the theater load
        supabase
          .from('theater_sources')
          .select('id, source_id, source_url, sort_order, sources ( id, name, url, image_path )')
          .eq('theater_id', data.id)
          .order('sort_order')
          .then(({ data: sources }: { data: any }) => {
            if (sources?.length) {
              setTheater((prev: any) => ({ ...prev, theater_sources: sources }))
            }
          })
          .catch(() => {})

        // Fetch previous names separately
        supabase
          .from('theater_names')
          .select('id, name, year_from, year_to, sort_order')
          .eq('theater_id', data.id)
          .order('sort_order')
          .then(({ data: names }: { data: any }) => {
            if (names?.length) {
              setTheater((prev: any) => ({ ...prev, theater_names: names }))
            }
          })
          .catch(() => {})
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
                className="absolute bg-zinc-900 overflow-y-auto
          bottom-0 left-0 right-0
          sm:bottom-auto sm:right-0 sm:top-0 sm:left-auto sm:h-full md:w-[60vw] sm:w-[80vw] sm:border border-l-zinc-800"
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
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700/80 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13"/>
            <line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>

        {/* Content */}
        <div className="px-6 sm:px-18 py-6 pb-24">

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

                 {/* Still open */}
        {theater.is_open && (
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="inline-flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white"/>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"/>
              </span>
              <span className="text-[10px] font-medium tracking-widest uppercase text-emerald-500">
                Still open today
              </span>
            </div>
            {theater.website && (
              <>
                <span className="text-emerald-700 text-xs">·</span>
                <a
                  href={theater.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-medium tracking-widest uppercase text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  Book now →
                </a>
              </>
            )}
          </div>
        )}

                

                <h1 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight leading-snug mb-1.5">
                  {theater.name}
                </h1>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-zinc-400 text-xs tracking-wide">
                    {[theater.city, theater.country].filter(Boolean).join(', ')}
                  </span>
                  {(theater.year_opened || theater.year_closed) && (
                    <>
                      <span className="text-zinc-400 text-xs">·</span>
                      <span className="text-zinc-400 text-xs">
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

              {/* Divider 
              <div className="h-px bg-zinc-800 mb-7" />*/}

                           {/* All images — carousel if multiple */}
              {images.length > 0 && (
                <TheaterImageBlock
                  images={images}
                  theaterName={theater.name}
                  movieCache={movieCache.current}
                />
              )}
              {/* Description */}
              {theater.description && (
                <div
                  className="mb-8 text-sm text-zinc-400 leading-relaxed rich-text-content"
                  dangerouslySetInnerHTML={{ __html: theater.description }}
                />
              )}

                            {/* Previous names */}
              {theater.theater_names?.length > 0 && (
                <div className="mb-7">
                  <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-600 mb-3">
                    Previous names
                  </p>
                  <div className="space-y-0 border border-zinc-800 rounded-lg overflow-hidden">
                    {[...theater.theater_names]
                      .sort((a: any, b: any) => a.sort_order - b.sort_order)
                      .map((n: any, i: number) => (
                        <div key={n.id} className={`flex items-center justify-between px-4 py-2.5 text-xs ${i > 0 ? 'border-t border-zinc-800' : ''}`}>
                          <span className="text-zinc-300 font-medium">{n.name}</span>
                          <span className="text-zinc-600 tabular-nums flex-shrink-0 ml-4">
                            {n.year_from && n.year_to
                              ? `${n.year_from} – ${n.year_to}`
                              : n.year_from
                                ? `from ${n.year_from}`
                                : n.year_to
                                  ? `until ${n.year_to}`
                                  : ''}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Nearest theater */}
                          {theater.nearest_theater_name && (
                <div className="mb-5 border-t border-zinc-800 pt-5">
                  <h2 className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">
                    Nearest theater today
                  </h2>
                  <p className="text-sm text-zinc-300 font-medium mt-4">{theater.nearest_theater_name}</p>
                  {theater.nearest_theater_address && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {theater.nearest_theater_address
                        .split(',')
                        .filter((part: string) => part.trim().toLowerCase() !== theater.nearest_theater_name?.trim().toLowerCase())
                        .join(',')
                        .trim()
                        .replace(/^,\s*/, '')}
                    </p>
                  )}
                  {theater.nearest_theater_website && (
                    <a
                      href={theater.nearest_theater_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 transition-colors cursor-pointer mt-2"
                    >
                      Book now →
                    </a>
                  )}
                </div>
              )}

              {/* Source */}
                           {theater.theater_sources?.length > 0 && (
                             <div className="mb-5 border-t border-zinc-800 pt-5">
                  <h2 className="text-[10px] font-bold tracking-widest uppercase text-zinc-400">
                    Source
                  </h2>
                <div className="pt-4 border-t border-zinc-900 space-y-2">
                  {[...theater.theater_sources]
                    .sort((a: any, b: any) => a.sort_order - b.sort_order)
                    .map((ts: any) => {
                      const name = ts.sources?.name
                      const url = ts.source_url || ts.sources?.url
                      return (
                        <div key={ts.id} className="flex items-center gap-2.5">
                          {ts.sources?.image_path && (
                            <img
                              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/source-images/${ts.sources.image_path}`}
                              className="w-5 h-5 object-cover rounded opacity-60"
                              alt={name}
                            />
                          )}
                          <p className="text-[10px] text-zinc-700">
                            
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-amber-500 hover:text-amber-400 transition-colors cursor-pointer cursor-pointer"
                              >
                                {name ?? url}
                              </a>
                            ) : (
                              <span className="text-zinc-600">{name}</span>
                            )}
                          </p>
                        </div>
                      )
                    })}
                </div></div>
              )}

            </>
          )}
        </div>
      </div>
    </div>
  )
}