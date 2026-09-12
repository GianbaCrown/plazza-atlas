'use client'
import { useState, useEffect, useRef } from 'react'

type Result = { display_name: string; lat: number; lng: number; city: string; country: string }

export default function LocationSearch({
  onSelect, placeholder, defaultValue,
}: { onSelect: (r: Result) => void; placeholder?: string; defaultValue?: string }) {
  const [query, setQuery] = useState(defaultValue ?? '')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const justSelectedRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click/tap (fixes mobile)
  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  useEffect(() => {
    if (!query || query.length < 3) { setResults([]); return }
    if (justSelectedRef.current) return
    setLoading(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`)
      setResults(await res.json())
      setLoading(false)
      setOpen(true)
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function handleSelect(r: Result) {
    justSelectedRef.current = true
    setQuery(r.display_name)
    setResults([])
    setOpen(false)
    onSelect(r)
    setTimeout(() => { justSelectedRef.current = false }, 500)
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        placeholder={placeholder ?? 'Start typing an address...'}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
      />
      {loading && <span className="absolute right-3 top-2.5 text-xs text-gray-400">···</span>}
      {open && results.length > 0 && (
        <ul className="absolute z-20 w-full bg-white border rounded-lg mt-1 shadow-lg divide-y max-h-56 overflow-y-auto">
          {results.map((r, i) => (
            <li key={i}
              className="p-2.5 text-sm hover:bg-amber-50 cursor-pointer"
              onMouseDown={() => handleSelect(r)}
              onTouchEnd={() => handleSelect(r)}
            >
              {r.display_name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}