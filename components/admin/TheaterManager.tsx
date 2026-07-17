'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import LocationSearch from './LocationSearch'
import ImageManager from './ImageManager'

const emptyForm = {
  name: '', slug: '', description: '', address: '', city: '', country: '',
  lat: 0, lng: 0, year_opened: null, year_closed: null,
  nearest_theater_name: '', nearest_theater_address: '', nearest_theater_lat: null, nearest_theater_lng: null,
  status: 'draft',
}

export default function TheaterManager() {
  const supabase = createClient()
  const [theaters, setTheaters] = useState<any[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'images'>('details')
  const [form, setForm] = useState<any>(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [images, setImages] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  async function loadTheaters() {
    setLoadingList(true)
    const { data } = await supabase.from('theaters').select('id, name, city, country, status').order('created_at', { ascending: false })
    setTheaters(data ?? [])
    setLoadingList(false)
  }

  useEffect(() => { loadTheaters() }, [])

  function openNew() {
    setForm(emptyForm); setEditingId(null); setImages([]); setActiveTab('details'); setPanelOpen(true)
  }

  async function openEdit(id: string) {
    const { data: theater } = await supabase.from('theaters').select('*').eq('id', id).single()
    const { data: imgs } = await supabase.from('images')
      .select('*, image_movies(movie_id, movies(id, title, year, poster_path))')
      .eq('theater_id', id).order('sort_order')
    setForm(theater); setEditingId(id); setImages(imgs ?? []); setActiveTab('details'); setPanelOpen(true)
  }

  function update(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }))
  }

  function slugify(text: string) {
    return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  async function handleSave() {
    setSaving(true)
    const payload = {
      name: form.name, slug: form.slug, description: form.description,
      address: form.address, city: form.city, country: form.country,
      lat: form.lat, lng: form.lng,
      year_opened: form.year_opened, year_closed: form.year_closed,
      nearest_theater_name: form.nearest_theater_name,
      nearest_theater_address: form.nearest_theater_address,
      nearest_theater_lat: form.nearest_theater_lat,
      nearest_theater_lng: form.nearest_theater_lng,
      status: form.status,
    }
    if (editingId) {
      const { error } = await supabase.from('theaters').update(payload).eq('id', editingId)
      if (error) { alert(error.message); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('theaters').insert(payload).select('id').single()
      if (error) { alert(error.message); setSaving(false); return }
      setEditingId(data.id)
      setActiveTab('images')
    }
    setSaving(false)
    loadTheaters()
  }

  async function handleDelete() {
    if (!editingId) return
    if (!confirm('Delete this theater? This cannot be undone.')) return
    await supabase.from('theaters').delete().eq('id', editingId)
    setPanelOpen(false)
    loadTheaters()
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Theaters</h1>
        <button onClick={openNew} className="bg-amber-600 hover:bg-amber-700 transition text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm">
          + Add theater
        </button>
      </div>

      {loadingList ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <div className="space-y-2">
          {theaters.map((t) => (
            <button key={t.id} onClick={() => openEdit(t.id)}
              className="w-full flex justify-between items-center border border-gray-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition text-left bg-white">
              <div>
                <p className="font-medium text-gray-900">{t.name}</p>
                <p className="text-sm text-gray-500">{t.city}, {t.country}</p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${t.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {t.status}
              </span>
            </button>
          ))}
          {theaters.length === 0 && <p className="text-gray-400 text-sm">No theaters yet — add your first one.</p>}
        </div>
      )}

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPanelOpen(false)} />
          <div className="relative w-full max-w-lg bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit theater' : 'New theater'}</h2>
              <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>

            <div className="flex border-b px-6 gap-6 text-sm">
              <button onClick={() => setActiveTab('details')} className={`py-3 border-b-2 transition ${activeTab === 'details' ? 'border-amber-600 text-amber-700 font-medium' : 'border-transparent text-gray-500'}`}>
                Details
              </button>
              <button onClick={() => editingId && setActiveTab('images')} disabled={!editingId}
                className={`py-3 border-b-2 transition ${activeTab === 'images' ? 'border-amber-600 text-amber-700 font-medium' : 'border-transparent text-gray-400'} ${!editingId && 'cursor-not-allowed opacity-50'}`}>
                Images {!editingId && '(save first)'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeTab === 'details' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <input value={form.name} onChange={(e) => { update('name', e.target.value); if (!editingId) update('slug', slugify(e.target.value)) }}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Slug</label>
                    <input value={form.slug} onChange={(e) => update('slug', e.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <textarea value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} rows={4}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Location</label>
                    <div className="mt-1">
                      <LocationSearch defaultValue={form.address} placeholder="Start typing the theater's address..." onSelect={(r) => {
                        update('address', r.display_name); update('city', r.city); update('country', r.country)
                        update('lat', r.lat); update('lng', r.lng)
                      }} />
                    </div>
                    {form.lat !== 0 && <p className="text-xs text-gray-400 mt-1">{form.city}, {form.country}</p>}
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Year opened</label>
                      <input type="number" value={form.year_opened ?? ''} onChange={(e) => update('year_opened', e.target.value ? Number(e.target.value) : null)}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                    <div className="flex-1">
                      <label className="text-sm font-medium text-gray-700">Year closed</label>
                      <input type="number" value={form.year_closed ?? ''} onChange={(e) => update('year_closed', e.target.value ? Number(e.target.value) : null)}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nearest theater today</label>
                    <div className="mt-1">
                      <LocationSearch defaultValue={form.nearest_theater_address} placeholder="Search a nearby open cinema..." onSelect={(r) => {
                        update('nearest_theater_name', r.display_name.split(',')[0])
                        update('nearest_theater_address', r.display_name)
                        update('nearest_theater_lat', r.lat); update('nearest_theater_lng', r.lng)
                      }} />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <select value={form.status} onChange={(e) => update('status', e.target.value)}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500">
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>
              ) : (
                <ImageManager theaterId={editingId!} initialImages={images} />
              )}
            </div>

            <div className="border-t px-6 py-4 flex justify-between">
              <div>{editingId && <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">Delete theater</button>}</div>
              <button onClick={handleSave} disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 transition text-white px-5 py-2 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}