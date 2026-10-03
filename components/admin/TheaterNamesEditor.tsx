'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type NameEntry = {
  id?: string
  name: string
  year_from: string
  year_to: string
  sort_order: number
}

export default function TheaterNamesEditor({
  theaterId,
  initialNames,
}: {
  theaterId: string
  initialNames: NameEntry[]
}) {
  const supabase = createClient()
  const [names, setNames] = useState<NameEntry[]>(
    initialNames.map((n) => ({
      ...n,
      year_from: String(n.year_from ?? ''),
      year_to: String(n.year_to ?? ''),
    }))
  )

  async function addName() {
    const { data, error } = await supabase
      .from('theater_names')
      .insert({ theater_id: theaterId, name: '', year_from: null, year_to: null, sort_order: names.length })
      .select('id').single()
    if (error) { alert(error.message); return }
    setNames((prev) => [...prev, { id: data.id, name: '', year_from: '', year_to: '', sort_order: prev.length }])
  }

  async function updateName(index: number, field: keyof NameEntry, value: string) {
    const entry = { ...names[index], [field]: value }
    setNames((prev) => prev.map((n, i) => i === index ? entry : n))
    if (!entry.id) return
    await supabase.from('theater_names').update({
      name: entry.name,
      year_from: entry.year_from ? Number(entry.year_from) : null,
      year_to: entry.year_to ? Number(entry.year_to) : null,
    }).eq('id', entry.id)
  }

  async function removeName(index: number) {
    const entry = names[index]
    if (entry.id) {
      await supabase.from('theater_names').delete().eq('id', entry.id)
    }
    setNames((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {names.map((n, i) => (
        <div key={n.id ?? i} className="border border-gray-200 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-500">Name {i + 1}</p>
            <button type="button" onClick={() => removeName(i)} className="text-xs text-red-500 hover:text-red-700 cursor-pointer">
              Remove
            </button>
          </div>
          <input
            value={n.name}
            onChange={(e) => updateName(i, 'name', e.target.value)}
            placeholder="Theater name"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex gap-2">
            <input
              value={n.year_from}
              onChange={(e) => updateName(i, 'year_from', e.target.value)}
              placeholder="From (year)"
              type="number"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <input
              value={n.year_to}
              onChange={(e) => updateName(i, 'year_to', e.target.value)}
              placeholder="To (year)"
              type="number"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>
      ))}
      <button type="button" onClick={addName} className="text-xs text-amber-600 hover:text-amber-700 cursor-pointer">
        + Add previous name
      </button>
    </div>
  )
}