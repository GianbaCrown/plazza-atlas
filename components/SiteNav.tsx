import Link from 'next/link'
import Logo from './Logo'

export default function SiteNav() {
  return (
    <div className="border-b px-6 py-3 flex items-center gap-4 text-sm bg-white">
      <Logo variant="dark" />
      <div className="flex-1" />
      <Link href="/list" className="text-gray-600 hover:text-gray-900">List view</Link>
      <Link href="/about" className="text-gray-600 hover:text-gray-900">About</Link>
      <Link href="/submit" className="text-gray-600 hover:text-gray-900">Submit</Link>
    </div>
  )
}