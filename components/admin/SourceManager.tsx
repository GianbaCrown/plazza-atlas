'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function SourceManager() {
  const supabase = createClient()
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', url: '', image_path: '' })
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    const { data } = await supabase.from('sources').select('*').order('name')
    setSources(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openNew() {
    setForm({ name: '', url: '', image_path: '' })
    setEditingId(null)
    setPanelOpen(true)
  }

  function openEdit(s: any) {
    setForm({ name: s.name, url: s.url ?? '', image_path: s.image_path ?? '' })
    setEditingId(s.id)
    setPanelOpen(true)
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('source-images').upload(path, file)
    if (error) { alert(error.message); setUploading(false); return }
    setForm((f) => ({ ...f, image_path: path }))
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    const payload = { name: form.name, url: form.url || null, image_path: form.image_path || null }
    if (editingId) {
      const { error } = await supabase.from('sources').update(payload).eq('id', editingId)
      if (error) { alert(error.message); setSaving(false); return }
    } else {
      const { error } = await supabase.from('sources').insert(payload)
      if (error) { alert(error.message); setSaving(false); return }
    }
    setSaving(false)
    setPanelOpen(false)
    load()
  }

  async function handleDelete() {
    if (!editingId) return
    if (!confirm('Delete this source?')) return
    await supabase.from('sources').delete().eq('id', editingId)
    setPanelOpen(false)
    load()
  }

  const imageBaseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/source-images/`

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Sources</h1>
        <button onClick={openNew} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Add source
        </button>
      </div>

      {loading ? <p className="text-gray-400 text-sm">Loading...</p> : (
        <div className="space-y-2">
          {sources.map((s) => (
            <button key={s.id} onClick={() => openEdit(s)}
              className="w-full flex items-center gap-3 border border-gray-200 rounded-xl p-4 hover:border-amber-300 hover:shadow-sm transition text-left bg-white">
              {s.image_path
                ? <img src={imageBaseUrl + s.image_path} className="w-10 h-10 rounded object-cover bg-gray-100" alt="" />
                : <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">img</div>
              }
              <div>
                <p className="font-medium text-gray-900">{s.name}</p>
                {s.url && <p className="text-xs text-gray-400 truncate max-w-xs">{s.url}</p>}
              </div>
            </button>
          ))}
          {sources.length === 0 && <p className="text-gray-400 text-sm">No sources yet.</p>}
        </div>
      )}

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setPanelOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-lg font-semibold">{editingId ? 'Edit source' : 'New source'}</h2>
              <button onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">URL (optional)</label>
                <input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://..."
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Image (optional — logo or book cover)</label>
                {form.image_path && (
                  <img src={imageBaseUrl + form.image_path} className="mt-2 w-20 h-20 object-cover rounded" alt="" />
                )}
                <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading}
                  className="mt-2 text-sm" />
                {uploading && <p className="text-xs text-gray-400 mt-1">Uploading...</p>}
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-between">
              <div>{editingId && <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">Delete</button>}</div>
              <button onClick={handleSave} disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}