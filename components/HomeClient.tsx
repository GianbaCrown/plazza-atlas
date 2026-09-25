'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Supercluster from 'supercluster'
import Image from 'next/image'
import Link from 'next/link'
import SiteHeader from './SiteHeader'

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
  const img = imageUrl(t.image_path)
  const dates = dateRange(t)
  return `
    <div style="width:220px;font-family:system-ui,sans-serif">
      ${img ? `
        
          <a href="/theaters/${t.slug}"
          data-theater-link="${t.slug}"
          style="display:block;width:100%;height:120px;overflow:hidden;cursor:pointer;background:#09090b;flex-shrink:0"
        >
          <img
            src="${img}"
            style="width:100%;height:120px;object-fit:cover;display:block;opacity:0;transition:opacity 0.25s ease;transform:scale(1);transition:opacity 0.25s ease,transform 0.3s ease"
            onload="this.style.opacity=1"
            onmouseover="this.style.transform='scale(1.03)'"
            onmouseout="this.style.transform='scale(1)'"
          />
        </a>
      ` : ''}
      <div style="padding:10px 12px 12px">
        <p style="font-weight:600;font-size:13px;color:#f4f4f5;margin:0 0 3px;line-height:1.3;letter-spacing:-0.01em">
          ${t.name}
        </p>
        <p style="font-size:11px;color:#71717a;margin:0 0 2px;letter-spacing:0.01em">
          ${[t.city, t.country].filter(Boolean).join(', ')}
        </p>
        ${dates
          ? `<p style="font-size:11px;color:#52525b;margin:0 0 10px">${dates}</p>`
          : `<div style="margin-bottom:10px"></div>`
        }
        
          <a data-theater-link="${t.slug}"
          href="/theaters/${t.slug}"
          style="font-size:11px;font-weight:500;color:#d97706;text-decoration:none;letter-spacing:0.03em;display:inline-flex;align-items:center;gap:3px"
        >
          View theater →
        </a>
      </div>
    </div>
  `
}
function FilterDropdown({
  label, value, options, onChange, isMap,
}: {
  label: string
  value: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
  isMap: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [])

  const buttonClass = isMap
    ? 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/10 border border-white/20 text-white/80 hover:bg-white/15 transition-colors cursor-pointer backdrop-blur-sm'
    : 'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer'

  const dropdownClass = isMap
    ? 'absolute top-full left-0 mt-1.5 min-w-[160px] bg-zinc-900/95 backdrop-blur-md border border-zinc-700/60 rounded-xl shadow-2xl overflow-hidden z-30'
    : 'absolute top-full left-0 mt-1.5 min-w-[160px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-30'

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className={buttonClass}>
        <span>{selected?.label ?? label}</span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms ease' }}
        >
          <polyline points="1,3 5,7 9,3" />
        </svg>
      </button>
      {open && (
        <div className={dropdownClass}>
          <ul className="py-1 max-h-64 overflow-y-auto">
            {options.map((o) => (
              <li key={o.value}>
                <button
                  onMouseDown={() => { onChange(o.value); setOpen(false) }}
                  className={`w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer ${
                    o.value === value
                      ? 'text-amber-400 bg-zinc-800'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
                  }`}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function HomeClient({ theaters }: { theaters: Theater[] }) {
  const router = useRouter()
  const [view, setView] = useState<'map' | 'list'>('map')
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedDecade, setSelectedDecade] = useState('')

  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const theatersRef = useRef<Theater[]>(theaters)
  const routerRef = useRef(router)

  useEffect(() => { theatersRef.current = theaters }, [theaters])
  useEffect(() => { routerRef.current = router }, [router])

  useEffect(() => {
    const saved = localStorage.getItem('plazza_view') as 'map' | 'list' | null
    if (saved === 'list') setView('list')
  }, [])

  function changeView(v: 'map' | 'list') {
    setView(v)
    localStorage.setItem('plazza_view', v)
  }

  // flyToTheater defined here — after refs, before map useEffect
  function flyToTheater(t: Theater) {
    changeView('map')
    popupRef.current?.remove()
    const map = mapRef.current
    if (!map) return
    setTimeout(() => {
      map.resize()
      const onMoveEnd = () => {
        if (popupRef.current) {
          popupRef.current
            .setLngLat([t.lng, t.lat])
            .setHTML(hoverPopupHTML(t))
            .addTo(map)
        }
        map.off('moveend', onMoveEnd)
      }
      map.on('moveend', onMoveEnd)
      map.flyTo({ center: [t.lng, t.lat], zoom: 14, speed: 1.4, curve: 1.6, essential: true })
    }, 50)
  }

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.protomaps.com/styles/v5/dark/en.json?key=${process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY}`,
      center: [10, 50],
      zoom: 3.5,
      transformRequest: (url) => ({ url }),
    })

    map.on('error', (e) => {
      if (e?.error?.message?.includes('504') || e?.error?.status === 504) return
      if (e?.error?.message?.includes('AJAXError')) return
    })

    mapRef.current = map
    popupRef.current = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      offset: 16,
      maxWidth: '240px',
    })

    popupRef.current.on('open', () => {
      const el = popupRef.current!.getElement()
      el.querySelectorAll('[data-theater-link]').forEach((link) => {
        const anchor = link as HTMLAnchorElement
        anchor.onclick = (e) => {
          e.preventDefault()
          routerRef.current.push(`/theaters/${anchor.dataset.theaterLink}`)
        }
      })
    })

    if (theaters.length > 0) {
      function findDenseCenter(theaters: Theater[]) {
        const gridSize = 8
        const counts: Record<string, { count: number; lats: number[]; lngs: number[] }> = {}
        theaters.forEach((t) => {
          const key = `${Math.floor(t.lat / gridSize)},${Math.floor(t.lng / gridSize)}`
          if (!counts[key]) counts[key] = { count: 0, lats: [], lngs: [] }
          counts[key].count++
          counts[key].lats.push(t.lat)
          counts[key].lngs.push(t.lng)
        })
        const densest = Object.values(counts).sort((a, b) => b.count - a.count)[0]
        const avgLat = densest.lats.reduce((a, b) => a + b, 0) / densest.lats.length
        const avgLng = densest.lngs.reduce((a, b) => a + b, 0) / densest.lngs.length
        return { lat: avgLat, lng: avgLng, count: densest.count }
      }
            const dense = findDenseCenter(theaters)
      const targetZoom = dense.count >= 5 ? 6 : dense.count >= 3 ? 5 : 4
      map.setCenter([dense.lng, dense.lat])
      map.setZoom(targetZoom - 4) // start zoomed out

      map.on('load', () => {
        map.easeTo({
          zoom: targetZoom,
          duration: 64000,
          easing: (t) => t * (2 - t), // ease-out curve
        })
      })
    }

    const index = new Supercluster({ radius: 60, maxZoom: 16 })
    index.load(theaters.map((t) => ({
      type: 'Feature',
      properties: { cluster: false, theaterId: t.id },
      geometry: { type: 'Point', coordinates: [t.lng, t.lat] },
    })) as any)

    const markersOnScreen: maplibregl.Marker[] = []
    let closeTimer: ReturnType<typeof setTimeout> | undefined
    let preventMapClose = false

    function scheduleClose() {
      closeTimer = setTimeout(() => popupRef.current?.remove(), 2000)
    }

    function cancelClose() {
      clearTimeout(closeTimer)
    }

    map.on('click', () => {
      if (!preventMapClose) popupRef.current?.remove()
    })

    function renderClusters() {
      markersOnScreen.forEach((m) => m.remove())
      markersOnScreen.length = 0
      const bounds = map.getBounds()
      const bbox: [number, number, number, number] = [
        bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()
      ]
      const zoom = Math.floor(map.getZoom())
      const clusters = index.getClusters(bbox, zoom)

      clusters.forEach((c: any) => {
        const [lng, lat] = c.geometry.coordinates
        const el = document.createElement('div')

        if (c.properties.cluster) {
          el.textContent = String(c.properties.point_count)
          el.style.cssText = 'background:#c8a96e;color:#1a1a2e;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:bold;cursor:pointer;'
          el.onclick = (e) => {
            e.stopPropagation()
            const leaves = index.getLeaves(c.properties.cluster_id, Infinity)
            if (leaves.length > 0) {
              const lngs = leaves.map((l: any) => l.geometry.coordinates[0])
              const lats = leaves.map((l: any) => l.geometry.coordinates[1])
              const fitBounds = new maplibregl.LngLatBounds(
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)]
              )
              map.fitBounds(fitBounds, { padding: 80, maxZoom: 14, duration: 400 })
            } else {
              map.easeTo({ center: [lng, lat], zoom: zoom + 3, duration: 400 })
            }
          }
        } else {
          el.style.cssText = 'background:#c8a96e;width:14px;height:14px;border-radius:50%;border:2px solid #1a1a2e;cursor:pointer;'
          const theater = theatersRef.current.find((t) => t.id === c.properties.theaterId)

          function showPopup() {
            if (!theater) return
            cancelClose()
            if (theater.image_path) {
              const img = new window.Image()
              img.src = imageUrl(theater.image_path)!
            }
            popupRef.current!
              .setLngLat([lng, lat])
              .setHTML(hoverPopupHTML(theater))
              .addTo(map)
            const popupEl = popupRef.current!.getElement()
            popupEl.onmouseenter = cancelClose
            popupEl.onmouseleave = scheduleClose
          }

          el.onmouseenter = showPopup
          el.onmouseleave = scheduleClose
          el.onclick = (e) => {
            e.stopPropagation()
            showPopup()
          }
        }

        markersOnScreen.push(
          new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
        )
      })
    }

    // Register each event exactly once
    map.on('load', renderClusters)
    map.on('moveend', renderClusters)

    let resizeTimer: ReturnType<typeof setTimeout>
    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => map.resize(), 100)
    })
    resizeObserver.observe(mapContainer.current)

    return () => {
      clearTimeout(resizeTimer)
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (view === 'map') mapRef.current?.resize()
  }, [view])

  const countries = [...new Set(theaters.map((t) => t.country).filter((c): c is string => !!c))].sort()
  const decades = Array.from({ length: 13 }, (_, i) => 1900 + i * 10)

  const filteredTheaters = theaters.filter((t) => {
    if (selectedCountry && t.country !== selectedCountry) return false
    if (selectedDecade) {
      const decade = Number(selectedDecade)
      const opened = t.year_opened ?? 0
      const closed = t.year_closed ?? 9999
      if (opened > decade + 9 || closed < decade) return false
    }
    return true
  })

  const isMap = view === 'map'

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden' }}>

      {/* Map layer */}
      <div style={{
        position: 'absolute', inset: 0,
        opacity: isMap ? 1 : 0,
        pointerEvents: isMap ? 'auto' : 'none',
        transition: 'opacity 150ms ease',
      }}>
        <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />
      </div>

      {/* List view */}
      <div
        className="bg-zinc-900"
        style={{
          position: 'absolute', inset: 0,
          opacity: isMap ? 0 : 1,
          pointerEvents: isMap ? 'none' : 'auto',
          transition: 'opacity 200ms ease',
          overflowY: 'auto',
        }}
      >
        <div className="pb-20 pt-16">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex gap-2 mb-6 flex-wrap">
              <FilterDropdown
                label="All countries"
                value={selectedCountry}
                isMap={false}
                onChange={setSelectedCountry}
                options={[
                  { label: 'All countries', value: '' },
                  ...countries.map((c) => ({ label: c, value: c })),
                ]}
              />
              <FilterDropdown
                label="All decades"
                value={selectedDecade}
                isMap={false}
                onChange={setSelectedDecade}
                options={[
                  { label: 'All decades', value: '' },
                  ...decades.map((d) => ({ label: `${d}s`, value: String(d) })),
                ]}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredTheaters.map((t) => (
                <Link key={t.id} href={`/theaters/${t.slug}`} className="group cursor-pointer">
                  <div className="border border-zinc-600 aspect-[3/4] relative bg-gray-200 rounded-sm overflow-hidden">
                    {t.image_path && (
                      <Image
                        src={imageUrl(t.image_path)!}
                        alt={t.name} fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                      />
                    )}
                  </div>
                  <p className="text-white mt-2 font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.city}, {t.country}</p>
                </Link>
              ))}
              {filteredTheaters.length === 0 && (
                <p className="text-gray-400 col-span-4 py-8">No theaters match this filter.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Header always on top */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <SiteHeader
          variant={isMap ? 'map' : 'page'}
          theaters={theaters}
          onTheaterSelect={flyToTheater}
          view={view}
          onViewChange={changeView}
          onLogoClick={() => changeView('map')}
        />
      </div>
    </div>
  )
}