import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')
  if (!q) return NextResponse.json([])
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`,
    { headers: { 'User-Agent': 'PlazzaAtlas/1.0' } }
  )
  const data = await res.json()
  return NextResponse.json(
    data.map((r: any) => ({
      display_name: r.display_name,
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      city: r.address?.city || r.address?.town || r.address?.village || '',
      country: r.address?.country || '',
    }))
  )
}