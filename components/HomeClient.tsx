'use client'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
      ${img ? `<img src="${img}" style="width:100%;height:110px;object-fit:cover;border-radius:6px;margin-bottom:8px"/>` : ''}
      <p style="font-weight:600;margin:0 0 2px;color:#1a1a2e">${t.name}</p>
      <p style="font-size:12px;color:#888;margin:0 0 2px">${t.city ?? ''}${t.city && t.country ? ', ' : ''}${t.country ?? ''}</p>
      <p style="font-size:12px;color:#888;margin:0 0 8px">${dateRange(t)}</p>
      <a data-theater-link="${t.slug}" href="/theaters/${t.slug}" style="font-size:13px;color:#c8a96e;text-decoration:none">View theater →</a>
    </div>
  `
}

export default function HomeClient({ theaters }: { theaters: Theater[] }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isListView = searchParams.get('view') === 'list'

  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const theatersRef = useRef<Theater[]>(theaters)
  const routerRef = useRef(router)

  useEffect(() => { theatersRef.current = theaters }, [theaters])
  useEffect(() => { routerRef.current = router }, [router])

  function flyToTheater(t: Theater) {
    if (isListView) {
      router.push(`/?view=map`)
      setTimeout(() => {
        mapRef.current?.flyTo({ center: [t.lng, t.lat], zoom: 14, speed: 1.4, curve: 1.6, essential: true })
      }, 100)
      return
    }
    const map = mapRef.current
    if (!map) return
    const onMoveEnd = () => {
      popupRef.current!.setLngLat([t.lng, t.lat]).setHTML(richPopupHTML(t)).addTo(map)
      map.off('moveend', onMoveEnd)
    }
    map.on('moveend', onMoveEnd)
    map.flyTo({ center: [t.lng, t.lat], zoom: 14, speed: 1.4, curve: 1.6, essential: true })
  }

  useEffect(() => {
    if (isListView) return
    if (!mapContainer.current) return
    if (mapRef.current) {
      setTimeout(() => mapRef.current?.resize(), 50)
      return
    }

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
    index.load(theaters.map((t) => ({
      type: 'Feature',
      properties: { cluster: false, theaterId: t.id },
      geometry: { type: 'Point', coordinates: [t.lng, t.lat] },
    })) as any)

    const markersOnScreen: maplibregl.Marker[] = []
    const closeTimeoutRef = { current: undefined as ReturnType<typeof setTimeout> | undefined }

    function scheduleClose() {
      closeTimeoutRef.current = setTimeout(() => popupRef.current?.remove(), 350)
    }

    function renderClusters() {
      markersOnScreen.forEach((m) => m.remove())
      markersOnScreen.length = 0
      const bounds = map.getBounds()
      const bbox: [number, number, number, number] = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
      const zoom = Math.floor(map.getZoom())
      const clusters = index.getClusters(bbox, zoom)

      clusters.forEach((c: any) => {
        const [lng, lat] = c.geometry.coordinates
        const el = document.createElement('div')
        if (c.properties.cluster) {
          el.textContent = String(c.properties.point_count)
          el.style.cssText = 'background:#c8a96e;color:#1a1a2e;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:bold;cursor:pointer;'
          el.onclick = () => map.easeTo({ center: [lng, lat], zoom: zoom + 2 })
        } else {
          el.style.cssText = 'background:#c8a96e;width:14px;height:14px;border-radius:50%;border:2px solid #1a1a2e;cursor:pointer;'
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
        markersOnScreen.push(new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map))
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
  }, [isListView])

  // Countries for filter
  const countries = [...new Set(theaters.map((t) => t.country).filter(Boolean))]
  const decades = Array.from({ length: 13 }, (_, i) => 1900 + i * 10)

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Map — always mounted, hidden when list view */}
      <div
        style={{ position: 'absolute', inset: 0, visibility: isListView ? 'hidden' : 'visible' }}
      >
        <div ref={mapContainer} style={{ position: 'absolute', inset: 0 }} />
      </div>

      {/* List view — rendered on top when active */}
      {isListView && (
        <div className="absolute inset-0 overflow-y-auto bg-[#fafaf9]">
          <div className="pb-20">
            <div className="max-w-6xl mx-auto px-4 py-6">
              <div className="flex gap-3 mb-6 flex-wrap">
                <select className="border rounded-lg px-3 py-2 text-sm cursor-pointer">
                  <option value="">All countries</option>
                  {countries.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <select className="border rounded-lg px-3 py-2 text-sm cursor-pointer">
                  <option value="">All decades</option>
                  {decades.map((d) => <option key={d} value={d}>{d}s</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {theaters.map((t) => (
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header always on top */}
      <div className="absolute top-0 left-0 right-0 z-20">
        <SiteHeader
          variant={isListView ? 'page' : 'map'}
          theaters={theaters}
          onTheaterSelect={flyToTheater}
        />
      </div>
    </div>
  )
}