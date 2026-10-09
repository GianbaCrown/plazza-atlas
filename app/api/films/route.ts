import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const decade = searchParams.get('decade')
  const sort = searchParams.get('sort') ?? 'newest'
  const offset = Number(searchParams.get('offset') ?? 0)
  const limit = 30

  const supabase = await createClient()

  // Get all movies that appear in at least one published theater
  let query = supabase
    .from('movies')
    .select(`
      id, tmdb_id, title, year, poster_path,
      image_movies!inner (
        images!inner (
          theaters!inner ( id, name, slug, city, country, lat, lng, status )
        )
      )
    `, { count: 'exact' })
    .eq('image_movies.images.theaters.status', 'published')

  if (decade) {
    const from = Number(decade)
    const to = from + 9
    query = query.gte('year', from).lte('year', to)
  }

  if (sort === 'newest') query = query.order('year', { ascending: false })
  else if (sort === 'oldest') query = query.order('year', { ascending: true })
  else if (sort === 'alpha-asc') query = query.order('title', { ascending: true })
  else if (sort === 'alpha-desc') query = query.order('title', { ascending: false })
  else if (sort === 'popular') query = query.order('popularity', { ascending: false })

  const { data, count, error } = await query.range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ movies: data ?? [], total: count ?? 0 })
}