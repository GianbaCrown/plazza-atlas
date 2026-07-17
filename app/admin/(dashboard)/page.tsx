import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Admin dashboard</h1>
      <div className="grid gap-3">
        <Link href="/admin/theaters" className="border rounded p-4 hover:bg-gray-50">
          <p className="font-medium">Manage theaters</p>
          <p className="text-sm text-gray-500">Add, edit, publish theaters</p>
        </Link>
        <Link href="/admin/submissions" className="border rounded p-4 hover:bg-gray-50">
          <p className="font-medium">Submissions</p>
          <p className="text-sm text-gray-500">Review submitted theaters</p>
        </Link>
      </div>
    </div>
  )
}