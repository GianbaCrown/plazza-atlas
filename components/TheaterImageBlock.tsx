'use client'
import { useState, useCallback, useRef, useEffect } from 'react'
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

function imgUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/theater-images/${path}`
}

export default function TheaterImageBlock({ images, theaterName, movieCache = {} }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [overlayImage, setOverlayImage] = useState<ImageRecord | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null)
  const localCache = useRef<Record<number, any>>(movieCache)
  const isMultiple = images.length > 1

  useEffect(() => {
    localCache.current = { ...localCache.current, ...movieCache }
  }, [movieCache])

  function prev() {
    setCurrentIndex((i) => Math.max(0, i - 1))
  }

  function next() {
    setCurrentIndex((i) => Math.min(images.length - 1, i + 1))
  }

  const prefetch = useCallback((tmdbId: number) => {
    if (!tmdbId || localCache.current[tmdbId]) return
    fetch(`/api/tmdb/movie?id=${tmdbId}`)
      .then((r) => r.json())
      .then((d) => { localCache.current[tmdbId] = d })
      .catch(() => {})
  }, [])

  function handleMovieClick(movie: any) {
    const prefetched = movie.tmdb_id ? localCache.current[movie.tmdb_id] ?? null : null
    setSelectedMovie({ ...movie, prefetched })
  }

  const current = images[currentIndex]
  const movies = current.image_movies ?? []

  return (
    <div className="mb-8">

      {/* Image container */}
      <div
        className="relative bg-zinc-950 rounded-sm border border-zinc-800 overflow-hidden"
        style={{ aspectRatio: '4/3' }}
      >
        {/* Full track — all images in one row, translated by index */}
        <div
          style={{
            display: 'flex',
            width: `${images.length * 100}%`,
            height: '100%',
            transform: `translateX(-${(currentIndex / images.length) * 100}%)`,
            transition: 'transform 320ms ease-in-out',
          }}
        >
          {images.map((img, i) => (
            <div
              key={img.id}
              style={{ width: `${100 / images.length}%`, flexShrink: 0, height: '100%' }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imgUrl(img.storage_path)}
                alt={img.caption ?? theaterName}
                className="w-full h-full object-contain cursor-zoom-in"
                onClick={() => setOverlayImage(img)}
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* Arrows — desktop and mobile */}
        {isMultiple && (
          <>
            <button
              onClick={prev}
              disabled={currentIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-950/70 hover:bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer z-10 disabled:opacity-20 disabled:cursor-default"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              onClick={next}
              disabled={currentIndex === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-950/70 hover:bg-zinc-950/90 backdrop-blur-sm flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer z-10 disabled:opacity-20 disabled:cursor-default"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            <div className="absolute top-2 right-2 bg-zinc-950/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-zinc-300 pointer-events-none z-10">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}
      </div>

      {/* Breadcrumb dots */}
      {isMultiple && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`rounded-full transition-all duration-200 cursor-pointer ${
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
        <div className="mt-5">
          <h2 className="text-[10px] font-bold tracking-widest uppercase text-zinc-400 mb-3">
            What was playing
          </h2>
         <div className={`grid gap-3 ${
  movies.length === 1 ? 'grid-cols-4 sm:grid-cols-5' :
  movies.length === 2 ? 'grid-cols-4 sm:grid-cols-5' :
  movies.length === 3 ? 'grid-cols-4 sm:grid-cols-5' :
  movies.length === 4 ? 'grid-cols-4 sm:grid-cols-5' :
  movies.length === 5 ? 'grid-cols-5 sm:grid-cols-5 lg:grid-cols-6' :
  movies.length === 6 ? 'grid-cols-5 sm:grid-cols-5 lg:grid-cols-6' :
  'grid-cols-3 sm:grid-cols-5'
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
                    className="border border-zinc-800 w-full aspect-[2/3] object-cover rounded shadow-md transition-all duration-200 hover:border-zinc-600"
                    alt={im.movies.title}
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-zinc-800 rounded flex items-center justify-center text-[10px] text-zinc-600">
                    No poster
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {overlayImage && (
        <ImageOverlay
          src={imgUrl(overlayImage.storage_path)}
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