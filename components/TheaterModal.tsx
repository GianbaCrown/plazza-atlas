'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import TheaterImageBlock from './TheaterImageBlock'


export default function TheaterModal({ slug, onClose }: { slug: string; onClose?: () => void }) {
  const router = useRouter()
  const [theater, setTheater] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const movieCache = useRef<Record<number, any>>({})
  const panelRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef(0)
  const [dragOffset, setDragOffset] = useState(0)
  const isDragging = useRef(false)
    const [closing, setClosing] = useState(false)
    const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 640 : false
  )

    useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 640)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function load() {
      // 1. Core theater + images
      const { data, error } = await supabase
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

      if (cancelled) return
      if (error || !data) { setLoading(false); return }

      // 2. Sources + previous names in parallel (one wait instead of two pop-ins)
      const [{ data: sources }, { data: names }] = await Promise.all([
        supabase
          .from('theater_sources')
          .select('id, source_id, source_url, sort_order, sources ( id, name, url, image_path )')
          .eq('theater_id', data.id)
          .order('sort_order'),
        supabase
          .from('theater_names')
          .select('id, name, year_from, year_to, sort_order')
          .eq('theater_id', data.id)
          .order('sort_order'),
      ])

      // 3. Preload the first image so it's already cached when the carousel renders
      const first = [...(data.images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)[0]
      if (first) {
        await new Promise<void>((resolve) => {
          const img = new window.Image()
          const timeout = setTimeout(resolve, 2500) // never block longer than 2.5s
          img.onload = img.onerror = () => { clearTimeout(timeout); resolve() }
          img.src = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/${first.storage_path}`
        })
      }
      if (cancelled) return

      // 4. Reveal everything at once
      setTheater({ ...data, theater_sources: sources ?? [], theater_names: names ?? [] })
      setLoading(false)

      // 5. Prefetch movie details AFTER reveal, so they don't compete with images
      setTimeout(() => {
        if (cancelled) return
        const tmdbIds = new Set<number>()
        data.images?.forEach((img: any) =>
          img.image_movies?.forEach((im: any) => {
            if (im.movies?.tmdb_id) tmdbIds.add(im.movies.tmdb_id)
          })
        )
        tmdbIds.forEach((id) => {
          fetch(`/api/tmdb/movie?id=${id}`)
            .then((r) => r.json())
            .then((d) => { movieCache.current[id] = d })
            .catch(() => {})
        })
      }, 800)
    }

    load()
    return () => { cancelled = true }
  }, [slug])

   function close() {
    if (closing) return
    requestAnimationFrame(() => setClosing(true))
    setTimeout(() => {
      if (onClose) onClose()
      else router.back()
    }, 220)
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


    const modalContent = (
    <div className="bg-black/60 rounded-none border-0 sm:rounded-lg sm:border sm:border-zinc-800 pb-4">
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <svg className="animate-spin w-5 h-5 text-zinc-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
          </svg>
        </div>
      ) : !theater ? (
        <p className="text-zinc-600 text-sm p-8">Theater not found.</p>
      ) : (
         <div className="modal-content-appear">
          <div className="px-4 md:px-12 py-8 pr-8">
            {theater.is_open && (
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="inline-flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white"/>
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"/>
                  </span>
                  <span className="text-[10px] font-medium tracking-widest uppercase text-emerald-500">Still open today</span>
                </div>
                {theater.website && (
                  <>
                    <span className="text-emerald-700 text-xs">·</span>
                    <a href={theater.website} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] font-medium tracking-widest uppercase text-emerald-500 hover:text-emerald-400 transition-colors cursor-pointer">
                      Book now →
                    </a>
                  </>
                )}
              </div>
            )}
            <h1 className="text-xl sm:text-3xl font-semibold text-zinc-100 tracking-tight leading-snug mb-1.5">{theater.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-400 text-xs">{[theater.city, theater.country].filter(Boolean).join(', ')}</span>
              {(theater.year_opened || theater.year_closed) && (
                <>
                  <span className="text-zinc-400 text-xs">·</span>
                  <span className="text-zinc-400 text-xs">
                    {theater.year_opened && theater.year_closed
                      ? `${theater.year_opened} – ${theater.year_closed}`
                      : theater.year_opened ? `est. ${theater.year_opened}` : `closed ${theater.year_closed}`}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="px-4 md:px-12">
            {images.length > 0 && <TheaterImageBlock images={images} theaterName={theater.name} movieCache={movieCache.current} />}
            {theater.description && (
              <div className="mb-8 text-sm text-zinc-400 leading-relaxed rich-text-content" dangerouslySetInnerHTML={{ __html: theater.description }} />
            )}
          </div>

          {theater.theater_names?.length > 0 && (
            <div className="px-4 md:px-12 py-8 border-t border-zinc-800">
              <h2 className="text-[10px] font-medium tracking-widest uppercase text-zinc-400">Previous names</h2>
              <div className="overflow-hidden mt-3">
                {[...theater.theater_names].sort((a: any, b: any) => a.sort_order - b.sort_order).map((n: any, i: number) => (
                  <div key={n.id} className={`border-b border-zinc-800 flex items-center justify-between py-2.5 text-xs ${i > 0 ? '' : ''}`}>
                    <span className="text-zinc-100">{n.name}</span>
                    <span className="text-zinc-400 flex-shrink-0 ml-4">
                      {n.year_from && n.year_to ? `${n.year_from} – ${n.year_to}` : n.year_from ? `from ${n.year_from}` : n.year_to ? `until ${n.year_to}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {theater.nearest_theater_name && (
            <div className="px-4 md:px-12 py-8 border-t border-zinc-800">
              <h2 className="text-[10px] font-medium tracking-widest uppercase text-zinc-400">Nearest theater today</h2>
              <p className="text-sm text-zinc-100 font-medium mt-4">{theater.nearest_theater_name}</p>
              {theater.nearest_theater_address && (
                <p className="text-xs text-zinc-400 mt-0.5">
                  {theater.nearest_theater_address.split(',').slice(0, -1)
                    .filter((part: string) => part.trim().toLowerCase() !== theater.nearest_theater_name?.trim().toLowerCase())
                    .join(',').trim().replace(/^,\s*/, '')}
                </p>
              )}
              {theater.nearest_theater_website && (
                <a href={theater.nearest_theater_website} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 transition-colors cursor-pointer mt-2">
                  Book now →
                </a>
              )}
            </div>
          )}

          {theater.theater_sources?.length > 0 && (
            <div className="px-4 md:px-12 py-8 border-t border-zinc-800">
              <h2 className="text-[10px] font-medium tracking-widest uppercase text-zinc-400">Source</h2>
              <div className="pt-4 space-y-2">
                {[...theater.theater_sources].sort((a: any, b: any) => a.sort_order - b.sort_order).map((ts: any) => {
                  const name = ts.sources?.name
                  const url = ts.source_url || ts.sources?.url
                  return (
                    <div key={ts.id} className="flex items-center gap-2.5">
                      {ts.sources?.image_path && (
                        <img src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/source-images/${ts.sources.image_path}`}
                          className="w-5 h-5 object-cover rounded opacity-60" alt={name} />
                      )}
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-amber-500 hover:text-amber-400 transition-colors cursor-pointer">
                          {name ?? url}
                        </a>
                      ) : (
                        <span className="text-xs text-zinc-600">{name}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

    const exitStyle = closing
    ? {
        opacity: 0,
        transform: 'translateY(16px)',
        transition: 'opacity 200ms ease, transform 200ms cubic-bezier(0.32, 0, 0.18, 1)',
      }
    : {}

    return (
    <div className="fixed inset-0 z-50">

      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
       style={{ opacity: mounted && !closing ? 1 : 0 }}
        onClick={close}
      />

      {/* Mobile — full screen panel from bottom */}
      {isMobile ? (
        <div
          ref={panelRef}
          className="fixed inset-0 overflow-y-auto theater-modal-scroll"
          style={{
            transform: mobileTransform,
            transition: 'transform 220ms cubic-bezier(0.32, 0, 0.18, 1)',
            paddingBottom: 'env(safe-area-inset-bottom)',
            ...exitStyle
          }}
        >
          <button
            onClick={close}
            className="absolute top-4 right-4 z-20 w-6 h-6 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="1" y1="1" x2="13" y2="13"/>
              <line x1="13" y1="1" x2="1" y2="13"/>
            </svg>
          </button>
          {modalContent}
        </div>

      ) : (

        /* Desktop — scroll container, panel grows with content */
        <div
          className="fixed inset-0 overflow-y-auto theater-modal-scroll pointer-events-none"
          style={{ padding: '40px 40px 40px 0', display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start' }}
        >
          <div
            ref={panelRef}
            className="relative rounded-lg pointer-events-auto"
            style={{
              width: 'clamp(360px, 60vw, 900px)',
              transform: desktopTransform,
      
              transition: 'transform 220ms cubic-bezier(0.32, 0, 0.18, 1)',
              ...exitStyle
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              className="absolute top-4 right-4 z-20 w-6 h-6 rounded-full bg-zinc-800 hover:bg-zinc-700/80 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="13" y2="13"/>
                <line x1="13" y1="1" x2="1" y2="13"/>
              </svg>
            </button>
            {modalContent}
          </div>
        </div>
      )}
    </div>
  )
}