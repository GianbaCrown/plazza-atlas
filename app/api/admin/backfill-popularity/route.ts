import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createAdminClient()
  const { data: movies } = await supabase
    .from('movies')
    .select('id, tmdb_id')
    .not('tmdb_id', 'is', null)
    .eq('popularity', 0)

  if (!movies?.length) return NextResponse.json({ updated: 0 })

  let updated = 0
  for (const movie of movies) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${process.env.TMDB_API_KEY}`
      )
      const data = await res.json()
      if (data.popularity) {
        await supabase
          .from('movies')
          .update({ popularity: data.popularity })
          .eq('id', movie.id)
        updated++
      }
    } catch {}
  }

  return NextResponse.json({ updated })
}