'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function MovieGrid({ movies }: { movies: any[] }) {
  if (!movies?.length) return null
  return (
    <div className="mt-4">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">Films on the marquee</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {movies.map((im: any, i: number) => (
          <div key={i} className="text-center">
            {im.movies.poster_path ? (
              <img
                src={`https://image.tmdb.org/t/p/w342${im.movies.poster_path}`}
                className="w-full aspect-[2/3] object-cover rounded-lg shadow-md"
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
  )
}

export default function TheaterModal({ slug }: { slug: string }) {
  const router = useRouter()
  const [theater, setTheater] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('theaters')
      .select(`*, sources ( id, name, url, image_path ), images ( id, storage_path, caption, credit, is_featured, sort_order, image_movies ( movies ( title, year, poster_path ) ) )`)
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
      .then(({ data }: { data: any }) => { setTheater(data); setLoading(false) })
  }, [slug])

  function close() {
    setMounted(false)
    setTimeout(() => router.back(), 220)
  }

  const images = theater ? [...(theater.images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order) : []

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black transition-opacity duration-200 ease-out"
        style={{ opacity: mounted ? 0.6 : 0 }}
        onClick={close}
      />

      {/* Panel */}
      <div
        className={`
          absolute bg-white overflow-y-auto
          bottom-0 left-0 right-0 h-[92vh] 
          sm:bottom-auto sm:right-0 sm:top-0 sm:left-auto sm:h-full sm:w-[80vw] sm:rounded-none 
        `}
        style={{
          transform: mounted
            ? 'translate(0, 0)'
            : (typeof window !== 'undefined' && window.innerWidth < 640)
              ? 'translateY(100%)'
              : 'translateX(100%)',
          transition: 'transform 220ms cubic-bezier(0.32, 0, 0.18, 1)',
        }}
      >
        {/* Close button — top right, always visible */}
        <button
          onClick={close}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/10 hover:bg-black/20 backdrop-blur-sm flex items-center justify-center text-gray-700 hover:text-gray-900 transition cursor-pointer"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>

        <div className="px-6 sm:px-10 py-8 pb-20">
          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-300">
              <svg className="animate-spin w-6 h-6" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          ) : !theater ? (
            <p className="text-gray-400">Theater not found.</p>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold mb-1 pr-10">{theater.name}</h1>
              <p className="text-gray-500 mb-8 text-sm">
                {theater.city}, {theater.country}
                {theater.year_opened && ` · ${theater.year_opened}`}
                {theater.year_closed && ` – ${theater.year_closed}`}
              </p>

              {images.map((img: any) => (
                <figure key={img.id} className="mb-8">
                  <div className="bg-gray-100 rounded-xl overflow-hidden">
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/${img.storage_path}`}
                      alt={img.caption ?? theater.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {(img.caption || img.credit) && (
                    <figcaption className="text-xs text-gray-400 mt-2">
                      {img.caption} {img.credit && <span className="italic">· {img.credit}</span>}
                    </figcaption>
                  )}
                  <MovieGrid movies={img.image_movies} />
                </figure>
              ))}

              {theater.description && (
                <div className="mb-8 text-sm leading-relaxed rich-text-content"
                  dangerouslySetInnerHTML={{ __html: theater.description }} />
              )}

              {theater.nearest_theater_name && (
                <div className="border-t pt-5 mt-8">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Still showing nearby</p>
                  <p className="font-medium text-sm">{theater.nearest_theater_name}</p>
                  <p className="text-xs text-gray-400">{theater.nearest_theater_address}</p>
                </div>
              )}

              {theater.sources && (
                <div className="border-t pt-5 mt-5 flex items-center gap-3">
                  {theater.sources.image_path && (
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/source-images/${theater.sources.image_path}`}
                      className="w-8 h-8 object-cover rounded" alt={theater.sources.name}
                    />
                  )}
                  <div>
                    <p className="text-xs text-gray-400">Source</p>
                    {theater.sources.url
                      ? <a href={theater.sources.url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium text-amber-600 hover:underline cursor-pointer">
                          {theater.sources.name}
                        </a>
                      : <p className="text-sm font-medium">{theater.sources.name}</p>
                    }
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}