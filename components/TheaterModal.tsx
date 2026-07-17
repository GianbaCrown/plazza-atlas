'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TheaterModal({ slug }: { slug: string }) {
  const router = useRouter()
  const [theater, setTheater] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(window.matchMedia('(max-width: 639px)').matches)
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('theaters')
      .select(`*, images ( id, storage_path, caption, credit, is_featured, sort_order, image_movies ( movies ( title, year, poster_path ) ) )`)
      .eq('slug', slug)
      .eq('status', 'published')
      .single()
      .then(({ data }: { data: any }) => { setTheater(data); setLoading(false) })
  }, [slug])

  function close() {
    setMounted(false)
    setTimeout(() => router.back(), 200)
  }

  const images = theater ? [...(theater.images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order) : []

 const panelTransform = isMobile
    ? (mounted ? 'translateY(0)' : 'translateY(100%)')
    : (mounted ? 'translateX(0)' : 'translateX(100%)')

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black transition-opacity duration-200"
        style={{ opacity: mounted ? 0.5 : 0 }}
        onClick={close}
      />
     <div
        className="absolute bg-white overflow-y-auto transition-transform duration-200 ease-out
          bottom-0 left-0 right-0 h-[85vh] rounded-t-2xl
          sm:bottom-auto sm:left-auto sm:top-0 sm:right-0 sm:h-full sm:w-[420px] sm:rounded-none"
        style={{ transform: panelTransform }}
      >
        <button
          onClick={close}
          className="sticky top-3 left-3 z-10 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-gray-600 hover:text-gray-900 ml-3"
        >
          ✕
        </button>

        <div className="px-6 pb-10 -mt-8">
          {loading ? (
            <p className="text-gray-400 text-sm">Loading...</p>
          ) : !theater ? (
            <p className="text-gray-400 text-sm">Theater not found.</p>
          ) : (
            <>
              <h1 className="text-2xl font-bold mb-1">{theater.name}</h1>
              <p className="text-gray-500 mb-6 text-sm">
                {theater.city}, {theater.country}
                {theater.year_opened && ` · ${theater.year_opened}`}
                {theater.year_closed && ` – ${theater.year_closed}`}
              </p>

              {images.map((img: any) => (
                <figure key={img.id} className="mb-6">
                  <div className="relative aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/${img.storage_path}`}
                      alt={img.caption ?? theater.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {(img.caption || img.credit) && (
                    <figcaption className="text-xs text-gray-500 mt-1">
                      {img.caption} {img.credit && <span className="italic">· {img.credit}</span>}
                    </figcaption>
                  )}
                  {img.image_movies?.length > 0 && (
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {img.image_movies.map((im: any, i: number) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs bg-gray-50 rounded px-2 py-1">
                          {im.movies.poster_path && (
                            <img src={`https://image.tmdb.org/t/p/w92${im.movies.poster_path}`} className="w-5 h-7 object-cover rounded" alt="" />
                          )}
                          <span>{im.movies.title} {im.movies.year && `(${im.movies.year})`}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </figure>
              ))}

              {theater.description && <p className="mb-6 text-sm leading-relaxed">{theater.description}</p>}

              {theater.nearest_theater_name && (
                <div className="border-t pt-4">
                  <p className="text-xs text-gray-500">Still showing nearby</p>
                  <p className="font-medium text-sm">{theater.nearest_theater_name}</p>
                  <p className="text-xs text-gray-500">{theater.nearest_theater_address}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}