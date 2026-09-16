import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json(null)
  const res = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?api_key=${process.env.TMDB_API_KEY}&append_to_response=credits`,
    { next: { revalidate: 86400 } }
  )
  if (!res.ok) return NextResponse.json(null)
  const data = await res.json()
  const director = data.credits?.crew?.find((c: any) => c.job === 'Director')?.name ?? null
  return NextResponse.json({
    title: data.title,
    year: data.release_date?.slice(0, 4) ?? null,
    overview: data.overview ?? null,
    poster_path: data.poster_path ?? null,
    director,
    tmdb_id: data.id,
  })
}