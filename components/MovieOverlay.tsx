'use client'
import { useEffect, useState } from 'react'

type Movie = {
  title: string
  year: number | string | null
  poster_path: string | null
  tmdb_id?: number | null
}

type FullMovie = {
  title: string
  year: string | null
  overview: string | null
  poster_path: string | null
  director: string | null
  tmdb_id: number
}

type Props = {
  movie: Movie
  onClose: () => void
}

export default function MovieOverlay({ movie, onClose }: Props) {
  const [full, setFull] = useState<FullMovie | null>(null)
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Fade in
    requestAnimationFrame(() => setVisible(true))

    // Fetch full details if we have a tmdb_id
    if (movie.tmdb_id) {
      fetch(`/api/tmdb/movie?id=${movie.tmdb_id}`)
        .then((r) => r.json())
        .then((data) => { setFull(data); setLoading(false) })
        .catch(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [movie.tmdb_id])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const poster = full?.poster_path ?? movie.poster_path
  const title = full?.title ?? movie.title
  const year = full?.year ?? movie.year
  const tmdbUrl = movie.tmdb_id ? `https://www.themoviedb.org/movie/${movie.tmdb_id}` : null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Card */}
      <div
        className="relative z-10 bg-[#111] rounded-2xl overflow-hidden shadow-2xl flex flex-col sm:flex-row w-full max-w-lg"
        style={{
          transform: visible ? 'scale(1)' : 'scale(0.96)',
          transition: 'transform 200ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Poster */}
        <div className="flex-shrink-0 w-full sm:w-40">
          {poster ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w342${poster}`}
              alt={title}
              className="w-full sm:h-full object-cover"
              style={{ maxHeight: '220px' }}
            />
          ) : (
            <div className="w-full h-40 sm:h-full bg-white/5 flex items-center justify-center text-white/20 text-xs">
              No poster
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 p-5 flex flex-col gap-3 min-w-0">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">{title}</h2>
            <p className="text-white/50 text-sm mt-0.5">
              {year}{full?.director && ` · ${full.director}`}
            </p>
          </div>

          {loading ? (
            <p className="text-white/30 text-sm">Loading...</p>
          ) : full?.overview ? (
            <p className="text-white/70 text-sm leading-relaxed line-clamp-6">{full.overview}</p>
          ) : (
            <p className="text-white/30 text-sm italic">No synopsis available.</p>
          )}

          <div className="flex items-center justify-between mt-auto pt-2">
                       {tmdbUrl && (
              
                <a href={tmdbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 text-sm transition cursor-pointer"
              >
                View on TMDB →
              </a>
            )}
            <button
              onClick={handleClose}
              className="text-white/30 hover:text-white/60 text-sm transition cursor-pointer ml-auto"
            >
              Close
            </button>
          </div>
        </div>

        {/* Close icon */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition cursor-pointer"
          aria-label="Close"
        >
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13"/>
            <line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>
      </div>
    </div>
  )
}