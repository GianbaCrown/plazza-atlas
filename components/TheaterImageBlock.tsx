'use client'
import { useState, useRef, useEffect } from 'react'
import ImageLightbox from './ImageLightbox'

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
  const [isSmaller, setIsSmaller] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    const el = imgRef.current
    if (!el) return
    function check() {
      if (!el) return
      setIsSmaller(el.naturalWidth > el.clientWidth || el.naturalHeight > el.clientHeight)
    }
    if (el.complete) check()
    else el.addEventListener('load', check)
    return () => el.removeEventListener('load', check)
  }, [])

  const gridCols = size === 'full'
    ? 'grid-cols-3 sm:grid-cols-4'
    : 'grid-cols-3 sm:grid-cols-4'

  return (
    <figure className="mb-8">
      <div
        className={`relative bg-gray-100 rounded-xl overflow-hidden ${size === 'full' ? 'aspect-[4/3]' : 'aspect-[4/3]'}`}
        style={{ cursor: isSmaller ? 'zoom-in' : 'default' }}
        onClick={() => isSmaller && setLightboxOpen(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
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
        {isSmaller && (
          <div className="absolute bottom-2 right-2 bg-black/40 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1 text-white text-xs pointer-events-none">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="7"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            Zoom
          </div>
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
          <div className={`grid ${gridCols} gap-3`}>
            {img.image_movies.map((im, i) => {
              const tmdbUrl = im.movies.tmdb_id
                ? `https://www.themoviedb.org/movie/${im.movies.tmdb_id}`
                : null
              const content = (
                <div className="text-center">
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
                  <p className="text-xs mt-1.5 font-medium leading-tight line-clamp-2">
                    {im.movies.title}
                  </p>
                  {im.movies.year && (
                    <p className="text-xs text-gray-400">{im.movies.year}</p>
                  )}
                </div>
              )
              return tmdbUrl ? (
                <a key={i} href={tmdbUrl} target="_blank" rel="noopener noreferrer" className="cursor-pointer">
                  {content}
                </a>
              ) : (
                <div key={i}>{content}</div>
              )
            })}
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
    </figure>
  )
}