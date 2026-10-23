'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { makeThumbBlob } from '@/lib/makeThumb'

export default function GenerateThumbnails() {
  const supabase = createClient()
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [failed, setFailed] = useState<string[]>([])
  const [finished, setFinished] = useState(false)

  const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/theater-images/`

  async function run() {
    setRunning(true); setFinished(false); setDone(0); setFailed([])

    const { data: rows, error } = await supabase
      .from('images')
      .select('id, theater_id, storage_path')
      .is('thumb_path', null)

    if (error) { alert(error.message); setRunning(false); return }
    const list = rows ?? []
    setTotal(list.length)

    const errors: string[] = []
    for (const row of list) {
      try {
        const res = await fetch(baseUrl + row.storage_path)
        if (!res.ok) throw new Error('download failed')
        const blob = await makeThumbBlob(await res.blob())
        if (!blob) throw new Error('resize failed')

        const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
        const thumbPath = `${row.theater_id}/thumbs/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('theater-images')
          .upload(thumbPath, blob, { cacheControl: '31536000', upsert: false })
        if (upErr) throw upErr

        const { error: dbErr } = await supabase.from('images').update({ thumb_path: thumbPath }).eq('id', row.id)
        if (dbErr) throw dbErr
      } catch {
        errors.push(row.storage_path)
      }
      setDone((d) => d + 1)
    }

    setFailed(errors)
    setRunning(false)
    setFinished(true)
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold tracking-tight mb-2">Generate missing thumbnails</h1>
      <p className="text-sm text-gray-500 mb-6">
        Creates a 640px WebP thumbnail for every image that doesn&apos;t have one. Safe to run more than once: images that already have a thumbnail are skipped. Keep this tab open until it finishes.
      </p>

      <button
        onClick={run}
        disabled={running}
        className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer"
      >
        {running ? 'Working...' : 'Generate thumbnails'}
      </button>

      {(running || finished) && (
        <div className="mt-6">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: total ? `${(done / total) * 100}%` : '100%' }}
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {total === 0 && finished ? 'Nothing to do: every image already has a thumbnail.' : `${done} / ${total}`}
          </p>
        </div>
      )}

      {finished && failed.length > 0 && (
        <div className="mt-4 text-sm text-red-600">
          <p className="font-medium">{failed.length} failed (run again to retry):</p>
          <ul className="mt-1 text-xs list-disc pl-5 break-all">
            {failed.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      )}
    </div>
  )
}