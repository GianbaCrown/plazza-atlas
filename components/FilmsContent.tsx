'use client'
import { useState, useEffect, useCallback } from 'react'
import MovieOverlayFull from './MovieOverlayFull'

type Movie = {
  id: string; tmdb_id: number; title: string; year: number | null; poster_path: string | null
}
type SortOption = 'newest' | 'oldest' | 'alpha-asc' | 'alpha-desc' | 'popular'

function FilterDropdown({ label, value, options, onChange }: {
  label: string; value: string
  options: { label: string; value: string }[]
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selected = options.find((o) => o.value === value)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
      >
        <span>{selected?.label ?? label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 150ms ease' }}>
          <polyline points="1,3 5,7 9,3"/>
        </svg>
      </button>
      {open && (
        <ul className="absolute top-full left-0 mt-1.5 min-w-[160px] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-30 py-1"
          onMouseLeave={() => setOpen(false)}>
          {options.map((o) => (
            <li key={o.value}>
              <button
                onMouseDown={() => { onChange(o.value); setOpen(false) }}
                className={`w-full text-left px-4 py-2 text-xs cursor-pointer transition-colors ${o.value === value ? 'text-amber-400 bg-zinc-800' : 'text-zinc-300 hover:bg-zinc-800'}`}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function FilmsContent() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [decade, setDecade] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [offset, setOffset] = useState(0)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)
  const [availableDecades, setAvailableDecades] = useState<number[]>([])

  useEffect(() => {
    fetch('/api/films/decades').then(r => r.json()).then(d => setAvailableDecades(d.decades ?? [])).catch(() => {})
  }, [])

  const fetch30 = useCallback(async (off: number, reset: boolean) => {
    if (reset) setLoading(true); else setLoadingMore(true)
    const params = new URLSearchParams({ sort, offset: String(off) })
    if (decade) params.set('decade', decade)
    const res = await fetch(`/api/films?${params}`)
    const data = await res.json()
      setMovies((prev) => {
      if (reset) return data.movies
      const existingIds = new Set(prev.map((m: Movie) => m.id))
      const newMovies = data.movies.filter((m: Movie) => !existingIds.has(m.id))
      return [...prev, ...newMovies]
    })
    setTotal(data.total)
    setOffset(off + 30)
    if (reset) setLoading(false); else setLoadingMore(false)
  }, [decade, sort])

  useEffect(() => { setOffset(0); fetch30(0, true) }, [decade, sort])

  return (
    <div className="h-full overflow-y-auto pb-24 pt-32">
      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-2 flex-wrap">
        <FilterDropdown
          label="All decades" value={decade}
          onChange={setDecade}
          options={[
            { label: 'All decades', value: '' },
            ...availableDecades.map((d) => ({ label: `${d}s`, value: String(d) })),
          ]}
        />
        <FilterDropdown
          label="Sort" value={sort}
          onChange={(v) => setSort(v as SortOption)}
          options={[
            { label: 'Most recent first', value: 'newest' },
            { label: 'Oldest first', value: 'oldest' },
            { label: 'A → Z', value: 'alpha-asc' },
            { label: 'Z → A', value: 'alpha-desc' },
            { label: 'Most popular', value: 'popular' },
          ]}
        />
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <svg className="animate-spin w-5 h-5 text-zinc-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {movies.map((m) => (
                <div key={m.id} className="cursor-pointer group theater-card-appear" onClick={() => setSelectedMovie(m)}>
                  {m.poster_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                      alt={m.title}
                      className="w-full aspect-[2/3] object-cover rounded-sm border border-zinc-800 transition-all duration-400 custom-shadow group-hover:border-zinc-600"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-zinc-800 rounded-lg flex items-center justify-center text-[10px] text-zinc-600">No poster</div>
                  )}
                   {/*
                  <p className="text-xs text-zinc-400 mt-1.5 font-medium leading-tight line-clamp-2">{m.title}</p>
                  {m.year && <p className="text-[10px] text-zinc-600">{m.year}</p> */
                  
                  }
                </div>
              ))}
            </div>
            {offset < total && (
              <div className="flex justify-center mt-10">
                <button
                  onClick={() => fetch30(offset, false)}
                  disabled={loadingMore}
                  className="px-5 py-2 rounded-full border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors cursor-pointer disabled:opacity-40"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
            {movies.length === 0 && <p className="text-zinc-600 text-sm text-center py-16">No films found.</p>}
          </>
        )}
      </div>

      {selectedMovie && (
        <MovieOverlayFull movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </div>
  )
}