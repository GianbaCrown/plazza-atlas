'use client'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import Logo from './Logo'
import SearchOverlay from './SearchOverlay'

type Theater = {
  id: string; name: string; slug: string; lat: number; lng: number
  city?: string; country?: string
}

type ViewType = 'map' | 'list' | 'films'

type Props = {
  variant: 'map' | 'page'
  theaters?: Theater[]
  onTheaterSelect?: (t: Theater) => void
  view?: ViewType
  onViewChange?: (v: ViewType) => void
  onLogoClick?: () => void
  onSearchOpen?: () => void
}

export default function SiteHeader({
  variant, theaters = [], onTheaterSelect, view, onViewChange, onLogoClick, onSearchOpen,
}: Props) {
  const router = useRouter()

  // Search — kept in code but hidden from UI
  // const [searchOpen, setSearchOpen] = useState(false)

  const isMap = variant === 'map'
  const activeView: ViewType = view ?? 'map'

  const trackRefDesktop = useRef<HTMLDivElement>(null)
  const trackRefMobile = useRef<HTMLDivElement>(null)
  const mapBtnRefDesktop = useRef<HTMLButtonElement>(null)
  const listBtnRefDesktop = useRef<HTMLButtonElement>(null)
  const filmsBtnRefDesktop = useRef<HTMLButtonElement>(null)
  const mapBtnRefMobile = useRef<HTMLButtonElement>(null)
  const listBtnRefMobile = useRef<HTMLButtonElement>(null)
  const filmsBtnRefMobile = useRef<HTMLButtonElement>(null)
  const [pillStyle, setPillStyle] = useState({ width: 0, left: 0 })

  useLayoutEffect(() => {
    function measure() {
      const desktopVisible =
        !!trackRefDesktop.current &&
        trackRefDesktop.current.offsetParent !== null

      const track = desktopVisible ? trackRefDesktop.current : trackRefMobile.current
      const mapBtn = desktopVisible ? mapBtnRefDesktop.current : mapBtnRefMobile.current
      const listBtn = desktopVisible ? listBtnRefDesktop.current : listBtnRefMobile.current
      const filmsBtn = desktopVisible ? filmsBtnRefDesktop.current : filmsBtnRefMobile.current

      const active =
        activeView === 'map' ? mapBtn :
        activeView === 'list' ? listBtn :
        filmsBtn

      if (!active || !track) return
      const trackRect = track.getBoundingClientRect()
      const btnRect = active.getBoundingClientRect()
      if (btnRect.width === 0) return
      setPillStyle({ width: btnRect.width, left: btnRect.left - trackRect.left })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeView])

  function handleViewToggle(v: ViewType) {
    if (onViewChange) onViewChange(v)
    else if (v === 'films') router.push('/films')
    else router.push('/')
  }

  function handleLogoClick() {
    if (onLogoClick) onLogoClick()
    else router.push('/')
  }

  // Search icon — commented out from UI but kept for future use
  // const SearchIcon = ({ stroke }: { stroke: string }) => (
  //   <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">
  //     <circle cx="11" cy="11" r="7"/>
  //     <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  //   </svg>
  // )

  const Toggle = ({
    trackRef, mapRef, listRef, filmsRef,
  }: {
    trackRef: React.RefObject<HTMLDivElement | null>
    mapRef: React.RefObject<HTMLButtonElement | null>
    listRef: React.RefObject<HTMLButtonElement | null>
    filmsRef: React.RefObject<HTMLButtonElement | null>
  }) => (
    <div
      ref={trackRef}
      className="relative flex backdrop-blur-sm rounded-full p-0.5 text-xs font-medium flex-shrink-0 select-none bg-black/30 border border-zinc-700"
    >
      <div
        className="absolute top-0.5 bottom-0.5 rounded-full bg-zinc-200"
        style={{
          width: pillStyle.width,
          left: pillStyle.left,
          transition: 'left 240ms cubic-bezier(0.34, 1.56, 0.64, 1), width 240ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      />
      <button
        ref={mapRef}
        onClick={() => handleViewToggle('map')}
        className={`relative z-10 px-3 py-1 rounded-full transition-colors duration-150 cursor-pointer ${activeView === 'map' ? 'text-zinc-900' : 'text-zinc-300'}`}
      >
        Map
      </button>
      <button
        ref={listRef}
        onClick={() => handleViewToggle('list')}
        className={`relative z-10 px-3 py-1 rounded-full transition-colors duration-150 cursor-pointer ${activeView === 'list' ? 'text-zinc-900' : 'text-zinc-300'}`}
      >
        Theatres
      </button>
      <button
        ref={filmsRef}
        onClick={() => handleViewToggle('films')}
        className={`relative z-10 px-3 py-1 rounded-full transition-colors duration-150 cursor-pointer ${activeView === 'films' ? 'text-zinc-900' : 'text-zinc-300'}`}
      >
        Films
      </button>
    </div>
  )

 const wrapperClass = isMap
    ? 'absolute top-0 pt-6 left-0 right-0 z-20 flex items-center px-4 py-4 gap-3'
    : 'sticky top-0 pt-6 z-20 flex items-center px-4 py-4 gap-3 bg-black/60 backdrop-blur-sm border-b border-zinc-800'

  return (
    <>
      <div className={wrapperClass}>
        <button onClick={handleLogoClick} className="ml-3 cursor-pointer bg-transparent h-[50px]">
          <Logo variant="light" />
        </button>
        <div className="flex-1" />

        {/* Search icon — hidden but kept for future use */}
        {/* <button
          onClick={() => onSearchOpen?.()}
          className="cursor-pointer p-1.5 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Search"
        >
          <SearchIcon stroke="rgba(255,255,255,0.6)" />
        </button> */}

        <div className="hidden sm:block">
          {Toggle({
  trackRef: trackRefDesktop,
  mapRef: mapBtnRefDesktop,
  listRef: listBtnRefDesktop,
  filmsRef: filmsBtnRefDesktop,
})}
        </div>
        <div className="sm:hidden">
          {Toggle({
  trackRef: trackRefMobile,
  mapRef: mapBtnRefMobile,
  listRef: listBtnRefMobile,
  filmsRef: filmsBtnRefMobile,
})}
        </div>
      </div>

      {/* Search overlay — kept but hidden from UI */}
      {/* {searchOpen && (
        <SearchOverlay
          theaters={theaters}
          onSelect={(t) => {
            // setSearchOpen(false)
            if (onTheaterSelect) onTheaterSelect(t)
            else router.push(`/theaters/${t.slug}`)
          }}
          onClose={() => setSearchOpen(false)}
        />
      )} */}
    </>
  )
}