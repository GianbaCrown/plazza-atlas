import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const decade = searchParams.get('decade')
  const genre = searchParams.get('genre')
  const sort = searchParams.get('sort') ?? 'newest'
  const offset = Number(searchParams.get('offset') ?? 0)
  const limit = 60

  const supabase = await createClient()

  let query = supabase
    .from('published_movies')
    .select('id, tmdb_id, title, year, poster_path, popularity', { count: 'exact' })
    .not('poster_path', 'is', null)

  if (decade) query = query.gte('year', Number(decade)).lte('year', Number(decade) + 9)
  if (genre) query = query.contains('genre_ids', [Number(genre)])

  if (sort === 'newest') query = query.order('year', { ascending: false })
  else if (sort === 'oldest') query = query.order('year', { ascending: true })
  else if (sort === 'alpha-asc') query = query.order('title', { ascending: true })
  else if (sort === 'alpha-desc') query = query.order('title', { ascending: false })
  else if (sort === 'popular') query = query.order('popularity', { ascending: false, nullsFirst: false })

  // Tiebreaker so pagination is stable and never repeats a film
  query = query.order('id', { ascending: true })

  const { data, count } = await query.range(offset, offset + limit - 1)

  return NextResponse.json(
    { movies: data ?? [], total: count ?? 0 },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  )
}