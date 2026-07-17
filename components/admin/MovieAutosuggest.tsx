'use client'
import { useState } from 'react'

type TmdbResult = { tmdb_id: number; title: string; year: string; poster_path: string | null }

export default function MovieAutosuggest({ onSelect }: { onSelect: (movie: TmdbResult) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbResult[]>([])

  function handleChange(value: string) {
    setQuery(value)
    if (!value) { setResults([]); return }
    fetch(`/api/tmdb/search?q=${encodeURIComponent(value)}`).then((r) => r.json()).then(setResults)
  }

  return (
    <div className="relative">
      <input value={query} onChange={(e) => handleChange(e.target.value)} placeholder="Search a film title..." className="w-full border rounded px-2 py-1 text-sm" />
      {results.length > 0 && (
        <ul className="border rounded mt-1 bg-white shadow divide-y absolute z-10 w-full max-h-48 overflow-y-auto">
          {results.map((m) => (
            <li key={m.tmdb_id} className="p-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center gap-2"
              onClick={() => { onSelect(m); setQuery(''); setResults([]) }}>
              {m.poster_path && <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} className="w-6 h-9 object-cover rounded" alt="" />}
              {m.title} {m.year && `(${m.year})`}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}