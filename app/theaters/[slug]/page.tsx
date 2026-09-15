import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TheaterImageBlock from '@/components/TheaterImageBlock'

export default async function TheaterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: theater } = await supabase
    .from('theaters')
    .select(`*, sources ( id, name, url, image_path ), images ( id, storage_path, caption, credit, is_featured, sort_order, image_movies ( movie_id, movies ( title, year, poster_path, tmdb_id ) ) )`)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!theater) return notFound()

  const images = [...(theater.images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {/* Minimal standalone header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition flex items-center gap-1.5 cursor-pointer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12,19 5,12 12,5"/>
          </svg>
          Map
        </Link>
        <span className="text-gray-200">|</span>
        <Link href="/?view=list" className="text-sm text-gray-500 hover:text-gray-900 transition cursor-pointer">
          List view
        </Link>
      </div>

      <article className="max-w-3xl mx-auto px-4 py-8 pb-20">
        <h1 className="text-3xl font-bold mb-1">{theater.name}</h1>
        <p className="text-gray-500 mb-8">
          {theater.city}, {theater.country}
          {theater.year_opened && ` · ${theater.year_opened}`}
          {theater.year_closed && ` – ${theater.year_closed}`}
        </p>

        {images.map((img: any) => (
          <TheaterImageBlock key={img.id} img={img} theaterName={theater.name} size="full" />
        ))}

        {theater.description && (
          <div className="mb-8 leading-relaxed rich-text-content"
            dangerouslySetInnerHTML={{ __html: theater.description }} />
        )}

        {theater.nearest_theater_name && (
          <div className="border-t pt-5 mt-8">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Still showing nearby</p>
            <p className="font-medium">{theater.nearest_theater_name}</p>
            <p className="text-sm text-gray-400">{theater.nearest_theater_address}</p>
          </div>
        )}

        {(theater.sources || theater.source_url) && (
          <div className="border-t pt-5 mt-5 flex items-center gap-3">
            {theater.sources?.image_path && (
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/source-images/${theater.sources.image_path}`}
                className="w-10 h-10 object-cover rounded" alt={theater.sources?.name}
              />
            )}
            <div>
              <p className="text-xs text-gray-400">Source</p>
              {theater.source_url ? (
                <a href={theater.source_url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-amber-600 hover:underline cursor-pointer">
                  {theater.sources?.name ?? theater.source_url}
                </a>
              ) : theater.sources?.url ? (
                <a href={theater.sources.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-amber-600 hover:underline cursor-pointer">
                  {theater.sources.name}
                </a>
              ) : (
                <p className="text-sm font-medium">{theater.sources?.name}</p>
              )}
            </div>
          </div>
        )}
      </article>
    </div>
  )
}