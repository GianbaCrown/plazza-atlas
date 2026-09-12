import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import SiteHeader from '@/components/SiteHeader'

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

export default async function TheaterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: theater } = await supabase
    .from('theaters')
    .select(`*, sources ( id, name, url, image_path ), images ( id, storage_path, caption, credit, is_featured, sort_order, image_movies ( movies ( title, year, poster_path ) ) )`)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!theater) return notFound()

  const images = [...(theater.images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)

  return (
    <div className="min-h-screen pb-20">
      <SiteHeader variant="page" theaters={[]} />
      <article className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-1">{theater.name}</h1>
        <p className="text-gray-500 mb-8">
          {theater.city}, {theater.country}
          {theater.year_opened && ` · ${theater.year_opened}`}
          {theater.year_closed && ` – ${theater.year_closed}`}
        </p>

        {images.map((img: any) => (
          <figure key={img.id} className="mb-10">
            <div className="relative aspect-[4/3] bg-gray-100 rounded-2xl overflow-hidden">
              <Image
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/${img.storage_path}`}
                alt={img.caption ?? theater.name} fill className="object-cover"
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

        {theater.sources && (
          <div className="border-t pt-5 mt-5 flex items-center gap-3">
            {theater.sources.image_path && (
              <img
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/source-images/${theater.sources.image_path}`}
                className="w-10 h-10 object-cover rounded" alt={theater.sources.name}
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
      </article>
    </div>
  )
}