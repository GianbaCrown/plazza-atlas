'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Logo from './Logo'

type Theater = {
  id: string; name: string; slug: string; lat: number; lng: number
  city?: string; country?: string
}

type Props = {
  variant: 'map' | 'page'
  theaters?: Theater[]
  onTheaterSelect?: (t: Theater) => void
  view?: 'map' | 'list'
  onViewChange?: (v: 'map' | 'list') => void
}

export default function SiteHeader({ variant, theaters = [], onTheaterSelect, view, onViewChange }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Theater[]>([])
  const [open, setOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const isMap = variant === 'map'
  const isHome = pathname === '/'

  // For non-home pages, treat as map-inactive
  const isMapActive = isHome ? view === 'map' : false

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('touchstart', handleOutside)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('touchstart', handleOutside)
    }
  }, [])

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

  function handleSelect(t: Theater) {
    setQuery(t.name)
    setOpen(false)
    setMobileSearchOpen(false)
    if (onTheaterSelect) onTheaterSelect(t)
    else router.push(`/theaters/${t.slug}`)
  }

  function handleViewToggle(v: 'map' | 'list') {
    if (isHome && onViewChange) {
      onViewChange(v)
    } else {
      router.push('/')
    }
  }

  const inputClass = isMap
    ? 'w-48 px-4 py-1.5 rounded-full text-sm focus:outline-none bg-white/15 backdrop-blur-sm text-white placeholder-white/50 border border-white/25 transition'
    : 'w-52 px-4 py-1.5 rounded-full text-sm focus:outline-none bg-gray-100 text-gray-900 placeholder-gray-400 border border-gray-200 transition'

  const Dropdown = () => open && results.length > 0 ? (
    <ul className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-2xl shadow-xl divide-y overflow-hidden z-30 border border-gray-100">
      {results.map((t) => (
        <li key={t.id}
          className="px-4 py-2.5 text-sm hover:bg-amber-50 cursor-pointer transition"
          onMouseDown={() => handleSelect(t)}
          onTouchEnd={() => handleSelect(t)}>
          <span className="font-medium text-gray-900 block">{t.name}</span>
          <span className="text-gray-400 text-xs">{t.city}, {t.country}</span>
        </li>
      ))}
    </ul>
  ) : null

  const ViewToggle = () => {
    const pillRef = useRef<HTMLDivElement>(null)
    const trackRef = useRef<HTMLDivElement>(null)
    const [pillStyle, setPillStyle] = useState({ width: 0, left: 0 })
    const mapBtnRef = useRef<HTMLButtonElement>(null)
    const listBtnRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
      function measure() {
        const active = isMapActive ? mapBtnRef.current : listBtnRef.current
        const track = trackRef.current
        if (!active || !track) return
        const trackRect = track.getBoundingClientRect()
        const btnRect = active.getBoundingClientRect()
        setPillStyle({
          width: btnRect.width,
          left: btnRect.left - trackRect.left,
        })
      }
      measure()
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }, [isMapActive])

    return (
      <div
        ref={trackRef}
        className={`relative flex rounded-full p-0.5 text-xs font-medium flex-shrink-0 select-none ${isMap ? 'bg-white/15 border border-white/20' : 'bg-gray-100 border border-gray-200'}`}
      >
        {/* Sliding pill */}
        <div
          ref={pillRef}
          className={`absolute top-0.5 bottom-0.5 rounded-full ${isMap ? 'bg-white/90' : 'bg-white shadow-sm'}`}
          style={{
            width: pillStyle.width,
            left: pillStyle.left,
            transition: 'left 240ms cubic-bezier(0.34, 1.56, 0.64, 1), width 240ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
        <button
          ref={mapBtnRef}
          onClick={() => handleViewToggle('map')}
          className={`relative z-10 px-4 py-1 rounded-full transition-colors duration-150 cursor-pointer ${isMapActive ? 'text-gray-900' : (isMap ? 'text-white/50' : 'text-gray-400')}`}
        >
          Map
        </button>
        <button
          ref={listBtnRef}
          onClick={() => handleViewToggle('list')}
          className={`relative z-10 px-4 py-1 rounded-full transition-colors duration-150 cursor-pointer ${!isMapActive ? 'text-gray-900' : (isMap ? 'text-white/50' : 'text-gray-400')}`}
        >
          List
        </button>
      </div>
    )
  }

  const wrapperClass = isMap
    ? 'absolute top-0 left-0 right-0 z-20 flex items-center px-4 py-3 gap-3'
    : 'sticky top-0 z-20 flex items-center px-4 py-3 gap-3 bg-white/95 backdrop-blur-sm border-b border-gray-100'

  return (
    <div className={wrapperClass}>
            <span
        onClick={() => {
          if (typeof window !== 'undefined') localStorage.setItem('plazza_view', 'map')
        }}
      >
        <Logo variant={isMap ? 'light' : 'dark'} />
      </span>
      <div className="flex-1" />

      {/* Desktop */}
      <div className="hidden sm:flex items-center gap-2">
        <div ref={searchRef} className="relative">
          <input
            type="text"
            value={query}
            placeholder="Search theaters..."
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => results.length > 0 && setOpen(true)}
            className={inputClass}
          />
          <Dropdown />
        </div>
        <ViewToggle />
      </div>

      {/* Mobile */}
      <div className="flex sm:hidden items-center gap-2">
        {mobileSearchOpen ? (
          <div ref={searchRef} className="relative">
            <input
              autoFocus
              type="text"
              value={query}
              placeholder="Search..."
              onChange={(e) => handleSearchChange(e.target.value)}
              onBlur={() => setTimeout(() => { if (!query) setMobileSearchOpen(false) }, 150)}
              className={inputClass.replace('w-48', 'w-32').replace('w-52', 'w-32')}
            />
            <Dropdown />
          </div>
        ) : (
          <button onClick={() => setMobileSearchOpen(true)} className="cursor-pointer p-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={isMap ? 'white' : '#374151'} strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
        )}
        <ViewToggle />
      </div>
    </div>
  )
}