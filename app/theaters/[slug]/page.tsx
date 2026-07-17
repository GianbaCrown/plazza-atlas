import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import SiteNav from '@/components/SiteNav'

export default async function TheaterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: theater } = await supabase
    .from('theaters')
    .select(`
      *,
      images (
        id, storage_path, caption, credit, is_featured, sort_order,
        image_movies ( movies ( title, year, poster_path ) )
      )
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!theater) return notFound()

  const images = [...(theater.images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)

  return (
    <>
      <SiteNav />
      <article className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-2">{theater.name}</h1>
        <p className="text-gray-500 mb-6">
          {theater.city}, {theater.country}
          {theater.year_opened && ` · ${theater.year_opened}`}
          {theater.year_closed && ` – ${theater.year_closed}`}
        </p>

        {images.map((img: any) => (
          <figure key={img.id} className="mb-8">
            <div className="relative aspect-[4/3] bg-gray-100 rounded overflow-hidden">
              <Image
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/${img.storage_path}`}
                alt={img.caption ?? theater.name}
                fill
                className="object-cover"
              />
            </div>
            {(img.caption || img.credit) && (
              <figcaption className="text-sm text-gray-500 mt-1">
                {img.caption} {img.credit && <span className="italic">· {img.credit}</span>}
              </figcaption>
            )}
            {img.image_movies?.length > 0 && (
              <div className="flex gap-3 mt-3 flex-wrap">
                {img.image_movies.map((im: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded px-2 py-1">
                    {im.movies.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${im.movies.poster_path}`}
                        className="w-6 h-9 object-cover rounded"
                        alt={im.movies.title}
                      />
                    )}
                    <span>{im.movies.title} {im.movies.year && `(${im.movies.year})`}</span>
                  </div>
                ))}
              </div>
            )}
          </figure>
        ))}

        {theater.description && <p className="mb-6 leading-relaxed">{theater.description}</p>}

        {theater.nearest_theater_name && (
          <div className="border-t pt-4 mt-6">
            <p className="text-sm text-gray-500">Still showing nearby</p>
            <p className="font-medium">{theater.nearest_theater_name}</p>
            <p className="text-sm text-gray-500">{theater.nearest_theater_address}</p>
          </div>
        )}
      </article>
    </>
  )
}