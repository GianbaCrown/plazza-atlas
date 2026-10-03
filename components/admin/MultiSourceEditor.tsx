'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type SourceEntry = {
  id?: string
  source_id: string
  source_url: string
  sort_order: number
}

type Props = {
  theaterId: string
  initialEntries: SourceEntry[]
  sources: { id: string; name: string }[]
}

export default function MultiSourceEditor({ theaterId, initialEntries, sources }: Props) {
  const supabase = createClient()
  const [entries, setEntries] = useState<SourceEntry[]>(
    initialEntries.map((e) => ({
      ...e,
      source_id: e.source_id ?? '',
      source_url: e.source_url ?? '',
    }))
  )

  async function addEntry() {
    const { data, error } = await supabase
      .from('theater_sources')
      .insert({ theater_id: theaterId, source_id: null, source_url: null, sort_order: entries.length })
      .select('id').single()
    if (error) { alert(error.message); return }
    setEntries((prev) => [...prev, { id: data.id, source_id: '', source_url: '', sort_order: prev.length }])
  }

  async function updateEntry(index: number, field: 'source_id' | 'source_url', value: string) {
    const entry = entries[index]
    const updated = { ...entry, [field]: value }
    setEntries((prev) => prev.map((e, i) => i === index ? updated : e))
    if (!entry.id) return
    await supabase.from('theater_sources').update({
      source_id: updated.source_id || null,
      source_url: updated.source_url || null,
    }).eq('id', entry.id)
  }

  async function removeEntry(index: number) {
    const entry = entries[index]
    if (entry.id) {
      const { error } = await supabase.from('theater_sources').delete().eq('id', entry.id)
      if (error) { alert(error.message); return }
    }
    setEntries((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => (
        <div key={entry.id ?? i} className="border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Source {i + 1}</p>
            <button
              type="button"
              onClick={() => removeEntry(i)}
              className="text-xs text-red-500 hover:text-red-700 cursor-pointer"
            >
              Remove
            </button>
          </div>
          <select
            value={entry.source_id}
            onChange={(e) => updateEntry(i, 'source_id', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">No source</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input
            value={entry.source_url}
            onChange={(e) => updateEntry(i, 'source_url', e.target.value)}
            onBlur={(e) => updateEntry(i, 'source_url', e.target.value)}
            placeholder="Source URL (optional, e.g. link to specific page)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addEntry}
        className="text-xs text-amber-600 hover:text-amber-700 cursor-pointer"
      >
        + Add source
      </button>
    </div>
  )
}