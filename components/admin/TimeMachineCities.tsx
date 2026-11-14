'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Row = { city: string; country: string; theaters: number; photos: number; vertical: number }
type Pending = { id: string; storage_path: string }

const key = (city: string, country: string) => `${city.trim().toLowerCase()}|${country.trim().toLowerCase()}`
const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/`

function measure(url: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = reject
    img.src = url
  })
}

export default function TimeMachineCities() {
  const supabase = createClient()
  const [rows, setRows] = useState<Row[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [unmeasured, setUnmeasured] = useState<Pending[]>([])
  const [scan, setScan] = useState<{ done: number; total: number } | null>(null)
  const scanning = useRef(false)

  async function load(autoScan: boolean) {
    const [theatersRes, imagesRes, citiesRes] = await Promise.all([
      supabase.from('theaters').select('city, country').eq('status', 'published'),
      supabase
        .from('images')
        .select('id, storage_path, width, height, theaters!inner ( city, country, status )')
        .not('year', 'is', null)
        .eq('theaters.status', 'published'),
      supabase.from('time_machine_cities').select('city, country'),
    ])

    const map = new Map<string, Row>()
    for (const t of ((theatersRes.data as any[] | null) ?? [])) {
      if (!t.city) continue
      const k = key(t.city, t.country ?? '')
      const row = map.get(k) ?? { city: t.city, country: t.country ?? '', theaters: 0, photos: 0, vertical: 0 }
      row.theaters++
      map.set(k, row)
    }

    const missing: Pending[] = []
    for (const im of ((imagesRes.data as any[] | null) ?? [])) {
      const t = im.theaters
      if (!t?.city) continue
      const row = map.get(key(t.city, t.country ?? ''))
      if (!row) continue
      row.photos++
      if (im.width && im.height) {
        if (im.height > im.width) row.vertical++
      } else {
        missing.push({ id: im.id, storage_path: im.storage_path })
      }
    }

    setRows([...map.values()].sort((a, b) => a.city.localeCompare(b.city)))
    setSelected(new Set(((citiesRes.data as any[] | null) ?? []).map((c: any) => key(c.city, c.country ?? ''))))
    setUnmeasured(missing)
    setLoading(false)

    if (autoScan && missing.length) runScan(missing)
  }

  // Reads the real size of each photo and saves it, three at a time
  async function runScan(list: Pending[]) {
    if (scanning.current || !list.length) return
    scanning.current = true
    setScan({ done: 0, total: list.length })

    let next = 0
    let done = 0
    const worker = async () => {
      while (next < list.length) {
        const item = list[next++]
        try {
          const d = await measure(baseUrl + item.storage_path)
          await supabase.from('images').update({ width: d.w, height: d.h }).eq('id', item.id)
        } catch {}
        done++
        setScan({ done, total: list.length })
      }
    }
    await Promise.all([worker(), worker(), worker()])

    scanning.current = false
    setScan(null)
    await load(false)
  }

  useEffect(() => { load(true) }, [])

  async function toggle(row: Row) {
    const k = key(row.city, row.country)
    const wasOn = selected.has(k)

    setSelected((prev) => {
      const next = new Set(prev)
      if (wasOn) next.delete(k)
      else next.add(k)
      return next
    })

    const { error } = wasOn
      ? await supabase.from('time_machine_cities').delete().eq('city', row.city).eq('country', row.country)
      : await supabase.from('time_machine_cities').insert({ city: row.city, country: row.country })

    if (error) { alert(error.message); load(false) }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Time Machine cities</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tick the cities that appear in the Time Machine. A city only shows on the site if it also has at least one photo with a year. Vertical photos only appear on mobile.
      </p>

      {scan && (
        <p className="text-sm text-amber-700 mb-4">
          Reading photo sizes… {scan.done} / {scan.total}
        </p>
      )}
      {!scan && unmeasured.length > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          {unmeasured.length} dated {unmeasured.length === 1 ? 'photo' : 'photos'} could not be measured, so they stay hidden on desktop.{' '}
          <button onClick={() => runScan(unmeasured)} className="text-amber-600 hover:underline cursor-pointer">
            Try again
          </button>
        </p>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const k = key(r.city, r.country)
            return (
              <label
                key={k}
                className="flex items-center justify-between gap-4 border border-gray-200 rounded-xl p-4 bg-white hover:border-amber-300 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(k)}
                    onChange={() => toggle(r)}
                    className="w-4 h-4 accent-amber-600 cursor-pointer"
                  />
                  <span className="font-medium text-gray-900">
                    {r.city}{r.country ? `, ${r.country}` : ''}
                  </span>
                </div>
                <span className="text-xs text-gray-400 text-right">
                  {r.theaters} {r.theaters === 1 ? 'theater' : 'theaters'} · {r.photos} dated {r.photos === 1 ? 'photo' : 'photos'}
                  {r.vertical > 0 && ` · ${r.vertical} vertical (mobile only)`}
                </span>
              </label>
            )
          })}
          {rows.length === 0 && <p className="text-gray-400 text-sm">No published theaters yet.</p>}
        </div>
      )}
    </div>
  )
}