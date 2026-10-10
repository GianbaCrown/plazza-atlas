import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const decade = searchParams.get('decade')
  const sort = searchParams.get('sort') ?? 'newest'
  const offset = Number(searchParams.get('offset') ?? 0)
  const limit = 30

  const supabase = await createClient()

  // Get movie IDs that appear in published theaters only
  const { data: linkedIds } = await supabase
    .from('image_movies')
    .select('movie_id, images!inner(theaters!inner(id))')
    .eq('images.theaters.status', 'published')

  if (!linkedIds?.length) return NextResponse.json({ movies: [], total: 0 })

  const movieIds = [...new Set(linkedIds.map((r: any) => r.movie_id))]

  let query = supabase
    .from('movies')
    .select('id, tmdb_id, title, year, poster_path, popularity', { count: 'exact' })
    .in('id', movieIds)
    .not('poster_path', 'is', null) // skip movies with no poster

  if (decade) {
    query = query.gte('year', Number(decade)).lte('year', Number(decade) + 9)
  }

  if (sort === 'newest') query = query.order('year', { ascending: false })
  else if (sort === 'oldest') query = query.order('year', { ascending: true })
  else if (sort === 'alpha-asc') query = query.order('title', { ascending: true })
  else if (sort === 'alpha-desc') query = query.order('title', { ascending: false })
  else if (sort === 'popular') query = query.order('popularity', { ascending: false })

  const { data, count } = await query.range(offset, offset + limit - 1)

  return NextResponse.json({ movies: data ?? [], total: count ?? 0 })
}