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
  const [prevIndex, setPrevIndex] = useState<number | null>(null)
  const [direction, setDirection] = useState<'left' | 'right'>('left')
  const [animating, setAnimating] = useState(false)
  const [overlayImage, setOverlayImage] = useState<ImageRecord | null>(null)
  const [selectedMovie, setSelectedMovie] = useState<any | null>(null)
  const localCache = useRef<Record<number, any>>(movieCache)
  const touchStartX = useRef<number | null>(null)
  const isMultiple = images.length > 1

  useEffect(() => {
    localCache.current = { ...localCache.current, ...movieCache }
  }, [movieCache])

  function goTo(index: number, dir: 'left' | 'right') {
    if (animating) return
    setPrevIndex(currentIndex)
    setDirection(dir)
    setAnimating(true)
    setCurrentIndex(index)
    setTimeout(() => {
      setPrevIndex(null)
      setAnimating(false)
    }, 300)
  }

  function prev() {
    const index = currentIndex === 0 ? images.length - 1 : currentIndex - 1
    goTo(index, 'right')
  }

  function next() {
    const index = currentIndex === images.length - 1 ? 0 : currentIndex + 1
    goTo(index, 'left')
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < 40) return
    if (delta < 0) next()
    else prev()
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
    

          <div
        className="relative bg-zinc-950 rounded-sm border border-zinc-800 overflow-hidden"
        style={{ aspectRatio: '4/3' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Sliding track — contains both images side by side */}
        <div
          className="absolute inset-0 flex"
          style={{
            width: '200%',
            transform: animating
              ? `translateX(${direction === 'left' ? '-50%' : '0%'})`
              : direction === 'left' ? '0%' : '-50%',
            transition: animating ? 'transform 300ms ease-in-out' : 'none',
          }}
        >
          {/* Left slot */}
          <div className="relative" style={{ width: '50%', height: '100%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl(images[direction === 'left' ? (prevIndex ?? currentIndex) : currentIndex].storage_path)}
              alt={theaterName}
              className="w-full h-full object-contain cursor-zoom-in"
              onClick={() => setOverlayImage(images[direction === 'left' ? (prevIndex ?? currentIndex) : currentIndex])}
              draggable={false}
            />
          </div>

          {/* Right slot */}
          <div className="relative" style={{ width: '50%', height: '100%' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl(images[direction === 'left' ? currentIndex : (prevIndex ?? currentIndex)].storage_path)}
              alt={theaterName}
              className="w-full h-full object-contain cursor-zoom-in"
              onClick={() => setOverlayImage(images[direction === 'left' ? currentIndex : (prevIndex ?? currentIndex)])}
              draggable={false}
            />
          </div>
        </div>

        {/* Arrows */}
        {isMultiple && (
          <>
            <button
              onClick={prev}
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-950/70 hover:bg-zinc-950/90 backdrop-blur-sm items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer z-10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              onClick={next}
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-zinc-950/70 hover:bg-zinc-950/90 backdrop-blur-sm items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer z-10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            <div className="absolute top-2 right-2 bg-zinc-950/60 backdrop-blur-sm rounded-full px-2 py-0.5 text-[10px] text-zinc-500 pointer-events-none z-10">
              {currentIndex + 1} / {images.length}
            </div>
          </>
        )}

        {isMultiple && currentIndex === 0 && !animating && (
          <div className="sm:hidden absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-zinc-950/60 backdrop-blur-sm rounded-full px-2.5 py-1 pointer-events-none">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" transform="rotate(90 12 12)"/>
            </svg>
            <span className="text-[9px] text-zinc-500">Swipe</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" transform="rotate(90 12 12)"/>
            </svg>
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
              onClick={() => goTo(i, i > currentIndex ? 'left' : 'right')}
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
                    className="border border-zinc-800 w-full aspect-[2/3] object-cover rounded shadow-md transition-all duration-200 hover:border-zinc-600"
                    alt={im.movies.title}
                  />
                ) : (
                  <div className="w-full aspect-[2/3] bg-zinc-800 rounded flex items-center justify-center text-[10px] text-zinc-600">
                    No poster
                  </div>
                )}
                 {/*
                <p className="text-[10px] mt-1.5 font-medium text-zinc-300 leading-tight line-clamp-2">{im.movies.title}</p>
                {im.movies.year && <p className="text-[10px] text-zinc-500">{im.movies.year}</p>} */}
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