import { NextResponse } from 'next/server'

function formatResult(r: any) {
  const a = r.address || {}
  const parts: string[] = []

  // Include venue/establishment name if present
  const venueName = a.amenity || a.leisure || a.tourism || a.shop || a.building || a.historic || null

  const road = [a.house_number, a.road].filter(Boolean).join(' ')
  const city = a.city || a.town || a.village || a.municipality || a.county || ''

  if (venueName) parts.push(venueName)
  if (road) parts.push(road)
  if (city) parts.push(city)
  if (a.country) parts.push(a.country)

  return {
    display_name: parts.join(', '),
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    city,
    country: a.country || '',
  }
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q')
  if (!q) return NextResponse.json([])
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&accept-language=en&q=${encodeURIComponent(q)}`,
    { headers: { 'User-Agent': 'PlazzaAtlas/1.0' } }
  )
  const data = await res.json()
  return NextResponse.json(data.map(formatResult))
}