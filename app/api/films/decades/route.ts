import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('movies')
    .select('year')
    .not('year', 'is', null)
    .gt('year', 0)
    .order('year', { ascending: false })

  if (!data) return NextResponse.json({ decades: [] })

  const decadeSet = new Set<number>()
  for (const m of data) {
    if (m.year) decadeSet.add(Math.floor(m.year / 10) * 10)
  }

  return NextResponse.json({ decades: [...decadeSet].sort((a, b) => b - a) })
}