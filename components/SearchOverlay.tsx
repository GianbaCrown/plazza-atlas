'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

type Theater = {
  id: string; name: string; slug: string; lat: number; lng: number
  city?: string; country?: string
}

type Props = {
  theaters: Theater[]
  onSelect: (t: Theater) => void
  onClose: () => void
}

export default function SearchOverlay({ theaters, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Theater[]>([])
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setVisible(true)
      inputRef.current?.focus()
    }))

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 180)
  }

  function handleChange(value: string) {
    setQuery(value)
    if (!value) { setResults([]); return }
    const lower = value.toLowerCase()
    setResults(
      theaters.filter((t) =>
        t.name.toLowerCase().includes(lower) ||
        t.city?.toLowerCase().includes(lower) ||
        t.country?.toLowerCase().includes(lower)
      ).slice(0, 8)
    )
  }

  function handleSelect(t: Theater) {
    handleClose()
    // Small delay so overlay closes before flyTo starts
    setTimeout(() => onSelect(t), 200)
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center pt-24 px-4"
      style={{
        background: 'rgba(9, 9, 11, 0.9)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 180ms ease',
      }}
      onClick={handleClose}
    >
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
      >
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="1" y1="1" x2="13" y2="13"/>
          <line x1="13" y1="1" x2="1" y2="13"/>
        </svg>
      </button>

      {/* Search box */}
      <div
        className="w-full max-w-lg relative mt-36"
        style={{
          transform: visible ? 'translateY(0)' : 'translateY(-12px)',
          transition: 'transform 180ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search theaters by name, city, country..."
          className="w-full bg-zinc-900 font-sm border border-zinc-800 rounded-sm px-5 py-3.5 text-sm text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-800"
          // style={{ fontSize: '16px' }} // prevent iOS zoom
        />

        {results.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-1.5 bg-zinc-900 border border-zinc-800 rounded-sm shadow-2xl overflow-hidden divide-y divide-zinc-800 z-10">
            {results.map((t) => (
              <li
                key={t.id}
                className="px-5 py-3 hover:bg-zinc-800 cursor-pointer transition"
                onMouseDown={() => handleSelect(t)}
                onTouchEnd={() => handleSelect(t)}
              >
                <span className="font-medium text-zinc-100 text-sm block">{t.name}</span>
                <span className="text-zinc-500 text-xs">{t.city}, {t.country}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>,
    document.body
  )
}