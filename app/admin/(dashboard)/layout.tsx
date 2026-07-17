import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="border-b p-4 flex gap-4 items-center">
        <Link href="/admin" className="font-bold">Admin</Link>
        <Link href="/admin/theaters">Theaters</Link>
        <Link href="/admin/submissions">Submissions</Link>
        <div className="flex-1" />
        <LogoutButton />
      </nav>
      <div>{children}</div>
    </div>
  )
}