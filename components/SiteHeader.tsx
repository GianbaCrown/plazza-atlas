'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from './Logo'
import SearchOverlay from './SearchOverlay'

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
  onLogoClick?: () => void
}

export default function SiteHeader({ variant, theaters = [], onTheaterSelect, view, onViewChange, onLogoClick }: Props) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)
  const isMap = variant === 'map'
  const isMapActive = view !== undefined ? view === 'map' : true

  const trackRefDesktop = useRef<HTMLDivElement>(null)
  const mapBtnRefDesktop = useRef<HTMLButtonElement>(null)
  const listBtnRefDesktop = useRef<HTMLButtonElement>(null)
  const trackRefMobile = useRef<HTMLDivElement>(null)
  const mapBtnRefMobile = useRef<HTMLButtonElement>(null)
  const listBtnRefMobile = useRef<HTMLButtonElement>(null)
  const [pillStyle, setPillStyle] = useState({ width: 0, left: 0 })

  useEffect(() => {
    function measure() {
      const desktopVisible =
        !!trackRefDesktop.current &&
        trackRefDesktop.current.offsetParent !== null

      const track = desktopVisible ? trackRefDesktop.current : trackRefMobile.current
      const mapBtn = desktopVisible ? mapBtnRefDesktop.current : mapBtnRefMobile.current
      const listBtn = desktopVisible ? listBtnRefDesktop.current : listBtnRefMobile.current
      const active = isMapActive ? mapBtn : listBtn
      if (!active || !track) return
      const trackRect = track.getBoundingClientRect()
      const btnRect = active.getBoundingClientRect()
      if (btnRect.width === 0) return
      setPillStyle({ width: btnRect.width, left: btnRect.left - trackRect.left })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isMapActive])

  function handleViewToggle(v: 'map' | 'list') {
    if (onViewChange) onViewChange(v)
    else router.push('/')
  }

  function handleLogoClick() {
    if (onLogoClick) onLogoClick()
    else router.push('/')
  }

  function handleSelect(t: Theater) {
    setSearchOpen(false)
    if (onTheaterSelect) onTheaterSelect(t)
    else router.push(`/theaters/${t.slug}`)
  }

  const SearchIcon = ({ stroke }: { stroke: string }) => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  )

  const Toggle = ({ trackRef, mapRef, listRef }: {
    trackRef: React.RefObject<HTMLDivElement | null>
    mapRef: React.RefObject<HTMLButtonElement | null>
    listRef: React.RefObject<HTMLButtonElement | null>
  }) => (
    <div
      ref={trackRef}
      className="relative flex rounded-full p-0.5 text-xs font-medium flex-shrink-0 select-none bg-white/15 border border-white/20"
    >
      <div
        className="absolute top-0.5 bottom-0.5 rounded-full bg-white/90"
        style={{
          width: pillStyle.width,
          left: pillStyle.left,
          transition: 'left 240ms cubic-bezier(0.34, 1.56, 0.64, 1), width 240ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />
      <button
        ref={mapRef}
        onClick={() => handleViewToggle('map')}
        className={`relative z-10 px-4 py-1 rounded-full transition-colors duration-150 cursor-pointer ${isMapActive ? 'text-gray-900' : 'text-white/50'}`}
      >
        Map
      </button>
      <button
        ref={listRef}
        onClick={() => handleViewToggle('list')}
        className={`relative z-10 px-4 py-1 rounded-full transition-colors duration-150 cursor-pointer ${!isMapActive ? 'text-gray-900' : 'text-white/50'}`}
      >
        List
      </button>
    </div>
  )

  const wrapperClass = isMap
    ? 'absolute top-0 pt-6 left-0 right-0 z-20 flex items-center px-4 py-4 gap-3'
    : 'sticky top-0 pt-6 z-20 flex items-center px-4 py-4 gap-3 bg-zinc-900/90 backdrop-blur-sm border-b border-zinc-800'

  return (
    <>
      <div className={wrapperClass}>
        <button onClick={handleLogoClick} className="ml-3 cursor-pointer bg-transparent h-[50px]">
          <Logo variant="light" />
        </button>
        <div className="flex-1" />

        {/* Search icon — both viewports */}
        <button
          onClick={() => setSearchOpen(true)}
          className="cursor-pointer p-1.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Search"
        >
          <SearchIcon stroke="rgba(255,255,255,0.6)" />
        </button>

        {/* Toggle — desktop */}
        <div className="hidden sm:block">
          <Toggle
            trackRef={trackRefDesktop}
            mapRef={mapBtnRefDesktop}
            listRef={listBtnRefDesktop}
          />
        </div>

        {/* Toggle — mobile */}
        <div className="sm:hidden">
          <Toggle
            trackRef={trackRefMobile}
            mapRef={mapBtnRefMobile}
            listRef={listBtnRefMobile}
          />
        </div>
      </div>

      {searchOpen && (
        <SearchOverlay
          theaters={theaters}
          onSelect={handleSelect}
          onClose={() => setSearchOpen(false)}
        />
      )}
    </>
  )
}