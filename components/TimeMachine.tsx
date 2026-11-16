'use client'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import MovieOverlay from './MovieOverlay'
import ImageOverlay from './ImageOverlay'
import TheaterModal from './TheaterModal'

// Timing of the "travelling" pause (milliseconds)
const HOLD_MS = 500          // the sentence stays on screen after the year is picked
const FADE_MS = 350          // the sentence fades out
const SPINNER_MIN_MS = 800   // the spinner shows at least this long

// How the scene arrives (ms after the stage starts fading in)
const DELAY_TEXT = 500
const DELAY_POSTERS = 300
const DELAY_FOOTER = 600

// Desktop poster height. Edit to fine-tune.
const HERO_POSTER_H = 'h-[22dvh] md:h-[20dvh]'
// Desktop: the photo drifts upward to reveal its lower part.
const PAN_EXTRA_PCT = 12   // extra height given to the photo = how far it drifts (0 = off)
const PAN_MS = 34000       // duration of the drift

// Mobile layout. Edit to fine-tune.
const MOBILE_PHOTO_MAX_H = '100dvh'   // tallest the photo can get; 'none' = never crop   // tallest the photo can be (matters for vertical photos)
const MOBILE_BLUR_PX = 10            // blur of the background copy of the photo
const MOBILE_DIM = 0.45              // how much the background is darkened (0 to 1)
const MOBILE_GRID_W = 'max-w-[300px]'
const MOBILE_FADE_PCT = 35          // % of the photo's height that fades into the background at the bottom (0 = off)
const MOBILE_POSTER_OVERLAP = 48    // px the first row of posters rises over the bottom of the photo (0 = off)

const FADE_UP = 'linear-gradient(to top, #09090b 0%, rgba(9,9,11,0.85) 0%, rgba(9,9,11,0) 100%)'
const FADE_DOWN = 'linear-gradient(to bottom, rgba(9,9,11,0) 0%, rgba(9,9,11,0) 100%)'

