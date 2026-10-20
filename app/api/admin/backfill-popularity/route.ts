import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()

  const { data: movies } = await supabase
    .from('movies')
    .select('id, tmdb_id')
    .not('tmdb_id', 'is', null)

  if (!movies?.length) return NextResponse.json({ updated: 0 })

  let updated = 0

  for (const movie of movies) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${process.env.TMDB_API_KEY}`
      )
      const data = await res.json()

      const votes = data.vote_count ?? 0
      const avg = data.vote_average ?? 0
      const score = votes > 0 ? avg * Math.log10(votes) : 0

      await supabase
        .from('movies')
        .update({
          popularity: score,
          genre_ids: data.genres?.map((g: any) => g.id) ?? [],
          primary_genre: data.genres?.[0]?.id ?? null,
        })
        .eq('id', movie.id)
      updated++
    } catch {}
  }

  return NextResponse.json({ updated, total: movies.length })
}