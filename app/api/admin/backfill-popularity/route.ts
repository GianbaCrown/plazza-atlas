import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createAdminClient()

  const { data: movies } = await supabase
    .from('movies')
    .select('id, tmdb_id, title')
    .not('tmdb_id', 'is', null)

  if (!movies?.length) return NextResponse.json({ updated: 0 })

  // Fetch all TMDB data first
  const results: { id: string; vote_average: number; vote_count: number }[] = []

  for (const movie of movies) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.tmdb_id}?api_key=${process.env.TMDB_API_KEY}`
      )
      const data = await res.json()
      if (data.vote_average > 0 && data.vote_count > 0) {
        results.push({ id: movie.id, vote_average: data.vote_average, vote_count: data.vote_count })
      }
    } catch {}
  }

  // Bayesian parameters — same method as IMDB Top 250
  const mean = results.reduce((sum, r) => sum + r.vote_average, 0) / results.length
  const minimum = 500 // films below this vote count get pulled toward mean

  let updated = 0
  for (const r of results) {
    const score = (r.vote_count / (r.vote_count + minimum)) * r.vote_average
                + (minimum / (r.vote_count + minimum)) * mean
    await supabase
      .from('movies')
      .update({ popularity: score })
      .eq('id', r.id)
    updated++
  }

  return NextResponse.json({ updated, total: movies.length, mean: mean.toFixed(2) })
}