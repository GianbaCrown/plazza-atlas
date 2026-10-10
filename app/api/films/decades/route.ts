import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  // Get distinct years from movies that appear in published theaters
  const { data } = await supabase
    .from('movies')
    .select('year, image_movies!inner(images!inner(theaters!inner(status)))')
    .eq('image_movies.images.theaters.status', 'published')
    .not('year', 'is', null)

  if (!data) return NextResponse.json({ decades: [] })

  // Derive unique decades
  const decadeSet = new Set<number>()
  for (const m of data) {
    if (m.year) decadeSet.add(Math.floor(m.year / 10) * 10)
  }

  const decades = [...decadeSet].sort((a, b) => b - a) // newest first
  return NextResponse.json({ decades })
}