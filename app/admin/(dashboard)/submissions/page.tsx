import { createClient } from '@/lib/supabase/server'
import { approveSubmission, rejectSubmission } from './actions'

export default async function SubmissionsPage() {
  const supabase = await createClient()
  const { data: submissions } = await supabase.from('submissions').select('*').order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Submissions</h1>
      <div className="space-y-3">
        {submissions?.map((s) => (
          <div key={s.id} className="border rounded p-4">
            <p className="font-medium">{s.name} — {s.email}</p>
            <p className="text-sm text-gray-600 mt-1">{s.message}</p>
            <p className="text-xs text-gray-400 mt-1">Status: {s.status}</p>
            {s.status === 'pending' && (
              <div className="flex gap-2 mt-3">
                <form action={approveSubmission.bind(null, s.id)}>
                  <button className="text-sm bg-green-600 text-white px-3 py-1 rounded">Approve</button>
                </form>
                <form action={rejectSubmission.bind(null, s.id)}>
                  <button className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded">Reject</button>
                </form>
              </div>
            )}
          </div>
        ))}
        {submissions?.length === 0 && <p className="text-gray-500">No submissions yet.</p>}
      </div>
    </div>
  )
}