// Film grain over the photo.
// To remove it: delete the <Grain ... /> lines in renderScene, or set NOISE_OPACITY to 0.
// To freeze it: set NOISE_ANIMATED to false.
const NOISE_VARIANTS = {
  // Fine, neutral film grain (light and dark specks). Made for the 'overlay' blend.
  fine: {
    tile: 300,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="n" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0.6 0.6 0.6 0 -0.4  0.6 0.6 0.6 0 -0.4  0.6 0.6 0.6 0 -0.4  0 0 0 0 1"/></filter><rect width="300" height="300" filter="url(#n)"/></svg>`,
  },
  // Your original SVG: a soft embossed texture. It is mid-gray and translucent,
  // so use it with NOISE_BLEND = 'normal' and a low NOISE_OPACITY (about 0.12).
  bumpy: {
    tile: 700,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 700 700" width="700" height="700"><filter id="n" x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox" primitiveUnits="userSpaceOnUse" color-interpolation-filters="linearRGB"><feTurbulence type="fractalNoise" baseFrequency="0.092" numOctaves="4" seed="15" stitchTiles="stitch" x="0%" y="0%" width="100%" height="100%" result="turbulence"/><feSpecularLighting surfaceScale="17" specularConstant="0.7" specularExponent="20" lighting-color="#808080" x="0%" y="0%" width="100%" height="100%" in="turbulence" result="specularLighting"><feDistantLight azimuth="3" elevation="96"/></feSpecularLighting></filter><rect width="700" height="700" fill="#808080" filter="url(#n)"/></svg>`,
  },
}
const NOISE_STYLE: keyof typeof NOISE_VARIANTS = 'fine'          // 'fine' or 'bumpy'
const NOISE_OPACITY = 0.35                                       // try 0.15 to 0.6
const NOISE_BLEND: CSSProperties['mixBlendMode'] = 'overlay'     // 'bumpy' needs 'normal'
const NOISE_ANIMATED = true
const NOISE_TILE = NOISE_VARIANTS[NOISE_STYLE].tile
const NOISE_URL = `url("data:image/svg+xml,${encodeURIComponent(NOISE_VARIANTS[NOISE_STYLE].svg)}")`

type Poster = { title: string; year: number | string | null; poster_path: string | null; tmdb_id: number | null }

type PhotoRow = {
  id: string
  storage_path: string
  caption: string | null
  credit: string | null
  is_featured: boolean
  sort_order: number
  year: number
  width: number | null
  height: number | null
  theater: { id: string; name: string; slug: string; city: string; country: string | null }
  movies: Poster[]
}

// One scene = one theater for the chosen city and year, shown with a single hero photo
type Scene = { theater: PhotoRow['theater']; hero: PhotoRow }

type City = { key: string; label: string; city: string; country: string }
type Data = { photos: PhotoRow[] }
type Phase = 'ask' | 'holding' | 'leaving' | 'loading' | 'results'

let cache: Data | null = null

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const norm = (s?: string | null) => (s ?? '').trim().toLowerCase()
const cityKey = (city?: string | null, country?: string | null) => `${norm(city)}|${norm(country)}`
const imgUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/${path}`

// Desktop only shows photos known to be landscape or square. Mobile shows everything.
const usableOnDesktop = (p: PhotoRow) => p.width != null && p.height != null && p.height <= p.width

// Fade + rise, with a delay when appearing and no delay when leaving
function reveal(on: boolean, delay: number, rise: number): CSSProperties {
  return {
    opacity: on ? 1 : 0,
    transform: on ? 'translateY(0)' : `translateY(${rise}px)`,
    transition: on
      ? `opacity 900ms ease ${delay}ms, transform 1100ms cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
      : 'opacity 250ms ease, transform 250ms ease',
  }
}

// The photo settles from a slight zoom
function photoMotion(on: boolean): CSSProperties {
  return {
    transform: `scale(${on ? 1 : 1.08})`,
    transition: 'transform 2600ms cubic-bezier(0.16, 1, 0.3, 1)',
  }
}

// Desktop: the photo is a little taller than the screen and slowly slides up
function panMotion(on: boolean): CSSProperties {
  if (PAN_EXTRA_PCT <= 0) return { height: '100%' }
  const shift = (PAN_EXTRA_PCT / (100 + PAN_EXTRA_PCT)) * 100
  return {
    height: `${100 + PAN_EXTRA_PCT}%`,
    transform: `translateY(${on ? -shift : 0}%)`,
    transition: on ? `transform ${PAN_MS}ms ease-in-out` : 'transform 900ms ease',
  }
}



// Makes the bottom of an element dissolve (transparent), instead of laying a dark gradient over it.
// What shows through is whatever sits behind: here, the blurred copy of the same photo.
function fadeMask(pct: number): string {
  if (pct <= 0) return 'none'
  const start = 100 - pct
  const stops = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const alpha = 1 - t * t * (3 - 2 * t) // smooth start and end, no visible band
    return `rgba(0,0,0,${alpha.toFixed(3)}) ${(start + pct * t).toFixed(1)}%`
  })
  return `linear-gradient(to bottom, #000 0%, ${stops.join(', ')})`
}

// Subtle film grain layer. It is larger than the photo so it can jitter without showing edges.
function Grain({ animated }: { animated: boolean }) {
  if (NOISE_OPACITY <= 0) return null
  return (
    <div
      aria-hidden
      className={`absolute pointer-events-none ${animated ? 'tm-grain' : ''}`}
      style={{
        inset: '-50%',
        backgroundImage: NOISE_URL,
        backgroundSize: `${NOISE_TILE}px ${NOISE_TILE}px`,
        opacity: NOISE_OPACITY,
        mixBlendMode: NOISE_BLEND,
      }}
    />
  )
}

// One scene per theater. The hero is the featured photo if it qualifies, otherwise the first one.
function buildScenes(photos: PhotoRow[]): Scene[] {
  const byTheater = new Map<string, PhotoRow[]>()
  for (const p of photos) {
    const list = byTheater.get(p.theater.id) ?? []
    list.push(p)
    byTheater.set(p.theater.id, list)
  }
  const scenes: Scene[] = []
  byTheater.forEach((list) => {
    const sorted = [...list].sort((a, b) => a.sort_order - b.sort_order)
    const hero = sorted.find((p) => p.is_featured) ?? sorted[0]
    scenes.push({ theater: hero.theater, hero })
  })
  return scenes.sort((a, b) => a.theater.name.localeCompare(b.theater.name))
}

function deriveCities(photos: PhotoRow[]): City[] {
  const seen = new Map<string, City>()
  for (const p of photos) {
    const k = cityKey(p.theater.city, p.theater.country)
    if (!seen.has(k)) seen.set(k, { key: k, label: p.theater.city, city: p.theater.city, country: p.theater.country ?? '' })
  }
  const list = [...seen.values()].sort((a, b) => a.city.localeCompare(b.city))

  const counts = new Map<string, number>()
  list.forEach((c) => counts.set(norm(c.city), (counts.get(norm(c.city)) ?? 0) + 1))
  list.forEach((c) => {
    if ((counts.get(norm(c.city)) ?? 0) > 1 && c.country) c.label = `${c.city}, ${c.country}`
  })
  return list
}

async function loadData(): Promise<Data> {
  if (cache) return cache
  const supabase = createClient()

  const [citiesRes, imagesRes] = await Promise.all([
    supabase.from('time_machine_cities').select('city, country'),
    supabase
      .from('images')
      .select('id, storage_path, caption, credit, year, width, height, is_featured, sort_order, theaters!inner ( id, name, slug, city, country, status ), image_movies ( movies ( title, year, poster_path, tmdb_id ) )')
      .not('year', 'is', null)
      .eq('theaters.status', 'published'),
  ])

  const curated = new Set<string>(
    ((citiesRes.data as any[] | null) ?? []).map((c: any) => cityKey(c.city, c.country))
  )

  const photos: PhotoRow[] = []
  for (const r of ((imagesRes.data as any[] | null) ?? [])) {
    const t = r.theaters
    if (!t || !curated.has(cityKey(t.city, t.country))) continue
    photos.push({
      id: r.id,
      storage_path: r.storage_path,
      caption: r.caption ?? null,
      credit: r.credit ?? null,
      is_featured: !!r.is_featured,
      sort_order: r.sort_order ?? 0,
      year: r.year,
      width: r.width ?? null,
      height: r.height ?? null,
      theater: { id: t.id, name: t.name, slug: t.slug, city: t.city, country: t.country },
      movies: (r.image_movies ?? []).map((im: any) => im.movies).filter(Boolean),
    })
  }

  const result: Data = { photos }
  if (!imagesRes.error) cache = result
  return result
}

/* A word in the sentence that opens a cascading list of options */
function WordSelect({ value, placeholder, options, onChange, disabled, onOpenChange }: {
  value: string | null
  placeholder: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
  disabled?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState<number | undefined>(undefined)
  const ref = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const openRef = useRef(false)

  const selected = options.find((o) => o.value === value)
  const label = selected?.label ?? placeholder
    const [rendered, setRendered] = useState(false)

  // Tell the parent when this dropdown opens or closes
  useEffect(() => {
    openRef.current = open
    onOpenChange?.(open)
  }, [open])

    // Keep the menu in the DOM while it plays its exit animation
  useEffect(() => {
    if (open) { setRendered(true); return }
    const t = setTimeout(() => setRendered(false), 160)
    return () => clearTimeout(t)
  }, [open])

  // If the word disappears while its list is open, release it
  useEffect(() => {
    return () => { if (openRef.current) onOpenChange?.(false) }
  }, [])

  // CSS can't animate "width: auto", so we measure the word and animate between pixel widths
  useLayoutEffect(() => {
    function measure() {
      if (textRef.current) setWidth(Math.ceil(textRef.current.getBoundingClientRect().width))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [label])

  useEffect(() => {
    function outside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', outside)
    document.addEventListener('touchstart', outside)
    return () => {
      document.removeEventListener('mousedown', outside)
      document.removeEventListener('touchstart', outside)
    }
  }, [])

  return (
    <span ref={ref} className="relative inline-block">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={`inline-block whitespace-nowrap border-b border-dashed pb-0.5 transition-colors ${
          disabled
            ? 'text-zinc-700 border-zinc-800 cursor-default'
            : selected
              ? 'text-amber-400 border-amber-500/50 hover:text-amber-300 cursor-pointer'
              : 'text-zinc-500 border-zinc-600 hover:text-zinc-300 cursor-pointer'
        }`}
        style={{
          width,
          transition: 'width 450ms cubic-bezier(0.22, 1, 0.36, 1), color 150ms ease, border-color 150ms ease',
          clipPath: 'inset(0)',
        }}
      >
        <span key={label} ref={textRef} className="tm-word inline-block">{label}</span>
      </button>

          {rendered && (
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-4 z-20">
          <span
            className="flex flex-col items-center max-h-[40dvh] overflow-y-auto overscroll-contain bg-zinc-950 backdrop-blur-sm py-2 px-6"
            style={{
              transformOrigin: 'top center',
              animation: open
                ? 'tmMenuIn 240ms cubic-bezier(0.16, 1, 0.3, 1) both'
                : 'tmMenuOut 160ms ease both',
              pointerEvents: open ? 'auto' : 'none',
            }}
          >
            {options.map((o, i) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`whitespace-nowrap py-1 text-2xl sm:text-3xl cursor-pointer transition-colors ${
                  o.value === value ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-300'
                }`}
                style={{
                  animation: 'tmCascade 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
                  animationDelay: `${40 + Math.min(i, 8) * 30}ms`,
                }}
              >
                {o.label}
              </button>
            ))}
          </span>
        </span>
      )}
    </span>
  )
}

export default function TimeMachine({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<Data | null>(null)
  const [cityK, setCityK] = useState<string | null>(null)
  const [year, setYear] = useState<number | null>(null)
  const [idx, setIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('ask')
  const [revealed, setRevealed] = useState(false)
  const [movie, setMovie] = useState<Poster | null>(null)
  const [modalSlug, setModalSlug] = useState<string | null>(null)
  const [zoom, setZoom] = useState<{ src: string; alt: string; caption: string | null; credit: string | null } | null>(null)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  )

  const overlayOpen = useRef(false)
  const trip = useRef(0)
  const dropdownsOpen = useRef(0)
  const openAtPress = useRef(false)
  const sceneRefs = useRef<Record<string, HTMLDivElement | null>>({})

  function trackDropdown(open: boolean) {
    dropdownsOpen.current = Math.max(0, dropdownsOpen.current + (open ? 1 : -1))
  }

  // Escape closes only the top-most layer
  useEffect(() => { overlayOpen.current = !!movie || !!modalSlug || !!zoom }, [movie, modalSlug, zoom])

  // Mobile = below Tailwind's md breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    setIsMobile(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    setMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    loadData().then(setData)

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !overlayOpen.current) handleClose()
    }
    document.addEventListener('keydown', handleKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      trip.current++ // cancels any journey still in progress
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prev
    }
  }, [])

  function handleClose() {
    requestAnimationFrame(() => setVisible(false))
    setTimeout(onClose, 220)
  }

  // Loads the hero photo and its posters so the scene arrives fully formed
  function preloadScene(sc: Scene): Promise<void> {
    return new Promise((resolve) => {
      const urls = [
        imgUrl(sc.hero.storage_path),
        ...sc.hero.movies.filter((m) => m.poster_path).map((m) => `https://image.tmdb.org/t/p/w342${m.poster_path}`),
      ]
      let left = urls.length
      const timer = setTimeout(resolve, 6000) // never wait more than 6s
      const done = () => {
        left--
        if (left === 0) { clearTimeout(timer); resolve() }
      }
      urls.forEach((u) => {
        const img = new window.Image()
        img.onload = done
        img.onerror = done
        img.src = u
      })
    })
  }

  // The journey: hold the sentence, fade it out, show the spinner while images load, then reveal
  async function travel(list: Scene[]) {
    const id = ++trip.current
    const preload = preloadScene(list[0]) // starts right away, during the hold

    setPhase('holding')
    await wait(HOLD_MS)
    if (id !== trip.current) return

    setPhase('leaving')
    await wait(FADE_MS)
    if (id !== trip.current) return

    setPhase('loading')
    await Promise.all([preload, wait(SPINNER_MIN_MS)])
    if (id !== trip.current) return

    setPhase('results')
  }

  function selectCity(k: string) { setCityK(k); setYear(null); setIdx(0) }

  function selectYear(y: number) {
    setYear(y)
    setIdx(0)
    const list = buildScenes(inCity.filter((p) => p.year === y))
    if (list.length) travel(list)
  }

  // Fade the scene out, then go back to the sentence
  function reset() {
    const id = ++trip.current
    setRevealed(false)
    setTimeout(() => {
      if (id !== trip.current) return
      setCityK(null)
      setYear(null)
      setIdx(0)
      setPhase('ask')
    }, 500)
  }

  function zoomPhoto(p: PhotoRow) {
    setZoom({ src: imgUrl(p.storage_path), alt: p.caption ?? p.theater.name, caption: p.caption, credit: p.credit })
  }

  // Photos available on this screen: vertical ones are mobile-only
  const eligible = data ? data.photos.filter((p) => isMobile || usableOnDesktop(p)) : []
  const cities = deriveCities(eligible)
  const inCity = cityK
    ? eligible.filter((p) => cityKey(p.theater.city, p.theater.country) === cityK)
    : []
  const years = [...new Set(inCity.map((p) => p.year))].sort((a, b) => a - b)
  const scenes = year !== null ? buildScenes(inCity.filter((p) => p.year === year)) : []
  const cityLabel = cities.find((c) => c.key === cityK)?.label ?? ''
  const showResults = phase === 'results' && scenes.length > 0

  // Start the scene's slow arrival one beat after it mounts
  useEffect(() => {
    if (!showResults) { setRevealed(false); return }
    const t = setTimeout(() => setRevealed(true), 60)
    return () => clearTimeout(t)
  }, [showResults])

  // A theater you switch to always starts at its top
  useEffect(() => {
    const sc = scenes[idx]
    if (sc) sceneRefs.current[sc.theater.id]?.scrollTo({ top: 0 })
  }, [idx])

  // If the screen size changes mid-trip (rotation, resize), keep the scene valid
  useEffect(() => {
    if (phase !== 'results') return
    if (!scenes.length) reset()
    else if (idx >= scenes.length) setIdx(0)
  }, [isMobile])

  /* ---------- Pieces of a scene ---------- */

  function info(sc: Scene, on: boolean) {
    const { hero } = sc
    return (
       <div style={reveal(on, DELAY_TEXT, 12)} className="text-center md:text-center">
        <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-300">
          {cityLabel} · {year} {sc.theater.name}
        </p>

        {(hero.caption || hero.credit) && (
          <p className="text-xs text-white mt-1">
        Photography: 
            {hero.credit && <span className="text-white"> {hero.credit}</span>}
          </p>
        )}
      </div> 
    )
  }

  // Desktop: one row of posters
  function posterRow(movies: Poster[], keyPrefix: string, sizeClass: string, align: 'center' | 'left', style?: CSSProperties) {
    if (!movies.length) return null
    const wrap = `${align === 'center' ? 'mx-auto ' : ''}w-max max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`
    return (
      <div style={style} className={wrap}>
        <div className="flex gap-3">
          {movies.map((m, i) => (
            <button key={`${keyPrefix}-${i}`} type="button" onClick={() => setMovie(m)} className="shrink-0 cursor-pointer">
              {m.poster_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                  alt={m.title}
                  className={`block ${sizeClass} border-overlay w-auto aspect-[2/3] object-cover rounded-sm transition-colors`}
                />
              ) : (
                <div className={`${sizeClass} aspect-[2/3] bg-zinc-900 rounded-sm border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600`}>
                  No poster
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    )
  }


  // Mobile: posters in a 2-column grid, same styling as the desktop row
  function posterGrid(movies: Poster[], keyPrefix: string, style?: CSSProperties) {
    if (!movies.length) return null
    return (
      <div style={style} className={`flex flex-wrap justify-center gap-3 w-full ${MOBILE_GRID_W} mx-auto`}>
        {movies.map((m, i) => (
          <button key={`${keyPrefix}-${i}`} type="button" onClick={() => setMovie(m)} className="w-[calc(33.333%_-_8px)] cursor-pointer">
            {m.poster_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                alt={m.title}
                className="block w-full border-overlay aspect-[2/3] object-cover rounded-sm transition-colors"
              />
            ) : (
              <div className="w-full aspect-[2/3] bg-zinc-900 rounded-sm border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600">
                No poster
              </div>
            )}
          </button>
        ))}
      </div>
    )
  }

  function footer(sc: Scene) {
    return (
      <div className="flex flex-col items-center gap-4">
        {scenes.length > 1 && (
          <div className="flex items-center justify-center gap-1.5">
            {scenes.map((d, i) => (
              <button
                key={d.theater.id}
                onClick={() => setIdx(i)}
                aria-label={`Go to ${d.theater.name}`}
                className={`rounded-full transition-all duration-200 cursor-pointer ${
                  i === idx ? 'w-4 h-1.5 bg-amber-500' : 'w-1.5 h-1.5 bg-zinc-700 hover:bg-zinc-500'
                }`}
              />
            ))}
          </div>
        )}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setModalSlug(sc.theater.slug)}
            className="px-4 sm:px-5 py-2 rounded-full border border-zinc-700 bg-zinc-950/40 backdrop-blur-sm text-xs whitespace-nowrap text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 transition-colors cursor-pointer"
          >
            View Theatre
          </button>
          <button
            onClick={reset}
            className="px-4 sm:px-5 py-2 rounded-full border border-zinc-700 bg-zinc-950/40 backdrop-blur-sm text-xs whitespace-nowrap text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 transition-colors cursor-pointer"
          >
            Take Me Somewhere Else
          </button>
        </div>
      </div>
    )
  }

  function renderScene(sc: Scene, active: boolean) {
    const on = revealed && active
    const { hero } = sc
    const grainMoves = NOISE_ANIMATED
    // Scenes crossfade; hidden ones can't be clicked or focused
    const shell: CSSProperties = {
      opacity: on ? 1 : 0,
      visibility: on ? 'visible' : 'hidden',
      pointerEvents: on ? 'auto' : 'none',
      transition: `opacity 900ms ease, visibility 0s linear ${on ? 0 : 900}ms`,
    }

       /* Mobile: a blurred copy of the photo fills the screen, the photo is centered on it, posters and buttons below */
    if (isMobile) {
      return (
        <div
          key={sc.theater.id}
          className="absolute inset-0 overflow-hidden"
          style={shell}
          aria-hidden={!on}
        >
          {/* Backdrop: same photo, blurred, covering the whole screen */}
          <div className="absolute inset-0 overflow-hidden isolate bg-zinc-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
             
          <img
            src={imgUrl(hero.storage_path)}
            alt={sc.theater.name}
         
              aria-hidden
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: `blur(${MOBILE_BLUR_PX}px)`, transform: 'scale(1.25)' }}
          />
            <div className="absolute inset-0" style={{ background: `rgba(9,9,11,${MOBILE_DIM})` }} />
            <Grain animated={grainMoves} />
            <div className="absolute inset-x-0 bottom-0 h-1/2 pointer-events-none" style={{ background: FADE_UP }} />
          </div>

          {/* Foreground: scrolls when the posters and buttons run below the screen */}
          <div
            ref={(el) => { sceneRefs.current[sc.theater.id] = el }}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div className="h-full flex flex-col">
              {/* Two equal spaces above and below the photo keep it centered 
              <div style={{ flex: '1 1 0px', minHeight: 0 }} /> */}

                                      <div
                className="relative isolate shrink-0 overflow-hidden"
                style={{ WebkitMaskImage: fadeMask(MOBILE_FADE_PCT), maskImage: fadeMask(MOBILE_FADE_PCT) }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl(hero.storage_path)}
                  alt={sc.theater.name}
                  draggable={false}
                  onClick={() => zoomPhoto(hero)}
                  className="block cursor-zoom-in"
                                   style={{
                    width: '100%',
                    height: 'auto',
                    maxHeight: MOBILE_PHOTO_MAX_H,
                    objectFit: 'cover',
                    ...photoMotion(on),
                
                  }}
                />
                                <Grain animated={grainMoves} />
              </div>
          

              <div style={{ flex: '1 1 0px', minHeight: 0 }}>
                             <div
                  className="relative z-10 flex flex-col gap-6 px-4 pb-10"
                  style={{ marginTop: -MOBILE_POSTER_OVERLAP }}
                >
                  {posterGrid(hero.movies, hero.id, reveal(on, DELAY_POSTERS, 12))}
                  <div style={reveal(on, DELAY_FOOTER, 8)}>{footer(sc)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    /* Desktop: full-screen hero, posters in a row at the bottom, buttons under them */
    return (
      <div
        key={sc.theater.id}
        ref={(el) => { sceneRefs.current[sc.theater.id] = el }}
        className="absolute inset-0 overflow-hidden"
        style={shell}
        aria-hidden={!on}
      >
        <div className="relative h-[100dvh] w-full overflow-hidden isolate">
                   <div className="absolute inset-x-0 top-0" style={panMotion(on)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgUrl(hero.storage_path)}
              alt={sc.theater.name}
              draggable={false}
              onClick={() => zoomPhoto(hero)}
              className="h-full w-full object-cover cursor-zoom-in"
              style={photoMotion(on)}
            />
          </div>
          <Grain animated={grainMoves} />
          <div className="absolute inset-x-0 top-0 h-28 pointer-events-none" style={{ background: FADE_DOWN }} />
          <div className="absolute inset-x-0 bottom-0 h-[75%] pointer-events-none" style={{ background: FADE_UP }} />

          <div className="absolute inset-0 flex flex-col justify-end gap-4 px-4 sm:px-10 pb-6 pointer-events-none">
            {/* {info(sc, on)} */}
            <div className="pointer-events-auto">
              {posterRow(hero.movies, hero.id, HERO_POSTER_H, 'center', reveal(on, DELAY_POSTERS, 24))}
            </div>
            <div className="pointer-events-auto" style={reveal(on, DELAY_FOOTER, 8)}>
              {footer(sc)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[150] bg-zinc-950"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 250ms ease' }}
    >
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
        aria-label="Close"
      >
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="1" y1="1" x2="13" y2="13" />
          <line x1="13" y1="1" x2="1" y2="13" />
        </svg>
      </button>

      {/* Sentence and spinner */}
      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        {phase === 'loading' || phase === 'results' ? (
          <div key="loading" className="tm-in min-h-full flex items-center justify-center pb-16 pointer-events-none">
            <div
              className="flex flex-col items-center gap-4"
              style={{ opacity: phase === 'results' ? 0 : 1, transition: 'opacity 700ms ease' }}
            >
<svg width="32" height="32" fill="currentColor" className="text-zinc-600" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <path d="M12,4a8,8,0,0,1,7.89,6.7A1.53,1.53,0,0,0,21.38,12h0a1.5,1.5,0,0,0,1.48-1.75,11,11,0,0,0-21.72,0A1.5,1.5,0,0,0,2.62,12h0a1.53,1.53,0,0,0,1.49-1.3A8,8,0,0,1,12,4Z">
    <animateTransform attributeName="transform" type="rotate" dur="0.75s" values="0 12 12;-360 12 12" repeatCount="indefinite"/>
  </path>
</svg>
              <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-600">
                {cityLabel} · {year}
              </p>
            </div>
          </div>
        ) : (
          <div
            key="ask"
            className="tm-in min-h-full flex items-center justify-center px-6 pb-16"
            onMouseDown={() => { openAtPress.current = dropdownsOpen.current > 0 }}
            onTouchStart={() => { openAtPress.current = dropdownsOpen.current > 0 }}
            onClick={() => {
              if (phase !== 'ask' || openAtPress.current) return
              handleClose()
            }}
          >
            {data && cities.length === 0 ? (
              <p className="text-zinc-500 text-sm">No destinations yet.</p>
            ) : (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  opacity: phase === 'leaving' ? 0 : 1,
                  transition: `opacity ${FADE_MS}ms ease`,
                  pointerEvents: phase === 'ask' ? 'auto' : 'none',
                }}
              >
                <h2 className="text-center text-3xl sm:text-5xl font-light tracking-tight leading-[1.6] text-zinc-300">
                  Take me to{' '}
                  <WordSelect
                    value={cityK}
                    placeholder="a city"
                    disabled={!data}
                    options={cities.map((c) => ({ label: c.label, value: c.key }))}
                    onChange={selectCity}
                    onOpenChange={trackDropdown}
                                   />{' '}
                                    <br className="md:hidden" />
                  <span className="whitespace-nowrap">
                    in{'\u00a0'}
                    <WordSelect
                      value={year !== null ? String(year) : null}
                      placeholder="a year"
                      disabled={!cityK}
                      options={years.map((y) => ({ label: String(y), value: String(y) }))}
                      onChange={(v) => selectYear(Number(v))}
                      onOpenChange={trackDropdown}
                    />
                    .
                  </span>
                </h2>
              </div>
            )}
          </div>
        )}
      </div>

      {/* The scene */}
      {showResults && (
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ opacity: revealed ? 1 : 0, transition: revealed ? 'opacity 1400ms ease' : 'opacity 450ms ease' }}
        >
          {scenes.map((sc, i) => renderScene(sc, i === idx))}

          {scenes.length > 1 && (
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{ opacity: revealed ? 1 : 0, transition: `opacity 900ms ease ${revealed ? DELAY_FOOTER : 0}ms` }}
            >
              <button
                onClick={() => setIdx((i) => Math.max(0, i - 1))}
                disabled={idx === 0}
                aria-label="Previous theatre"
                className={`pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-zinc-950/60 hover:bg-zinc-900 backdrop-blur-sm flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-default`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                onClick={() => setIdx((i) => Math.min(scenes.length - 1, i + 1))}
                disabled={idx === scenes.length - 1}
                aria-label="Next theatre"
                className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-zinc-950/60 hover:bg-zinc-900 backdrop-blur-sm flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer disabled:opacity-20 disabled:cursor-default"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          )}
        </div>
      )}

      {movie && <MovieOverlay movie={movie} onClose={() => setMovie(null)} />}

      {zoom && (
        <ImageOverlay
          src={zoom.src}
          alt={zoom.alt}
          caption={zoom.caption ?? undefined}
          credit={zoom.credit ?? undefined}
          onClose={() => setZoom(null)}
        />
      )}

      {modalSlug && <TheaterModal slug={modalSlug} onClose={() => setModalSlug(null)} />}
    </div>,
    document.body
  )
}