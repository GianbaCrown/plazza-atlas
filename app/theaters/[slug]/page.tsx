import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import TheaterImageBlock from '@/components/TheaterImageBlock'

export default async function TheaterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: theater } = await supabase
    .from('theaters')
       .select(`*, theater_sources ( id, source_id, source_url, sort_order, sources ( id, name, url, image_path ) ), images ( id, storage_path, caption, credit, is_featured, sort_order, image_movies ( movie_id, movies ( title, year, poster_path, tmdb_id ) ) ), theater_names ( id, name, year_from, year_to, sort_order )`)
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!theater) return notFound()

  const images = [...(theater.images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order)

  return (
    <div className="min-h-screen bg-zinc-900">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12,19 5,12 12,5"/>
          </svg>
          Map
        </Link>
        <span className="text-zinc-700 text-xs">·</span>
        <Link href="/?view=list" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">
          List view
        </Link>
      </div>

      <article className="max-w-2xl mx-auto px-5 py-8 pb-24">

        {/* Still open */}
        {theater.is_open && (
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="inline-flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60"/>
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"/>
              </span>
              <span className="text-[10px] font-medium tracking-widest uppercase text-emerald-500/80">
                Still open today
              </span>
            </div>
            {theater.website && (
              <>
                <span className="text-zinc-700 text-xs">·</span>
                <a
                  href={theater.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-medium tracking-widest uppercase text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
                >
                  Book now →
                </a>
              </>
            )}
          </div>
        )}

        {/* Title */}
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight leading-snug mb-1.5">
          {theater.name}
        </h1>

        <div className="flex items-center gap-2 flex-wrap mb-7">
          <span className="text-zinc-500 text-xs tracking-wide">
            {[theater.city, theater.country].filter(Boolean).join(', ')}
          </span>
          {(theater.year_opened || theater.year_closed) && (
            <>
              <span className="text-zinc-700 text-xs">·</span>
              <span className="text-zinc-500 text-xs">
                {theater.year_opened && theater.year_closed
                  ? `${theater.year_opened} – ${theater.year_closed}`
                  : theater.year_opened
                    ? `est. ${theater.year_opened}`
                    : `closed ${theater.year_closed}`}
              </span>
            </>
          )}
        </div>

        {/* Images */}
        {images.length > 0 && (
          <TheaterImageBlock
            images={images}
            theaterName={theater.name}
          />
        )}

        {/* Description */}
        {theater.description && (
          <div
            className="mb-8 text-sm text-zinc-400 leading-relaxed rich-text-content"
            dangerouslySetInnerHTML={{ __html: theater.description }}
          />
        )}

                {theater.theater_names?.length > 0 && (
          <div className="mb-7 mt-6">
            <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-600 mb-3">
              Previous names
            </p>
            <div className="border border-zinc-800 rounded-lg overflow-hidden">
              {[...theater.theater_names]
                .sort((a: any, b: any) => a.sort_order - b.sort_order)
                .map((n: any, i: number) => (
                  <div key={n.id} className={`flex items-center justify-between px-4 py-2.5 text-xs ${i > 0 ? 'border-t border-zinc-800' : ''}`}>
                    <span className="text-zinc-300 font-medium">{n.name}</span>
                    <span className="text-zinc-600 tabular-nums flex-shrink-0 ml-4">
                      {n.year_from && n.year_to
                        ? `${n.year_from} – ${n.year_to}`
                        : n.year_from
                          ? `from ${n.year_from}`
                          : n.year_to
                            ? `until ${n.year_to}`
                            : ''}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Nearest theater */}
        {theater.nearest_theater_name && (
          <div className="border border-zinc-800 rounded-lg px-5 py-4 mb-6">
            <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-600 mb-2">
              Still showing nearby
            </p>
            <p className="text-sm font-semibold text-zinc-200 mb-0.5">{theater.nearest_theater_name}</p>
            {theater.nearest_theater_address && (
              <p className="text-xs text-zinc-600 mb-2">{theater.nearest_theater_address}</p>
            )}
            {theater.nearest_theater_website && (
              <a
                href={theater.nearest_theater_website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 transition-colors cursor-pointer"
              >
                Visit website →
              </a>
            )}
          </div>
        )}

        {/* Source */}
                    {theater.theater_sources?.length > 0 && (
                <div className="pt-4 border-t border-zinc-900 space-y-2">
                  {[...theater.theater_sources]
                    .sort((a: any, b: any) => a.sort_order - b.sort_order)
                    .map((ts: any) => {
                      const name = ts.sources?.name
                      const url = ts.source_url || ts.sources?.url
                      return (
                        <div key={ts.id} className="flex items-center gap-2.5">
                          {ts.sources?.image_path && (
                            <img
                              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/source-images/${ts.sources.image_path}`}
                              className="w-5 h-5 object-cover rounded opacity-60"
                              alt={name}
                            />
                          )}
                          <p className="text-[10px] text-zinc-700">
                            Source:{' '}
                            {url ? (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer underline underline-offset-2"
                              >
                                {name ?? url}
                              </a>
                            ) : (
                              <span className="text-zinc-600">{name}</span>
                            )}
                          </p>
                        </div>
                      )
                    })}
                </div>
              )}
      </article>
    </div>
  )
}