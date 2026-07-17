'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LocationSearch from './LocationSearch'
import { createTheater, updateTheater, deleteTheater } from '@/app/admin/(dashboard)/theaters/actions'

export default function TheaterForm({ theater }: { theater?: any }) {
  const router = useRouter()
  const [form, setForm] = useState(
    theater ?? {
      name: '', slug: '', description: '', address: '', city: '', country: '',
      lat: 0, lng: 0, year_opened: null, year_closed: null,
      nearest_theater_name: '', nearest_theater_address: '', nearest_theater_lat: null, nearest_theater_lng: null,
      status: 'draft',
    }
  )
  const [saving, setSaving] = useState(false)

  function update(key: string, value: any) {
    setForm((f: any) => ({ ...f, [key]: value }))
  }

  function slugify(text: string) {
    return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (theater?.id) {
      await updateTheater(theater.id, form)
      router.refresh()
    } else {
      const newId = await createTheater(form)
      router.push(`/admin/theaters/${newId}/edit`)
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!theater?.id) return
    if (!confirm('Delete this theater?')) return
    await deleteTheater(theater.id)
    router.push('/admin/theaters')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
      <div>
        <label className="text-sm font-medium">Name</label>
        <input value={form.name} onChange={(e) => { update('name', e.target.value); if (!theater) update('slug', slugify(e.target.value)) }} required className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="text-sm font-medium">Slug</label>
        <input value={form.slug} onChange={(e) => update('slug', e.target.value)} required className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="text-sm font-medium">Description (optional)</label>
        <textarea value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} rows={4} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="text-sm font-medium">Location</label>
        <LocationSearch placeholder="Search the theater's address..." onSelect={(r) => {
          update('address', r.display_name); update('city', r.city); update('country', r.country)
          update('lat', r.lat); update('lng', r.lng)
        }} />
        {form.lat !== 0 && <p className="text-xs text-gray-500 mt-1">{form.city}, {form.country}</p>}
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-sm font-medium">Year opened</label>
          <input type="number" value={form.year_opened ?? ''} onChange={(e) => update('year_opened', e.target.value ? Number(e.target.value) : null)} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium">Year closed</label>
          <input type="number" value={form.year_closed ?? ''} onChange={(e) => update('year_closed', e.target.value ? Number(e.target.value) : null)} className="w-full border rounded px-3 py-2" />
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Nearest theater today (optional)</label>
        <LocationSearch placeholder="Search a nearby open cinema..." onSelect={(r) => {
          update('nearest_theater_name', r.display_name.split(',')[0])
          update('nearest_theater_address', r.display_name)
          update('nearest_theater_lat', r.lat); update('nearest_theater_lng', r.lng)
        }} />
        {form.nearest_theater_name && <p className="text-xs text-gray-500 mt-1">{form.nearest_theater_address}</p>}
      </div>
      <div>
        <label className="text-sm font-medium">Status</label>
        <select value={form.status} onChange={(e) => update('status', e.target.value)} className="w-full border rounded px-3 py-2">
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="bg-amber-600 text-white px-4 py-2 rounded">
          {saving ? 'Saving...' : theater ? 'Save changes' : 'Create theater'}
        </button>
        {theater?.id && <button type="button" onClick={handleDelete} className="text-red-600 px-4 py-2 rounded border border-red-200">Delete</button>}
      </div>
    </form>
  )
}