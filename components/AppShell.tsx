'use client'
import { useEffect, useRef, useState, useLayoutEffect, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Supercluster from 'supercluster'
import Link from 'next/link'
import SiteHeader from './SiteHeader'
import ConditionalBottomNav from './ConditionalBottomNav'
import SearchOverlay from './SearchOverlay'
import FilmsContent from './FilmsContent'
import TheaterModal from './TheaterModal'

type Theater = {
  id: string; name: string; slug: string; lat: number; lng: number
  city?: string; country?: string; year_opened?: number; year_closed?: number
  image_path?: string | null; created_at?: string
}

type ViewType = 'map' | 'list' | 'films'

const VIEW_URLS: Record<ViewType, string> = {
  map: '/',
  list: '/theaters',
  films: '/films',
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
    <div style="font-family:system-ui,sans-serif;width:220px">
      ${img ? `
        <a href="/theaters/${t.slug}" data-theater-link="${t.slug}" style="display:block;width:100%;height:120px;overflow:hidden;cursor:pointer;background:#09090B;flex-shrink:0">
          <img src="${img}" style="width:100%;height:120px;object-fit:cover;display:block;opacity:0;transition:opacity 0.25s ease" onload="this.style.opacity=1"/>
        </a>` : ''}
      <div style="padding:10px 12px 12px">
        <p style="font-weight:600;font-size:13px;color:#F4F4F5;margin:0 0 3px;line-height:1.3;">${t.name}</p>
        <p style="font-size:11px;color:#A1A1AA;margin:0 0 2px">${[t.city, t.country].filter(Boolean).join(', ')}</p>
       
         : '<div style="margin-bottom:5px"></div>
        <a data-theater-link="${t.slug}" href="/theaters/${t.slug}" style="color:#F59E0B;font-size:11px;font-weight:500;text-decoration:none">View theater →</a>
      </div>
    </div>
  `
}

function FilterDropdown({ label, value, options, onChange }: {
  label: string; value: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find((o) => o.value === value)

  useEffect(() => {
    function outside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('touchstart', outside)
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('touchstart', outside) }
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer">
        <span>{selected?.label ?? label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 150ms ease' }}>
          <polyline points="1,3 5,7 9,3"/>
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 min-w-[160px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-30 py-1">
          {options.map((o) => (
            <button key={o.value} onMouseDown={() => { onChange(o.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2 text-xs cursor-pointer transition-colors ${o.value === value ? 'text-amber-400 bg-zinc-800' : 'text-zinc-400 hover:bg-zinc-800'}`}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AppShell({ theaters, initialView }: { theaters: Theater[]; initialView: ViewType }) {
  const [view, setView] = useState<ViewType>(initialView)
  const [mapReady, setMapReady] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('')
  const [selectedDecade, setSelectedDecade] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [visibleCount, setVisibleCount] = useState(50)
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const theatersRef = useRef<Theater[]>(theaters)
  const routerRef = useRef({ push: (url: string) => { window.location.href = url } })
  const [modalSlug, setModalSlug] = useState<string | null>(null)

  useEffect(() => { theatersRef.current = theaters }, [theaters])

  function changeView(v: ViewType) {
    setView(v)
    window.history.pushState({}, '', VIEW_URLS[v])
  }

  useEffect(() => {
    function handlePop() {
      const path = window.location.pathname
      if (path === '/theaters') setView('list')
      else if (path === '/films') setView('films')
      else setView('map')
    }
    window.addEventListener('popstate', handlePop)
    return () => window.removeEventListener('popstate', handlePop)
  }, [])

  function flyToTheater(t: Theater) {
    changeView('map')
    popupRef.current?.remove()
    const map = mapRef.current
    if (!map) return
    setTimeout(() => {
      map.resize()
      const checkArrival = () => {
        const center = map.getCenter()
        if (Math.abs(center.lng - t.lng) < 0.0001 && Math.abs(center.lat - t.lat) < 0.0001) {
          popupRef.current?.setLngLat([t.lng, t.lat]).setHTML(hoverPopupHTML(t)).addTo(map)
          map.off('moveend', checkArrival)
        }
      }
      map.on('moveend', checkArrival)
      map.flyTo({ center: [t.lng, t.lat], zoom: 14, speed: 1.4, curve: 1.6, essential: true })
    }, 50)
  }

  async function handleRandomFly() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    const { count } = await supabase.from('theaters').select('id', { count: 'exact', head: true }).eq('status', 'published')
    if (!count) return
    const offset = Math.floor(Math.random() * count)
    const { data } = await supabase.from('theaters')
      .select('id, name, slug, lat, lng, city, country, year_opened, year_closed, images(storage_path, thumb_path, is_featured)')
      .eq('status', 'published').range(offset, offset)
    if (data?.[0]) {
      const raw = data[0] as any
      flyToTheater({
        ...raw,
              image_path:
          (raw.images?.find((i: any) => i.is_featured) ?? raw.images?.[0])?.thumb_path
          ?? (raw.images?.find((i: any) => i.is_featured) ?? raw.images?.[0])?.storage_path
          ?? null,
      })
    }
  }

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${process.env.NEXT_PUBLIC_MAPTILER_API_KEY}`,
      center: [10, 50],
      zoom: 3.5,
      attributionControl: { compact: true },
    })
    mapRef.current = map
    popupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: true, offset: 16, maxWidth: '240px' })

       popupRef.current.on('open', () => {
      const el = popupRef.current!.getElement()
      el.querySelectorAll('[data-theater-link]').forEach((link) => {
        const a = link as HTMLAnchorElement
             a.onclick = (e) => {
          e.preventDefault()
          const slug = a.dataset.theaterLink
          if (slug) setModalSlug(slug)
        }
      })
    })

    if (theaters.length > 0) {
      function findDenseCenter(ts: Theater[]) {
        const g: Record<string, { count: number; lats: number[]; lngs: number[] }> = {}
        ts.forEach((t) => {
          const k = `${Math.floor(t.lat / 8)},${Math.floor(t.lng / 8)}`
          if (!g[k]) g[k] = { count: 0, lats: [], lngs: [] }
          g[k].count++; g[k].lats.push(t.lat); g[k].lngs.push(t.lng)
        })
        const d = Object.values(g).sort((a, b) => b.count - a.count)[0]
        return { lat: d.lats.reduce((a, b) => a + b) / d.lats.length, lng: d.lngs.reduce((a, b) => a + b) / d.lngs.length, count: d.count }
      }
      const dense = findDenseCenter(theaters)
      map.setCenter([dense.lng, dense.lat])
      map.setZoom(dense.count >= 5 ? 6 : dense.count >= 3 ? 5 : 4)
      map.setZoom(map.getZoom() - 4)
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

    function scheduleClose() { closeTimer = setTimeout(() => popupRef.current?.remove(), 2000) }
    function cancelClose() { clearTimeout(closeTimer) }
    function collapseAttribution() {
      mapContainer.current?.closest('.maplibregl-map')?.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
    }

    function openPopup(theater: Theater) {
      if (!popupRef.current) return
      popupRef.current.setLngLat([theater.lng, theater.lat]).setHTML(hoverPopupHTML(theater)).addTo(map)
      const el = popupRef.current.getElement()
      el.onmouseenter = cancelClose
      el.onmouseleave = scheduleClose
    }

    map.on('click', () => { if (!preventMapClose) popupRef.current?.remove() })

          function isPointOnFrontOfGlobe(lng: number, lat: number): boolean {
      const center = map.getCenter()
      const lat1 = center.lat * Math.PI / 180
      const lng1 = center.lng * Math.PI / 180
      const lat2 = lat * Math.PI / 180
      const lng2 = lng * Math.PI / 180
      // Dot product of the two unit vectors — positive means front hemisphere
      const cos = Math.sin(lat1) * Math.sin(lat2) +
                  Math.cos(lat1) * Math.cos(lat2) * Math.cos(lng2 - lng1)
      return cos > 0.05 // small positive threshold avoids edge flicker
    }

    function renderClusters() {
      markersOnScreen.forEach(m => m.remove()); markersOnScreen.length = 0
      const bounds = map.getBounds()
      const bbox: [number, number, number, number] = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
      const zoom = Math.floor(map.getZoom())
      index.getClusters(bbox, zoom).forEach((c: any) => {
        const [lng, lat] = c.geometry.coordinates
        const el = document.createElement('div')
        if (c.properties.cluster) {
          el.textContent = String(c.properties.point_count)
          el.style.cssText = 'background:#c8a96e;color:#1a1a2e;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:bold;cursor:pointer;'
          el.onclick = (e) => {
            e.stopPropagation(); collapseAttribution()
            const leaves = index.getLeaves(c.properties.cluster_id, Infinity)
            if (leaves.length > 0) {
              const lngs = leaves.map((l: any) => l.geometry.coordinates[0])
              const lats = leaves.map((l: any) => l.geometry.coordinates[1])
              map.fitBounds(new maplibregl.LngLatBounds([Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]), { padding: 80, maxZoom: 14, duration: 400 })
            } else {
              map.easeTo({ center: [lng, lat], zoom: zoom + 3, duration: 400 })
            }
          }
        } else {
          el.style.cssText = 'background:#c8a96e;width:14px;height:14px;border-radius:50%;border:2px solid #1a1a2e;cursor:pointer;'
          const theater = theatersRef.current.find(t => t.id === c.properties.theaterId)
          el.onmouseenter = () => { if (!theater) return; cancelClose(); if (theater.image_path) { const i = new window.Image(); i.src = imageUrl(theater.image_path)! }; openPopup(theater) }
          el.onmouseleave = scheduleClose
          el.onclick = (e) => { e.stopPropagation(); collapseAttribution(); if (!theater) return; cancelClose(); preventMapClose = true; openPopup(theater); setTimeout(() => { preventMapClose = false }, 100) }
        }
            
               markersOnScreen.push(
          new maplibregl.Marker({ element: el, opacityWhenCovered: '0' }).setLngLat([lng, lat]).addTo(map)
        )
      })
    }

    map.on('load', () => { renderClusters(); setMapReady(true) })
    map.on('moveend', renderClusters)

        map.on('render', () => {
      markersOnScreen.forEach((m) => {
        const el = m.getElement()
        el.style.pointerEvents = el.style.opacity === '0' ? 'none' : 'auto'
      })
    })

    if (theaters.length > 0) {
      map.on('load', () => {
        const dense = (() => {
          const g: Record<string, { count: number; lats: number[]; lngs: number[] }> = {}
          theaters.forEach((t) => {
            const k = `${Math.floor(t.lat / 8)},${Math.floor(t.lng / 8)}`
            if (!g[k]) g[k] = { count: 0, lats: [], lngs: [] }
            g[k].count++; g[k].lats.push(t.lat); g[k].lngs.push(t.lng)
          })
          const d = Object.values(g).sort((a, b) => b.count - a.count)[0]
          return { lat: d.lats.reduce((a, b) => a + b) / d.lats.length, lng: d.lngs.reduce((a, b) => a + b) / d.lngs.length, count: d.count }
        })()
        const targetZoom = dense.count >= 5 ? 6 : dense.count >= 3 ? 5 : 4
        map.easeTo({ zoom: targetZoom, duration: 128000, easing: (t) => t * (2 - t) })
      })
    }

    let resizeTimer: ReturnType<typeof setTimeout>
    const resizeObserver = new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => map.resize(), 100) })
    resizeObserver.observe(mapContainer.current)
    map.on('load', () => { map.setProjection({ type: 'globe' }) })

    return () => { clearTimeout(resizeTimer); resizeObserver.disconnect(); map.remove(); mapRef.current = null }
  }, [])

  useEffect(() => { if (view === 'map') mapRef.current?.resize() }, [view])

  const isMap = view === 'map'
  const isList = view === 'list'
  const isFilms = view === 'films'

  const countries = [...new Set(theaters.map(t => t.country).filter((c): c is string => !!c))].sort()
  const decades = Array.from({ length: 13 }, (_, i) => 1900 + i * 10)
  const filteredTheaters = theaters
    .filter(t => { if (selectedCountry && t.country !== selectedCountry) return false; if (selectedDecade) { const d = Number(selectedDecade); const o = t.year_opened ?? 0; const c = t.year_closed ?? 9999; if (o > d + 9 || c < d) return false }; return true })
    .sort((a, b) => { if (sortBy === 'alpha') return a.name.localeCompare(b.name); if (sortBy === 'oldest') return (a.created_at ?? '') > (b.created_at ?? '') ? 1 : -1; return (a.created_at ?? '') < (b.created_at ?? '') ? 1 : -1 })
  const visibleTheaters = filteredTheaters.slice(0, visibleCount)

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', overflow: 'hidden', background: '#09090b' }}>

      {/* Map */}
      <div style={{ position: 'absolute', inset: 0, opacity: isMap ? 1 : 0, pointerEvents: isMap ? 'auto' : 'none', transition: 'opacity 300ms ease 50ms' }}>
        <div ref={mapContainer} style={{ position: 'absolute', inset: 0, opacity: mapReady ? 1 : 0, transition: mapReady ? 'opacity 600ms ease' : 'none' }} />
      </div>

      {/* Theatres */}
      
      <div className="bg-zinc-900" style={{ position: 'absolute', inset: 0, opacity: isList ? 1 : 0, pointerEvents: isList ? 'auto' : 'none', transition: 'opacity 300ms ease 50ms', overflowY: 'auto' }}>
     
        <div className="pb-20 pt-32">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="flex gap-2 mb-6 flex-wrap">
              <FilterDropdown label="All countries" value={selectedCountry} onChange={(v) => { setSelectedCountry(v); setVisibleCount(30) }}
                options={[{ label: 'All countries', value: '' }, ...countries.map(c => ({ label: c, value: c }))]} />
              <FilterDropdown label="Sort" value={sortBy} onChange={(v) => setSortBy(v)}
                options={[{ label: 'Newest first', value: 'newest' }, { label: 'Earliest first', value: 'oldest' }, { label: 'A → Z', value: 'alpha' }]} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {visibleTheaters.map((t) => (
                <Link key={t.id} href={`/theaters/${t.slug}`} className="group cursor-pointer theater-card-appear">
                  <div className="border border-zinc-800 aspect-[3/2] relative bg-gray-200 rounded-sm overflow-hidden transition-all duration-400 group-hover:border-zinc-600">
                   
               {/*     {t.image_path && <Image src={imageUrl(t.image_path)!} alt={t.name} fill className="object-cover group-hover:scale-102 transition duration-300" />} 
                                     {t.image_path && <Image src={imageUrl(t.image_path)!} alt={t.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-300" />} */}
                 
                 {t.image_path && (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={imageUrl(t.image_path)!} alt={t.name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition duration-300" />
)}
                 
                  </div>
                  <p className="text-white mt-2 font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-zinc-400">{t.city}, {t.country}</p>
                </Link>
              ))}
            </div>
            {visibleCount < filteredTheaters.length && (
              <div className="flex justify-center mt-8">
                <button onClick={() => setVisibleCount(n => n + 30)}
                  className="px-5 py-2 rounded-full border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors cursor-pointer">
                  Load more
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Films */}
      <div className="bg-zinc-900" style={{ position: 'absolute', inset: 0, opacity: isFilms ? 1 : 0, pointerEvents: isFilms ? 'auto' : 'none', transition: 'opacity 300ms ease 50ms' }}>
        <div style={{ position: 'absolute', inset: 0, top: '0px' }}>
     
          <FilmsContent />
  
        </div>
      </div>

      {/* Header */}
            {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20">
        {/* Blurred header bar — Theatres and Films only, not map */}
        {(isList || isFilms) && (
          <div className="fixed top-0 left-0 w-full backdrop-blur-md bg-zinc-900/80 h-24 border-b border-zinc-700 pointer-events-none" />
        )}
        <SiteHeader
          variant="map"
          theaters={theaters}
          onTheaterSelect={flyToTheater}
          view={view}
          onViewChange={changeView}
          onLogoClick={() => changeView('map')}
          onSearchOpen={() => setSearchOpen(true)}
        />
      </div>

      <ConditionalBottomNav onRandom={isMap ? handleRandomFly : undefined} onSearchOpen={() => setSearchOpen(true)} />

      {searchOpen && (
        <SearchOverlay theaters={theaters} onSelect={(t) => { setSearchOpen(false); flyToTheater(t) }} onClose={() => setSearchOpen(false)} />
      )}


      {modalSlug && (
        <TheaterModal slug={modalSlug} onClose={() => setModalSlug(null)} />
      )}


    </div>
  )
}