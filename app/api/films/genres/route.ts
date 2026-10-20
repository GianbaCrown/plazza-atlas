import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 3600

const TMDB_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Science Fiction',
  53: 'Thriller', 10752: 'War', 37: 'Western',
}

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('published_movies')
    .select('primary_genre')
    .not('primary_genre', 'is', null)

  const ids = new Set<number>((data ?? []).map((m: any) => m.primary_genre))
  const genres = [...ids]
    .filter((id) => TMDB_GENRES[id])
    .map((id) => ({ id, name: TMDB_GENRES[id] }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return NextResponse.json({ genres })
}