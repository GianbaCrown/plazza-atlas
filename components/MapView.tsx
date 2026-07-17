'use client'
import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Supercluster from 'supercluster'
import { useRouter } from 'next/navigation'
import Logo from './Logo'

type Theater = {
  id: string; name: string; slug: string; lat: number; lng: number
  city?: string; country?: string; year_opened?: number; year_closed?: number; image_path?: string | null
}

function dateRange(t: Theater) {
  if (t.year_opened && t.year_closed) return `${t.year_opened} – ${t.year_closed}`
  if (t.year_opened) return `Opened ${t.year_opened}`
  if (t.year_closed) return `Closed ${t.year_closed}`
  return ''
}

function imageUrl(path?: string | null) {
  if (!path) return null
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/${path}`
}

function hoverPopupHTML(t: Theater) {
  return `
    <div style="font-family:sans-serif;min-width:160px">
      <p style="font-weight:600;margin:0 0 2px;color:#1a1a2e">${t.name}</p>
      <p style="font-size:12px;color:#888;margin:0 0 6px">${dateRange(t)}</p>
      <a data-theater-link="${t.slug}" href="/theaters/${t.slug}" style="font-size:13px;color:#c8a96e;text-decoration:none">View theater →</a>
    </div>
  `
}

function richPopupHTML(t: Theater) {
  const img = imageUrl(t.image_path)
  return `
    <div style="font-family:sans-serif;min-width:200px">
      ${img ? `<img src="${img}" style="width:100%;height:110px;object-fit:cover;border-radius:6px;margin-bottom:8px" />` : ''}
      <p style="font-weight:600;margin:0 0 2px;color:#1a1a2e">${t.name}</p>
      <p style="font-size:12px;color:#888;margin:0 0 2px">${t.city ?? ''}${t.city && t.country ? ', ' : ''}${t.country ?? ''}</p>
      <p style="font-size:12px;color:#888;margin:0 0 8px">${dateRange(t)}</p>
      <a data-theater-link="${t.slug}" href="/theaters/${t.slug}" style="font-size:13px;color:#c8a96e;text-decoration:none">View theater →</a>
    </div>
  `
}

export default function MapView({ theaters }: { theaters: Theater[] }) {
  const router = useRouter()
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const theatersRef = useRef<Theater[]>(theaters)
  const routerRef = useRef(router)
  const [randomLoading, setRandomLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Theater[]>([])
  const [open, setOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)

  useEffect(() => { theatersRef.current = theaters }, [theaters])
  useEffect(() => { routerRef.current = router }, [router])

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.protomaps.com/styles/v5/dark/en.json?key=${process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY}`,
      center: [10, 50],
      zoom: 3.5,
    })

    mapRef.current = map
    popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 16 })

    popupRef.current.on('open', () => {
      const el = popupRef.current!.getElement()
      const link = el.querySelector('[data-theater-link]') as HTMLAnchorElement | null
      if (link) {
        link.onclick = (e) => {
          e.preventDefault()
          routerRef.current.push(`/theaters/${link.dataset.theaterLink}`)
        }
      }
    })

    if (theaters.length > 0) {
      const bounds = new maplibregl.LngLatBounds()
      theaters.forEach((t) => bounds.extend([t.lng, t.lat]))
      map.fitBounds(bounds, { padding: 80, maxZoom: 8, duration: 0 })
    }

    const index = new Supercluster({ radius: 60, maxZoom: 16 })
    index.load(
      theaters.map((t) => ({
        type: 'Feature',
        properties: { cluster: false, theaterId: t.id },
        geometry: { type: 'Point', coordinates: [t.lng, t.lat] },
      })) as any
    )

    const markersOnScreen: maplibregl.Marker[] = []
    const closeTimeoutRef = { current: undefined as ReturnType<typeof setTimeout> | undefined }
    function scheduleClose() {
      closeTimeoutRef.current = setTimeout(() => popupRef.current?.remove(), 350)
    }

    function renderClusters() {
      markersOnScreen.forEach((m) => m.remove())
      markersOnScreen.length = 0

      const bounds = map.getBounds()
      const bbox: [number, number, number, number] = [
        bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth(),
      ]
      const zoom = Math.floor(map.getZoom())
      const clusters = index.getClusters(bbox, zoom)

      clusters.forEach((c: any) => {
        const [lng, lat] = c.geometry.coordinates
        const el = document.createElement('div')

        if (c.properties.cluster) {
          el.textContent = String(c.properties.point_count)
          el.style.cssText =
            'background:#c8a96e;color:#1a1a2e;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:bold;cursor:pointer;'
          el.onclick = () => map.easeTo({ center: [lng, lat], zoom: zoom + 2 })
        } else {
          el.style.cssText =
            'background:#c8a96e;width:14px;height:14px;border-radius:50%;border:2px solid #1a1a2e;cursor:pointer;'

          const theater = theatersRef.current.find((t) => t.id === c.properties.theaterId)

          el.onmouseenter = () => {
            if (!theater) return
            clearTimeout(closeTimeoutRef.current)
            popupRef.current!.setLngLat([lng, lat]).setHTML(hoverPopupHTML(theater)).addTo(map)
            const popupEl = popupRef.current!.getElement()
            popupEl.onmouseenter = () => clearTimeout(closeTimeoutRef.current)
            popupEl.onmouseleave = scheduleClose
          }
          el.onmouseleave = scheduleClose
          el.onclick = () => {
            if (!theater) return
            clearTimeout(closeTimeoutRef.current)
            popupRef.current!.setLngLat([lng, lat]).setHTML(richPopupHTML(theater)).addTo(map)
          }
        }

        const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
        markersOnScreen.push(marker)
      })
    }

    map.on('load', renderClusters)
    map.on('moveend', renderClusters)

    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(mapContainer.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [theaters])

  function handleSearchChange(value: string) {
    setQuery(value)
    if (!value) { setResults([]); setOpen(false); return }
    const lower = value.toLowerCase()
    setResults(
      theaters.filter((t) =>
        t.name.toLowerCase().includes(lower) ||
        t.city?.toLowerCase().includes(lower) ||
        t.country?.toLowerCase().includes(lower)
      ).slice(0, 6)
    )
    setOpen(true)
  }

  function flyToTheater(t: Theater) {
    const map = mapRef.current
    if (!map) return
    setOpen(false)
    setQuery(t.name)
    setMobileSearchOpen(false)

    const onMoveEnd = () => {
      popupRef.current!.setLngLat([t.lng, t.lat]).setHTML(richPopupHTML(t)).addTo(map)
      map.off('moveend', onMoveEnd)
    }
    map.on('moveend', onMoveEnd)

    map.flyTo({ center: [t.lng, t.lat], zoom: 14, speed: 1.4, curve: 1.6, essential: true })
  }

  async function handleRandom() {
    setRandomLoading(true)
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { count } = await supabase
      .from('theaters')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published')
    if (!count) { setRandomLoading(false); return }
    const offset = Math.floor(Math.random() * count)
    const { data } = await supabase
      .from('theaters')
      .select('slug')
      .eq('status', 'published')
      .range(offset, offset)
    if (data?.[0]) router.push(`/theaters/${data[0].slug}`)
    setRandomLoading(false)
  }

  const SearchDropdown = () => (
    open && results.length > 0 ? (
      <ul className="bg-white/95 rounded-xl mt-1 shadow-lg divide-y overflow-hidden">
        {results.map((t) => (
          <li key={t.id} className="px-4 py-2 text-sm hover:bg-amber-50 cursor-pointer"
            onMouseDown={() => flyToTheater(t)}>
            <span className="font-medium">{t.name}</span>
            <span className="text-gray-500"> — {t.city}, {t.country}</span>
          </li>
        ))}
      </ul>
    ) : null
  )

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
      <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />

      {/* Logo, top-left */}
      <div className="absolute top-4 left-4 z-10">
        <Logo variant="light" />
      </div>

      {/* Desktop search — small, top-right */}
      <div className="hidden sm:block absolute top-4 right-4 z-10 w-64">
        <input
          type="text"
          value={query}
          placeholder="Search theaters..."
          className="w-full px-4 py-2 rounded-full shadow bg-white/95 text-sm"
          onChange={(e) => handleSearchChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        <SearchDropdown />
      </div>

      {/* Mobile search — collapses to icon */}
      <div className="sm:hidden absolute top-4 right-4 z-10">
        {!mobileSearchOpen ? (
          <button
            onClick={() => setMobileSearchOpen(true)}
            className="w-10 h-10 rounded-full bg-white/95 shadow flex items-center justify-center"
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        ) : (
          <div style={{ width: 'calc(100vw - 32px)' }}>
            <input
              autoFocus
              type="text"
              value={query}
              placeholder="Search theaters..."
              className="w-full px-4 py-2 rounded-full shadow bg-white/95 text-sm"
              onChange={(e) => handleSearchChange(e.target.value)}
              onBlur={() => setTimeout(() => { setOpen(false); if (!query) setMobileSearchOpen(false) }, 150)}
            />
            <SearchDropdown />
          </div>
        )}
      </div>

      <div className="absolute bottom-4 left-4 grid grid-cols-2 gap-2 z-10 text-sm">
        <button onClick={() => router.push('/about')} className="px-3 py-2 rounded bg-white/95 shadow text-center">About</button>
        <button onClick={() => router.push('/submit')} className="px-3 py-2 rounded bg-white/95 shadow text-center">Submit a theater</button>
        <button onClick={() => router.push('/list')} className="px-3 py-2 rounded bg-white/95 shadow text-center">List view</button>
        <button
          onClick={handleRandom}
          disabled={randomLoading}
          className="px-3 py-2 rounded bg-amber-600 text-white font-medium shadow"
        >
          Random
        </button>
      </div>
    </div>
  )
}