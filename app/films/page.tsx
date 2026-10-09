'use client'
import { useState, useEffect, useCallback } from 'react'
import MovieOverlayFull from '@/components/MovieOverlayFull'

type Movie = {
  id: string
  tmdb_id: number
  title: string
  year: number | null
  poster_path: string | null
}

type SortOption = 'newest' | 'oldest' | 'alpha-asc' | 'alpha-desc' | 'popular'

const decades = Array.from({ length: 11 }, (_, i) => 1920 + i * 10)

function FilterDropdown({
  label, value, options, onChange,
}: {
  label: string
  value: string
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
                className={`w-full text-left px-4 py-2 text-xs transition-colors cursor-pointer ${
                  o.value === value ? 'text-amber-400 bg-zinc-800' : 'text-zinc-300 hover:bg-zinc-800'
                }`}
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

export default function FilmsPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [decade, setDecade] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')
  const [offset, setOffset] = useState(0)
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null)

  const fetch30 = useCallback(async (off: number, reset: boolean) => {
    if (reset) setLoading(true)
    else setLoadingMore(true)

    const params = new URLSearchParams({ sort, offset: String(off) })
    if (decade) params.set('decade', decade)

    const res = await fetch(`/api/films?${params}`)
    const data = await res.json()

    setMovies((prev) => reset ? data.movies : [...prev, ...data.movies])
    setTotal(data.total)
    setOffset(off + 30)
    if (reset) setLoading(false)
    else setLoadingMore(false)
  }, [decade, sort])

  useEffect(() => {
    setOffset(0)
    fetch30(0, true)
  }, [decade, sort])

  function handleFilterChange(key: 'decade' | 'sort', value: string) {
    if (key === 'decade') setDecade(value)
    else setSort(value as SortOption)
  }

  return (
    <div className="min-h-screen bg-zinc-900 pb-24">

      {/* Header */}
      <div className="sticky top-0 z-20 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <a href="/" className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12,19 5,12 12,5"/>
          </svg>
          Map
        </a>
        <span className="text-zinc-700 text-xs">·</span>
        <h1 className="text-xs text-zinc-400">Films</h1>
        <span className="text-zinc-700 text-xs">·</span>
        <span className="text-xs text-zinc-600">{total} films</span>
      </div>

      {/* Filters */}
      <div className="max-w-6xl mx-auto px-4 py-5 flex gap-2 flex-wrap">
        <FilterDropdown
          label="All decades"
          value={decade}
          onChange={(v) => handleFilterChange('decade', v)}
          options={[
            { label: 'All decades', value: '' },
            ...decades.map((d) => ({ label: `${d}s`, value: String(d) })),
          ]}
        />
        <FilterDropdown
          label="Sort"
          value={sort}
          onChange={(v) => handleFilterChange('sort', v)}
                    options={[
            { label: 'Most recent first', value: 'newest' },
            { label: 'Oldest first', value: 'oldest' },
            { label: 'A → Z', value: 'alpha-asc' },
            { label: 'Z → A', value: 'alpha-desc' },
            { label: 'Most popular', value: 'popular' },
          ]}
        />
      </div>

      {/* Grid */}
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
                <div
                  key={m.id}
                  className="cursor-pointer group theater-card-appear"
                  onClick={() => setSelectedMovie(m)}
                >
                  {m.poster_path ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                      alt={m.title}
                      className="w-full aspect-[2/3] object-cover rounded-lg border border-zinc-800 transition-all duration-200 group-hover:border-zinc-600 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="w-full aspect-[2/3] bg-zinc-800 rounded-lg border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-600">
                      No poster
                    </div>
                  )}
                  <p className="text-xs text-zinc-400 mt-1.5 font-medium leading-tight line-clamp-2">{m.title}</p>
                  {m.year && <p className="text-[10px] text-zinc-600">{m.year}</p>}
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

            {movies.length === 0 && (
              <p className="text-zinc-600 text-sm text-center py-16">No films found.</p>
            )}
          </>
        )}
      </div>

      {/* Movie overlay with theater list */}
      {selectedMovie && (
        <MovieOverlayFull
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
          onFlyToTheater={(t) => {
            setSelectedMovie(null)
            // Navigate to home and fly — store in sessionStorage for pickup
            sessionStorage.setItem('flyToTheater', JSON.stringify(t))
            window.location.href = '/'
          }}
        />
      )}
    </div>
  )
}