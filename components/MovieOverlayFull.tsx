'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'

type Theater = {
  id: string; name: string; slug: string; city?: string; country?: string
  lat: number; lng: number
}

type Movie = {
  title: string
  year: number | string | null
  poster_path: string | null
  tmdb_id?: number | null
}

type Props = {
  movie: Movie
  onClose: () => void
  onFlyToTheater?: (t: Theater) => void
}

type FullMovie = {
  title: string
  year: string | null
  overview: string | null
  poster_path: string | null
  director: string | null
  tmdb_id: number
}

export default function MovieOverlayFull({ movie, onClose, onFlyToTheater }: Props) {
  const [full, setFull] = useState<FullMovie | null>(null)
  const [theaters, setTheaters] = useState<Theater[]>([])
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const fetchAll = async () => {
      const [movieRes, theatersRes] = await Promise.all([
        movie.tmdb_id ? fetch(`/api/tmdb/movie?id=${movie.tmdb_id}`).then(r => r.json()) : Promise.resolve(null),
        fetchTheaters(),
      ])
      setFull(movieRes)
      setTheaters(theatersRes)
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    }

    fetchAll()
  }, [movie.tmdb_id])

  async function fetchTheaters(): Promise<Theater[]> {
    if (!movie.tmdb_id) return []
    const supabase = createClient()

    // Get all image_movies entries for this movie
    const { data: movieData } = await supabase
      .from('movies')
      .select('id')
      .eq('tmdb_id', movie.tmdb_id)
      .single()

    if (!movieData) return []

    const { data: links } = await supabase
      .from('image_movies')
      .select('image_id')
      .eq('movie_id', movieData.id)

    if (!links?.length) return []

    const imageIds = links.map((l: any) => l.image_id)

    const { data: imageRows } = await supabase
      .from('images')
      .select('theater_id')
      .in('id', imageIds)

    if (!imageRows?.length) return []

    const theaterIds = [...new Set(imageRows.map((r: any) => r.theater_id))]

    const { data: theaterRows } = await supabase
      .from('theaters')
      .select('id, name, slug, city, country, lat, lng')
      .in('id', theaterIds)
      .eq('status', 'published')

    return theaterRows ?? []
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  function handleTheaterClick(t: Theater) {
    handleClose()
    if (onFlyToTheater) {
      setTimeout(() => onFlyToTheater(t), 250)
    }
  }

  const poster = full?.poster_path ?? movie.poster_path
  const title = full?.title ?? movie.title
  const year = full?.year ?? movie.year
  const tmdbUrl = movie.tmdb_id ? `https://www.themoviedb.org/movie/${movie.tmdb_id}` : null

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ touchAction: 'none' }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm transition-opacity duration-150"
        style={{ opacity: visible ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Card */}
      <div
        className="relative z-10 bg-[#111] rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg flex flex-col"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 150ms ease, transform 220ms cubic-bezier(0.32, 0, 0.18, 1)',
          maxHeight: '85dvh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top section — poster + info */}
        <div className="flex flex-row flex-shrink-0">
          <div className="w-32 flex-shrink-0 bg-zinc-950">
            {poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://image.tmdb.org/t/p/w342${poster}`}
                alt={String(title)}
                className="w-full h-full object-cover"
                style={{ minHeight: '160px', display: 'block' }}
              />
            ) : (
              <div className="w-full min-h-[160px] flex items-center justify-center text-zinc-700 text-xs">
                No poster
              </div>
            )}
          </div>
          <div className="flex-1 p-4 flex flex-col gap-2 min-w-0">
            <div className="pr-5">
              <h2 className="text-white font-semibold text-sm leading-snug">{title}</h2>
              <p className="text-zinc-500 text-xs mt-0.5">
                {year}{full?.director && ` · ${full.director}`}
              </p>
            </div>
            {full?.overview && (
              <p className="text-zinc-400 text-xs leading-relaxed line-clamp-4">{full.overview}</p>
            )}
            {tmdbUrl && (
              <a
                href={tmdbUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-500 hover:text-amber-400 text-xs transition-colors cursor-pointer mt-auto"
              >
                View on TMDB →
              </a>
            )}
          </div>
        </div>

        {/* Theaters section — scrollable */}
        {theaters.length > 0 && (
          <div className="border-t border-zinc-800 overflow-y-auto">
            <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-600 px-4 pt-3 pb-2">
              Featured in {theaters.length} {theaters.length === 1 ? 'theater' : 'theaters'}
            </p>
            <div className="divide-y divide-zinc-800/60">
              {theaters.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTheaterClick(t)}
                  className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-zinc-800/50 transition-colors cursor-pointer text-left"
                >
                  <div>
                    <p className="text-zinc-200 text-xs font-medium">{t.name}</p>
                    <p className="text-zinc-600 text-[10px]">{[t.city, t.country].filter(Boolean).join(', ')}</p>
                  </div>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#71717a" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 ml-2">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleClose}
          className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-zinc-500 hover:text-white transition cursor-pointer"
        >
          <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13"/>
            <line x1="13" y1="1" x2="1" y2="13"/>
          </svg>
        </button>
      </div>
    </div>,
    document.body
  )
}