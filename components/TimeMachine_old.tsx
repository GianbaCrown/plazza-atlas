'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import MovieOverlay from './MovieOverlay'

// Timing of the "travelling" pause (milliseconds)
const HOLD_MS = 500          // the sentence stays on screen after the year is picked
const FADE_MS = 350          // the sentence fades out
const SPINNER_MIN_MS = 800   // the spinner shows at least this long

type Poster = { title: string; year: number | string | null; poster_path: string | null; tmdb_id: number | null }

type Slide = {
  id: string
  storage_path: string
  credit: string | null
  year: number
  sort_order: number
  theater: { id: string; name: string; slug: string; city: string; country: string | null }
  movies: Poster[]
}

type City = { key: string; label: string; city: string; country: string }
type Data = { cities: City[]; slides: Slide[] }
type Phase = 'ask' | 'holding' | 'leaving' | 'loading' | 'results'

let cache: Data | null = null

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const norm = (s?: string | null) => (s ?? '').trim().toLowerCase()
const cityKey = (city?: string | null, country?: string | null) => `${norm(city)}|${norm(country)}`
const imgUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/${path}`

async function loadData(): Promise<Data> {
  if (cache) return cache
  const supabase = createClient()

  const [citiesRes, imagesRes] = await Promise.all([
    supabase.from('time_machine_cities').select('city, country'),
    supabase
      .from('images')
      .select('id, storage_path, credit, year, sort_order, theaters!inner ( id, name, slug, city, country, status ), image_movies ( movies ( title, year, poster_path, tmdb_id ) )')
      .not('year', 'is', null)
      .eq('theaters.status', 'published'),
  ])

  const curated = new Set<string>(
    ((citiesRes.data as any[] | null) ?? []).map((c: any) => cityKey(c.city, c.country))
  )

  const slides: Slide[] = []
  for (const r of ((imagesRes.data as any[] | null) ?? [])) {
    const t = r.theaters
    if (!t || !curated.has(cityKey(t.city, t.country))) continue
    slides.push({
      id: r.id,
      storage_path: r.storage_path,
      credit: r.credit,
      year: r.year,
      sort_order: r.sort_order ?? 0,
      theater: { id: t.id, name: t.name, slug: t.slug, city: t.city, country: t.country },
      movies: (r.image_movies ?? []).map((im: any) => im.movies).filter(Boolean),
    })
  }

  const seen = new Map<string, City>()
  for (const s of slides) {
    const k = cityKey(s.theater.city, s.theater.country)
    if (!seen.has(k)) seen.set(k, { key: k, label: s.theater.city, city: s.theater.city, country: s.theater.country ?? '' })
  }
  const list = [...seen.values()].sort((a, b) => a.city.localeCompare(b.city))

  const counts = new Map<string, number>()
  list.forEach((c) => counts.set(norm(c.city), (counts.get(norm(c.city)) ?? 0) + 1))
  list.forEach((c) => {
    if ((counts.get(norm(c.city)) ?? 0) > 1 && c.country) c.label = `${c.city}, ${c.country}`
  })

  const result: Data = { cities: list, slides }
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
}) {
  const [open, setOpen] = useState(false)
  const [width, setWidth] = useState<number | undefined>(undefined)
  const ref = useRef<HTMLSpanElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)

  const selected = options.find((o) => o.value === value)
  const label = selected?.label ?? placeholder
  useEffect(() => { onOpenChange?.(open) }, [open])

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

      {open && (
        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-4 z-20 flex flex-col items-center max-h-[40dvh] overflow-y-auto overscroll-contain bg-zinc-950 py-2 px-6">
          {options.map((o, i) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`whitespace-nowrap py-1 text-2xl sm:text-3xl cursor-pointer transition-colors ${
                o.value === value ? 'text-amber-400' : 'text-zinc-500 hover:text-amber-300'
              }`}
              style={{ animation: 'tmCascade 240ms ease both', animationDelay: `${i * 35}ms` }}
            >
              {o.label}
            </button>
          ))}
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
  const [orient, setOrient] = useState<Record<string, 'portrait' | 'landscape'>>({})
  const [movie, setMovie] = useState<Poster | null>(null)
  const movieOpen = useRef(false)
  const trip = useRef(0)
    const dropdownsOpen = useRef(0)
  const openAtPress = useRef(false)

  function trackDropdown(open: boolean) {
    dropdownsOpen.current = Math.max(0, dropdownsOpen.current + (open ? 1 : -1))
  }

  useEffect(() => { movieOpen.current = !!movie }, [movie])

  useEffect(() => {
    setMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
    loadData().then(setData)

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !movieOpen.current) handleClose()
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

  // Loads the photo + posters of a slide, and learns the photo's orientation before it is shown
  function preloadSlide(s: Slide): Promise<void> {
    return new Promise((resolve) => {
      const urls = [
        imgUrl(s.storage_path),
        ...s.movies.filter((m) => m.poster_path).map((m) => `https://image.tmdb.org/t/p/w342${m.poster_path}`),
      ]
      let left = urls.length
      const timer = setTimeout(resolve, 6000) // never wait more than 6s
      const done = () => {
        left--
        if (left === 0) { clearTimeout(timer); resolve() }
      }
      urls.forEach((u, i) => {
        const img = new window.Image()
        img.onload = () => {
          if (i === 0) {
            const o: 'portrait' | 'landscape' = img.naturalHeight > img.naturalWidth ? 'portrait' : 'landscape'
            setOrient((p) => ({ ...p, [s.id]: o }))
          }
          done()
        }
        img.onerror = done
        img.src = u
      })
    })
  }

  // The journey: hold the sentence, fade it out, show the spinner while images load, then reveal
  async function travel(list: Slide[]) {
    const id = ++trip.current
    const preload = preloadSlide(list[0]) // starts right away, during the hold

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
    const list = inCity
      .filter((s) => s.year === y)
      .sort((a, b) => a.theater.name.localeCompare(b.theater.name) || a.sort_order - b.sort_order)
    if (list.length) travel(list)
  }

  function reset() {
    trip.current++
    setCityK(null)
    setYear(null)
    setIdx(0)
    setPhase('ask')
  }

  const cities = data?.cities ?? []
  const inCity = data && cityK
    ? data.slides.filter((s) => cityKey(s.theater.city, s.theater.country) === cityK)
    : []
  const years = [...new Set(inCity.map((s) => s.year))].sort((a, b) => a - b)
  const slides = year !== null
    ? inCity
        .filter((s) => s.year === year)
        .sort((a, b) => a.theater.name.localeCompare(b.theater.name) || a.sort_order - b.sort_order)
    : []
  const cityLabel = cities.find((c) => c.key === cityK)?.label ?? ''
  const showResults = phase === 'results' && slides.length > 0

  function renderSlide(s: Slide) {
    const portrait = orient[s.id] === 'portrait'
    return (
      <div
        className={`flex gap-6 ${
          portrait ? 'flex-col items-center md:flex-row md:items-start md:justify-center' : 'flex-col items-center'
        }`}
      >
        <figure className="flex flex-col items-center md:items-start min-w-0 max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl(s.storage_path)}
            alt={s.theater.name}
            draggable={false}
            onLoad={(e) => {
              const el = e.currentTarget
              const o: 'portrait' | 'landscape' = el.naturalHeight > el.naturalWidth ? 'portrait' : 'landscape'
              setOrient((p) => ({ ...p, [s.id]: o }))
            }}
            className="block border border-zinc-800 rounded-sm"
            style={{
              width: 'auto',
              height: 'auto',
              maxWidth: '100%',
              maxHeight: portrait ? '78dvh' : '58dvh',
            }}
          />
          <figcaption className="mt-3 text-center md:text-left">
            <p className="text-sm text-zinc-200">{s.theater.name}</p>
            {s.credit && <p className="text-xs text-zinc-500 italic mt-0.5">{s.credit}</p>}
          </figcaption>
        </figure>

        {s.movies.length > 0 && (
          <div
            className={
              portrait
                ? 'grid grid-cols-3 md:grid-cols-2 gap-3 w-full max-w-[420px] md:w-[260px] flex-shrink-0 tm-late'
                : 'flex flex-wrap justify-center gap-3 tm-late'
            }
          >
            {s.movies.map((m, i) => (
              <button
                key={`${s.id}-${i}`}
                type="button"
                onClick={() => setMovie(m)}
                className="cursor-pointer"
              >
                {m.poster_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                    alt={m.title}
                    className={`block aspect-[2/3] object-cover rounded-sm border border-zinc-800 transition-colors hover:border-zinc-600 ${
                      portrait ? 'w-full' : 'h-[22dvh] sm:h-[26dvh] w-auto'
                    }`}
                  />
                ) : (
                  <div className={`aspect-[2/3] bg-zinc-900 rounded-sm flex items-center justify-center text-[10px] text-zinc-600 ${portrait ? 'w-full' : 'h-[22dvh] sm:h-[26dvh]'}`}>
                    No poster
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[150] bg-black/70 backdrop-blur-sm"
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

      <div className="absolute inset-0 overflow-y-auto overscroll-contain">
        {showResults ? (
          /* Step 3: the results */
          <div
            key={`results-${cityK}-${year}`}
            className="tm-results-in w-full max-w-6xl mx-auto px-4 sm:px-8 pt-20 pb-16"
          >
            <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-500 text-center mb-6">
              {cityLabel} · {year}
            </p>

            <div className="relative overflow-hidden">
              <div
                style={{
                  display: 'flex',
                  width: `${slides.length * 100}%`,
                  transform: `translateX(-${(idx / slides.length) * 100}%)`,
                  transition: 'transform 320ms ease-in-out',
                  alignItems: 'flex-start',
                }}
              >
                {slides.map((s) => (
                  <div key={s.id} style={{ width: `${100 / slides.length}%`, flexShrink: 0 }}>
                    {renderSlide(s)}
                  </div>
                ))}
              </div>

              {slides.length > 1 && (
                <>
                  <button
                    onClick={() => setIdx((i) => Math.max(0, i - 1))}
                    disabled={idx === 0}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-sm flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer z-10 disabled:opacity-20 disabled:cursor-default"
                    aria-label="Previous"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setIdx((i) => Math.min(slides.length - 1, i + 1))}
                    disabled={idx === slides.length - 1}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-sm flex items-center justify-center text-zinc-300 hover:text-white transition-colors cursor-pointer z-10 disabled:opacity-20 disabled:cursor-default"
                    aria-label="Next"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {slides.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 mt-6">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setIdx(i)}
                    aria-label={`Go to ${i + 1}`}
                    className={`rounded-full transition-all duration-200 cursor-pointer ${
                      i === idx ? 'w-4 h-1.5 bg-amber-500' : 'w-1.5 h-1.5 bg-zinc-700 hover:bg-zinc-500'
                    }`}
                  />
                ))}
              </div>
            )}

            <div className="flex justify-center mt-12">
              <button
                onClick={reset}
                className="px-5 py-2 rounded-full border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors cursor-pointer"
              >
                Take me somewhere else
              </button>
            </div>
          </div>
        ) : phase === 'loading' ? (
          /* Step 2: travelling */
          <div key="loading" className="tm-in min-h-full flex flex-col items-center justify-center gap-4 pb-16">
            <svg className="animate-spin w-6 h-6 text-amber-500/80" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-600">
              {cityLabel} · {year}
            </p>
          </div>
        ) : (
          /* Step 1: the sentence */
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
                  in{' '}
                  <WordSelect
                    value={year !== null ? String(year) : null}
                    placeholder="a year"
                    disabled={!cityK}
                    options={years.map((y) => ({ label: String(y), value: String(y) }))}
                    onChange={(v) => selectYear(Number(v))}
                    onOpenChange={trackDropdown}
                  />
                  .
                </h2>
              </div>
            )}
          </div>
        )}
      </div>

      {movie && <MovieOverlay movie={movie} onClose={() => setMovie(null)} />}
    </div>,
    document.body
  )
}