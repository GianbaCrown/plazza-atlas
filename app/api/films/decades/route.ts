import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const revalidate = 3600

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('published_movies')
    .select('year')
    .gt('year', 0)

  const set = new Set<number>()
  for (const m of data ?? []) if (m.year) set.add(Math.floor(m.year / 10) * 10)

  return NextResponse.json({ decades: [...set].sort((a, b) => b - a) })
}