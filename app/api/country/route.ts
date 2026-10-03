import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  // Try Cloudflare header first (available on Vercel Edge), then fall back to ip-api
  const cfCountry = req.headers.get('cf-ipcountry')
  if (cfCountry && cfCountry !== 'XX') {
    return NextResponse.json({ country: cfCountry })
  }

  // Fallback: use ip-api (free, no key required)
  try {
    const forwarded = req.headers.get('x-forwarded-for')
    const ip = forwarded?.split(',')[0].trim() ?? ''
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`)
    const data = await res.json()
    return NextResponse.json({ country: data.countryCode ?? 'US' })
  } catch {
    return NextResponse.json({ country: 'US' })
  }
}