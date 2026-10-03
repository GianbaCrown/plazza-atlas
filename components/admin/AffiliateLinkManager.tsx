'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type AffiliateLink = {
  id: string
  tmdb_id: number
  movie_title: string
  country: string
  url: string
  cta: string
}

type GroupedLinks = Record<string, { title: string; tmdb_id: number; links: AffiliateLink[] }>

const emptyForm = { tmdb_id: 0, movie_title: '', country: '', url: '', cta: '' }

export default function AffiliateLinkManager() {
  const supabase = createClient()
  const [grouped, setGrouped] = useState<GroupedLinks>({})
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingLink, setEditingLink] = useState<AffiliateLink | null>(null)
  const [form, setForm] = useState<typeof emptyForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [movieSearch, setMovieSearch] = useState('')
  const [movieResults, setMovieResults] = useState<any[]>([])

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('affiliate_links').select('*').order('movie_title')
    const g: GroupedLinks = {}
    for (const link of data ?? []) {
      const key = String(link.tmdb_id)
      if (!g[key]) g[key] = { title: link.movie_title, tmdb_id: link.tmdb_id, links: [] }
      g[key].links.push(link)
    }
    setGrouped(g)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function searchMovies(q: string) {
    setMovieSearch(q)
    if (!q) { setMovieResults([]); return }
    const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`)
    setMovieResults(await res.json())
  }

  function openNew() {
    setForm(emptyForm)
    setEditingLink(null)
    setMovieSearch('')
    setMovieResults([])
    setPanelOpen(true)
  }

  function openEdit(link: AffiliateLink) {
    setForm({ tmdb_id: link.tmdb_id, movie_title: link.movie_title, country: link.country, url: link.url, cta: link.cta })
    setEditingLink(link)
    setMovieSearch(link.movie_title)
    setMovieResults([])
    setPanelOpen(true)
  }

  async function handleSave() {
    if (!form.tmdb_id || !form.country || !form.url || !form.cta) {
      alert('Please fill in all fields')
      return
    }
    setSaving(true)
    if (editingLink) {
      await supabase.from('affiliate_links').update(form).eq('id', editingLink.id)
    } else {
      await supabase.from('affiliate_links').insert(form)
    }
    setSaving(false)
    setPanelOpen(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this link?')) return
    await supabase.from('affiliate_links').delete().eq('id', id)
    load()
  }

  const sortedKeys = Object.keys(grouped).sort((a, b) =>
    grouped[a].title.localeCompare(grouped[b].title)
  )

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Affiliate Links</h1>
        <button onClick={openNew} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium cursor-pointer">
          + Add new link
        </button>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading...</p> : (
        <div className="space-y-4">
          {sortedKeys.map((key) => {
            const group = grouped[key]
            return (
              <div key={key} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <p className="font-medium text-sm text-gray-900">{group.title}</p>
                  <button
                    onClick={() => {
                      setForm({ ...emptyForm, tmdb_id: group.tmdb_id, movie_title: group.title })
                      setEditingLink(null)
                      setMovieSearch(group.title)
                      setMovieResults([])
                      setPanelOpen(true)
                    }}
                    className="text-xs text-amber-600 hover:text-amber-700 cursor-pointer"
                  >
                    + Add link
                  </button>
                </div>
                {group.links.map((link) => (
                  <div key={link.id} className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
                    <div>
                      <span className="text-xs font-medium text-gray-500 mr-2">{link.country}</span>
                      <span className="text-xs text-gray-700">{link.cta}</span>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(link)} className="text-xs text-gray-500 hover:text-gray-800 cursor-pointer">Edit</button>
                      <button onClick={() => handleDelete(link.id)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
          {sortedKeys.length === 0 && <p className="text-gray-400 text-sm">No affiliate links yet.</p>}
        </div>
      )}

      {/* Panel */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPanelOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">{editingLink ? 'Edit link' : 'New affiliate link'}</h2>
              <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl cursor-pointer">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Movie</label>
                <div className="relative mt-1">
                  <input
                    value={movieSearch}
                    onChange={(e) => searchMovies(e.target.value)}
                    placeholder="Search movie..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    disabled={!!editingLink}
                  />
                  {movieResults.length > 0 && (
                    <ul className="absolute z-20 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto divide-y">
                      {movieResults.map((m) => (
                        <li key={m.tmdb_id}
                          className="px-3 py-2 text-sm hover:bg-amber-50 cursor-pointer flex items-center gap-2"
                          onMouseDown={() => {
                            setForm((f) => ({ ...f, tmdb_id: m.tmdb_id, movie_title: m.title }))
                            setMovieSearch(`${m.title}${m.year ? ` (${m.year})` : ''}`)
                            setMovieResults([])
                          }}>
                          {m.poster_path && <img src={`https://image.tmdb.org/t/p/w92${m.poster_path}`} className="w-6 h-9 object-cover rounded" alt="" />}
                          {m.title} {m.year && <span className="text-gray-400">({m.year})</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Country code</label>
                <input
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))}
                  placeholder="FR, US, GB..."
                  maxLength={2}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">URL</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Call to action</label>
                <input
                  value={form.cta}
                  onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))}
                  placeholder="Buy the Blu-Ray on Fnac.com"
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-between">
              <div>{editingLink && <button onClick={() => handleDelete(editingLink.id)} className="text-sm text-red-600 hover:underline cursor-pointer">Delete</button>}</div>
              <button onClick={handleSave} disabled={saving} className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}