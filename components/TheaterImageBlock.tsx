'use client'
import { useState, useCallback } from 'react'
import ImageOverlay from './ImageOverlay'
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
  images: ImageRecord[]
  theaterName: string
  movieCache?: Record<number, any>
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL

function imageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/theater-images/${path}`
}

export default function TheaterImageBlock({ images, theaterName, movieCache = {} }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [overlayImage, setOverlayImage] = useState<ImageRecord | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null)
  const localCache = { ...movieCache }

  const current = images[currentIndex]
  const isMultiple = images.length > 1

  function prev() {
    setCurrentIndex((i) => (i === 0 ? images.length - 1 : i - 1))
  }

  function next() {
    setCurrentIndex((i) => (i === images.length - 1 ? 0 : i + 1))
  }

  const prefetch = useCallback((tmdbId: number) => {
    if (!tmdbId || localCache[tmdbId]) return
    fetch(`/api/tmdb/movie?id=${tmdbId}`)
      .then((r) => r.json())
      .then((d) => { localCache[tmdbId] = d })
      .catch(() => {})
  }, [])

  function handleMovieClick(movie: any) {
    const prefetched = movie.tmdb_id ? localCache[movie.tmdb_id] ?? null : null
    setSelectedMovie({ ...movie, prefetched })
  }

  const movies = current.image_movies ?? []

  return (
    <div className="mb-8">
      {/* Image container */}
      <div className="relative bg-zinc-900 overflow-hidden group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl(current.storage_path)}
          alt={current.caption ?? theaterName}
          className="w-full h-auto block cursor-zoom-in"
          style={{ maxWidth: '100%', objectFit: 'contain' }}
          onClick={() => setOverlayImage(current)}
        />

        {/* Carousel arrows — only when multiple images */}
        {isMultiple && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prev() }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-950/70 hover:bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center text-zinc-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer z-10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); next() }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-950/70 hover:bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center text-zinc-300 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer z-10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </>
        )}

        {/* Image counter badge */}
        {isMultiple && (
          <div className="absolute top-2 right-2 bg-zinc-950/70 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-zinc-400 pointer-events-none">
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

     {/* Caption and credit */}
{(current.caption || current.credit) && (
  <div className="mt-2 mb-6 leading-relaxed">
    {current.caption && <p className="text-xs text-zinc-300">{current.caption}</p>}
    {current.credit && <p className="text-xs text-zinc-500">{current.credit}</p>}
  </div>
)}

      {/* Breadcrumb dots */}
      {isMultiple && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all cursor-pointer ${
                i === currentIndex
                  ? 'w-4 h-1.5 bg-amber-500'
                  : 'w-1.5 h-1.5 bg-zinc-700 hover:bg-zinc-500'
              }`}
            />
          ))}
        </div>
      )}

      {/* Films on the marquee */}
      {movies.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-400 mb-3">
            Films on the marquee
          </p>
          <div className={`grid gap-3 ${
            movies.length === 1 ? 'grid-cols-2 max-w-[160px]' :
            movies.length === 2 ? 'grid-cols-2 max-w-[200px]' :
            movies.length === 3 ? 'grid-cols-4' :
            movies.length === 4 ? 'grid-cols-4' :
            movies.length === 6 ? 'grid-cols-4' :
            'grid-cols-4 sm:grid-cols-5'
          }`}>
            {movies.map((im, i) => (
              <div
                key={i}
                className="text-center cursor-pointer group/poster"
                onMouseEnter={() => im.movies.tmdb_id && prefetch(im.movies.tmdb_id)}
                onClick={() => handleMovieClick(im.movies)}
              >
                {im.movies.poster_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://image.tmdb.org/t/p/w185${im.movies.poster_path}`}
                    className="w-full aspect-[2/3] object-cover rounded shadow-md border border-zinc-800"
                    alt={im.movies.title}
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-zinc-800 rounded flex items-center justify-center text-[10px] text-zinc-600">
                    No poster
                  </div>
                )}
                <p className="text-xs mt-1.5 font-medium text-zinc-200 leading-tight line-clamp-2">{im.movies.title}</p>
                {im.movies.year && <p className="text-[10px] text-zinc-500">{im.movies.year}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overlays */}
      {overlayImage && (
        <ImageOverlay
          src={imageUrl(overlayImage.storage_path)}
          alt={overlayImage.caption ?? theaterName}
          caption={overlayImage.caption}
          credit={overlayImage.credit}
          onClose={() => setOverlayImage(null)}
        />
      )}

      {selectedMovie && (
        <MovieOverlay
          movie={selectedMovie}
          prefetched={selectedMovie.prefetched}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </div>
  )
}