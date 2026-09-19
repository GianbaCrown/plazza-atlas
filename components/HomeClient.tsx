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
  return `
    <div style="font-family:sans-serif;min-width:200px;cursor:default">
      ${img ? `
        <a href="/theaters/${t.slug}" data-theater-link="${t.slug}" style="display:block;width:100%;height:110px;background:#1a1a2e;border-radius:6px;margin-bottom:8px;overflow:hidden;cursor:pointer">
          <img
            src="${img}"
            style="width:100%;height:110px;object-fit:cover;border-radius:6px;display:block;opacity:0;transition:opacity 0.3s ease"
            onload="this.style.opacity=1"
          />
        </a>
      ` : ''}
      <p style="font-weight:600;margin:0 0 2px;color:#1a1a2e">${t.name}</p>
      <p style="font-size:12px;color:#888;margin:0 0 2px">${t.city ?? ''}${t.city && t.country ? ', ' : ''}${t.country ?? ''}</p>
      <p style="font-size:12px;color:#888;margin:0 0 8px">${dateRange(t)}</p>
      <a data-theater-link="${t.slug}" href="/theaters/${t.slug}" style="font-size:13px;color:#c8a96e;text-decoration:none">View theater →</a>
    </div>
  `
}



export default function HomeClient({ theaters }: { theaters: Theater[] }) {
  const router = useRouter()
    const [view, setView] = useState<'map' | 'list'>('map')

  useEffect(() => {
    const saved = localStorage.getItem('plazza_view') as 'map' | 'list' | null
    if (saved === 'list') setView('list')
  }, [])

  function changeView(v: 'map' | 'list') {
    setView(v)
    localStorage.setItem('plazza_view', v)
  }

  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const theatersRef = useRef<Theater[]>(theaters)
  const routerRef = useRef(router)

  useEffect(() => { theatersRef.current = theaters }, [theaters])
  useEffect(() => { routerRef.current = router }, [router])

   function flyToTheater(t: Theater) {
    setView('map')
    const map = mapRef.current
    if (!map) return
    setTimeout(() => {
      map.resize()
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
      transformRequest: (url) => {
        return { url }
      },
    })

    // Suppress tile 504 errors from console — these are transient server timeouts
    map.on('error', (e) => {
      if (e?.error?.message?.includes('504') || e?.error?.status === 504) return
      if (e?.error?.message?.includes('AJAXError')) return
    })

    mapRef.current = map
    popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, offset: 16, maxWidth: '240px' })    
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
      // Find densest area using a grid approach
      function findDenseCenter(theaters: Theater[]) {
        const gridSize = 8 // degrees
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
      const zoom = dense.count >= 5 ? 6 : dense.count >= 3 ? 5 : 4
      map.setCenter([dense.lng, dense.lat])
      map.setZoom(zoom)
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
              const bounds = new maplibregl.LngLatBounds(
                [Math.min(...lngs), Math.min(...lats)],
                [Math.max(...lngs), Math.max(...lats)]
              )
              map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 400 })
            } else {
              map.easeTo({ center: [lng, lat], zoom: zoom + 3, duration: 400 })
            }
          }
        } else {
          el.style.cssText = 'background:#c8a96e;width:14px;height:14px;border-radius:50%;border:2px solid #1a1a2e;cursor:pointer;'
          const theater = theatersRef.current.find((t) => t.id === c.properties.theaterId)

          el.onmouseenter = () => {
            if (!theater) return
            cancelClose()

            // Preload image with native browser constructor (avoid Next.js Image conflict)
            if (theater.image_path) {
              const img = new window.Image()
              img.src = imageUrl(theater.image_path)!
            }

            popupRef.current!
              .setLngLat([lng, lat])
              .setHTML(hoverPopupHTML(theater))
              .addTo(map)

            // Allow hovering into the popup without it closing
            const popupEl = popupRef.current!.getElement()
            popupEl.onmouseenter = cancelClose
            popupEl.onmouseleave = scheduleClose
          }

          el.onmouseleave = scheduleClose
        }

        markersOnScreen.push(
          new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map)
        )
      })
    }


    map.on('load', renderClusters)
    map.on('moveend', renderClusters)



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

  // Resize map when switching back to map view
  useEffect(() => {
    if (view === 'map') {
      setTimeout(() => mapRef.current?.resize(), 50)
    }
  }, [view])

  // Countries for filter — inside the component, before the return
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedDecade, setSelectedDecade] = useState('')

  const countries = [...new Set(theaters.map((t) => t.country).filter(Boolean))].sort()
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
   
     <div className="relative w-screen h-screen overflow-hidden">
      {/* Map — always mounted */}
                  <div style={{
        position: 'absolute', inset: 0,
        opacity: isMap ? 1 : 0,
        pointerEvents: isMap ? 'auto' : 'none',
        transition: 'opacity 150ms ease',
        willChange: 'opacity',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
      }}>
        <div
          ref={mapContainer}
          style={{
            position: 'absolute', inset: 0,
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
          }}
        />
      </div>

      {/* List view */}
            <div style={{
        position: 'absolute', inset: 0,
        opacity: isMap ? 0 : 1,
        pointerEvents: isMap ? 'none' : 'auto',
        transition: 'opacity 200ms ease',
        overflowY: 'auto',
        background: '#fafaf9',
      }}>
        <div className="pb-20 pt-16">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex gap-3 mb-6 flex-wrap">
              <select
                className="border rounded-lg px-3 py-2 text-sm cursor-pointer"
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
              >
                <option value="">All countries</option>
                {countries.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                className="border rounded-lg px-3 py-2 text-sm cursor-pointer"
                value={selectedDecade}
                onChange={(e) => setSelectedDecade(e.target.value)}
              >
                <option value="">All decades</option>
                {decades.map((d) => <option key={d} value={String(d)}>{d}s</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredTheaters.map((t) => (
                <Link key={t.id} href={`/theaters/${t.slug}`} className="group cursor-pointer">
                  <div className="aspect-[3/4] relative bg-gray-200 rounded-xl overflow-hidden">
                    {t.image_path && (
                      <Image
                        src={imageUrl(t.image_path)!}
                        alt={t.name} fill
                        className="object-cover group-hover:scale-105 transition duration-300"
                      />
                    )}
                  </div>
                  <p className="mt-2 font-medium text-sm">{t.name}</p>
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
        />
      </div>
    </div>
  )
}