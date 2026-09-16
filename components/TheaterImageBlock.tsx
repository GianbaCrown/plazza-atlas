'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import ImageLightbox from './ImageLightbox'
import MovieOverlay from './MovieOverlay'

type Movie = {
  title: string
  year: number | null
  poster_path: string | null
  tmdb_id?: number | null
}

type ImageMovieJoin = {
  movie_id: string
  movies: Movie
}

type ImageRecord = {
  id: string
  storage_path: string
  caption?: string
  credit?: string
  image_movies?: ImageMovieJoin[]
}

type Props = {
  img: ImageRecord
  theaterName: string
  size?: 'full' | 'modal'
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

function supabaseImageUrl(path: string, width?: number) {
  const base = `${SUPABASE_URL}/storage/v1/object/public/theater-images/${path}`
  if (width) return `${base}?width=${width}&quality=85`
  return base
}

export default function TheaterImageBlock({ img, theaterName, size = 'modal' }: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null)
  const prefetchCache = useRef<Record<number, any>>({})

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const prefetch = useCallback((tmdbId: number) => {
    if (!tmdbId || prefetchCache.current[tmdbId]) return
    fetch(`/api/tmdb/movie?id=${tmdbId}`)
      .then((r) => r.json())
      .then((data) => { prefetchCache.current[tmdbId] = data })
      .catch(() => {})
  }, [])

  function handleMovieClick(movie: any) {
    setSelectedMovie({
      ...movie,
      prefetched: movie.tmdb_id ? prefetchCache.current[movie.tmdb_id] ?? null : null,
    })
  }

  return (
    <figure className="mb-8">
      <div className="relative bg-gray-100 rounded-xl overflow-hidden aspect-[4/3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={supabaseImageUrl(img.storage_path, size === 'full' ? 1600 : 900)}
          srcSet={`
            ${supabaseImageUrl(img.storage_path, 600)} 600w,
            ${supabaseImageUrl(img.storage_path, 900)} 900w,
            ${supabaseImageUrl(img.storage_path, 1400)} 1400w,
            ${supabaseImageUrl(img.storage_path, 1600)} 1600w
          `}
          sizes={size === 'full' ? '(max-width: 768px) 100vw, 768px' : '(max-width: 640px) 100vw, 80vw'}
          alt={img.caption ?? theaterName}
          className="w-full h-full object-cover"
        />

        {isMobile && (
          <button
            onClick={() => setLightboxOpen(true)}
            className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm rounded-full p-2 flex items-center justify-center cursor-pointer"
            aria-label="View full image"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 3 21 3 21 9"/>
              <polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/>
              <line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          </button>
        )}
      </div>

      {(img.caption || img.credit) && (
        <figcaption className="text-xs text-gray-400 mt-2">
          {img.caption} {img.credit && <span className="italic">· {img.credit}</span>}
        </figcaption>
      )}

      {img.image_movies && img.image_movies.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
            Films on the marquee
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {img.image_movies.map((im, i) => (
              <div
                key={i}
                className="text-center cursor-pointer"
                onMouseEnter={() => im.movies.tmdb_id && prefetch(im.movies.tmdb_id)}
                onClick={() => handleMovieClick(im.movies)}
              >
                {im.movies.poster_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://image.tmdb.org/t/p/w342${im.movies.poster_path}`}
                    className="w-full aspect-[2/3] object-cover rounded-lg shadow-md transition hover:opacity-80 hover:shadow-lg"
                    alt={im.movies.title}
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-400">
                    No poster
                  </div>
                )}
                <p className="text-xs mt-1.5 font-medium leading-tight line-clamp-2">{im.movies.title}</p>
                {im.movies.year && <p className="text-xs text-gray-400">{im.movies.year}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {lightboxOpen && (
        <ImageLightbox
          src={supabaseImageUrl(img.storage_path)}
          alt={img.caption ?? theaterName}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {selectedMovie && (
        <MovieOverlay
          movie={selectedMovie}
          prefetched={selectedMovie.prefetched}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </figure>
  )
}