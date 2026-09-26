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
    setTimeout(() => router.back(), 220)
  }

  const images = theater
    ? [...(theater.images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)
    : []

  const desktopTransform = mounted ? 'translateX(0)' : 'translateX(100%)'
  const mobileTransform = mounted ? 'translateY(0)' : 'translateY(100%)'

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-200"
        style={{ opacity: mounted ? 1 : 0 }}
        onClick={close}
      />

      <div
        className="absolute bg-zinc-950 overflow-y-auto
          bottom-0 left-0 right-0
          sm:bottom-auto sm:right-0 sm:top-0 sm:left-auto sm:h-full sm:w-[80vw] sm:rounded-l-xl"
        style={{
          maxHeight: typeof window !== 'undefined' && window.innerWidth < 640 ? '100dvh' : '100%',
          transform: typeof window !== 'undefined' && window.innerWidth < 640
            ? mobileTransform : desktopTransform,
          transition: 'transform 220ms cubic-bezier(0.32, 0, 0.18, 1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 backdrop-blur-sm flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13"/>
            <line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <svg className="animate-spin w-5 h-5 text-zinc-700" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : !theater ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-zinc-600 text-sm">Theater not found.</p>
          </div>
        ) : (
          <div>
            {/* Hero image — natural size, not stretched */}
            {images.length > 0 && (() => {
              const hero = images.find((i: any) => i.is_featured) ?? images[0]
              return (
                <div className="w-full bg-zinc-900 overflow-hidden">
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/${hero.storage_path}`}
                    alt={hero.caption ?? theater.name}
                    className="w-full h-auto block"
                    style={{ maxHeight: '70vh', objectFit: 'contain', background: '#09090b' }}
                  />
                </div>
              )
            })()}

            {/* Content */}
            <div className="px-6 sm:px-8 pt-6 pb-24">

              {/* Header */}
              <div className="mb-6">
                {/* Still open label */}
                {theater.is_open && (
                  <div className="inline-flex items-center gap-3 mb-3">
                    <div className="inline-flex items-center gap-1.5">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"/>
                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"/>
                      </span>
                      <span className="text-[10px] font-medium tracking-widest uppercase text-emerald-500/80">
                        Still open today
                      </span>
                    </div>
                    {theater.website && (
                      <>
                        <span className="text-zinc-700 text-xs">·</span>
                        
                          <a href={theater.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] font-medium tracking-widest uppercase text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
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

              <div className="h-px bg-zinc-800/60 mb-6"/>

              {/* Hero image caption */}
              {images.length > 0 && (() => {
                const hero = images.find((i: any) => i.is_featured) ?? images[0]
                return (hero.caption || hero.credit) ? (
                  <p className="text-xs text-zinc-600 mb-6 leading-relaxed">
                    {hero.caption && <span className="text-zinc-500">{hero.caption}</span>}
                    {hero.caption && hero.credit && <span className="text-zinc-700"> · </span>}
                    {hero.credit && <span className="text-zinc-700 italic">{hero.credit}</span>}
                  </p>
                ) : null
              })()}

              {/* Films on the marquee — hero image only */}
              {images.length > 0 && (() => {
                const hero = images.find((i: any) => i.is_featured) ?? images[0]
                const movies = hero.image_movies ?? []
                if (!movies.length) return null
                return (
                  <div className="mb-7">
                    <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-600 mb-3">
                      Films on the marquee
                    </p>
                    <div className={`grid gap-3 ${
                      movies.length === 1 ? 'grid-cols-1 max-w-[120px]' :
                      movies.length === 2 ? 'grid-cols-2 max-w-[260px]' :
                      movies.length === 3 ? 'grid-cols-3' :
                      'grid-cols-4'
                    }`}>
                      {movies.map((im: any, i: number) => {
                        const tmdbUrl = im.movies.tmdb_id
                          ? `https://www.themoviedb.org/movie/${im.movies.tmdb_id}`
                          : null
                        return (
                          <div key={i} className="text-center cursor-pointer group"
                            onClick={() => tmdbUrl && window.open(tmdbUrl, '_blank')}>
                            {im.movies.poster_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w185${im.movies.poster_path}`}
                                className="w-full aspect-[2/3] object-cover rounded shadow-md transition-all duration-200 group-hover:opacity-75 group-hover:scale-[1.02]"
                                alt={im.movies.title}
                              />
                            ) : (
                              <div className="w-full aspect-[2/3] bg-zinc-800 rounded flex items-center justify-center text-xs text-zinc-600">
                                No poster
                              </div>
                            )}
                            <p className="text-[10px] mt-1.5 font-medium text-zinc-400 leading-tight line-clamp-2">{im.movies.title}</p>
                            {im.movies.year && <p className="text-[10px] text-zinc-700">{im.movies.year}</p>}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}

              {/* Additional images */}
              {images.length > 1 && (
                <div className="mb-7 space-y-8">
                  {images.slice(1).map((img: any) => (
                    <TheaterImageBlock
                      key={img.id}
                      img={img}
                      theaterName={theater.name}
                      size="modal"
                      movieCache={movieCache.current}
                    />
                  ))}
                </div>
              )}

              {/* Description */}
              {theater.description && (
                <div
                  className="mb-7 text-sm text-zinc-400 leading-relaxed rich-text-content"
                  dangerouslySetInnerHTML={{ __html: theater.description }}
                />
              )}

              {/* Nearest theater — not a footnote */}
              {theater.nearest_theater_name && (
                <div className="border border-zinc-800 rounded-lg px-5 py-4 mb-6">
                  <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-600 mb-2">
                    Still showing nearby
                  </p>
                  <p className="text-sm font-semibold text-zinc-200 mb-0.5">{theater.nearest_theater_name}</p>
                  {theater.nearest_theater_address && (
                    <p className="text-xs text-zinc-600 mb-2">{theater.nearest_theater_address}</p>
                  )}
                  {theater.nearest_theater_website && (
                    
                      <a href={theater.nearest_theater_website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      Visit website →
                    </a>
                  )}
                </div>
              )}

              {/* Source — footnote treatment */}
              {(theater.sources || theater.source_url) && (
                <div className="flex items-center gap-2.5 pt-4 border-t border-zinc-900">
                  {theater.sources?.image_path && (
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/source-images/${theater.sources.image_path}`}
                      className="w-5 h-5 object-cover rounded opacity-60"
                      alt={theater.sources?.name}
                    />
                  )}
                  <p className="text-[10px] text-zinc-700">
                    Source:{' '}
                    {theater.source_url ? (
                      
                        <a href={theater.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer underline underline-offset-2"
                      >
                        {theater.sources?.name ?? theater.source_url}
                      </a>
                    ) : theater.sources?.url ? (
                      
                        <a href={theater.sources.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer underline underline-offset-2"
                      >
                        {theater.sources.name}
                      </a>
                    ) : (
                      <span className="text-zinc-600">{theater.sources?.name}</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}