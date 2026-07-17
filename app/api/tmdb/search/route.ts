import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')
  if (!q) return NextResponse.json([])
  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(q)}&api_key=${process.env.TMDB_API_KEY}`
  )
  const data = await res.json()
  return NextResponse.json(
    data.results?.slice(0, 5).map((m: any) => ({
      tmdb_id: m.id, title: m.title, year: m.release_date?.slice(0, 4), poster_path: m.poster_path,
    })) ?? []
  )
}