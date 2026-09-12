'use client'
import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

export default function ConditionalBottomNav() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin') || pathname === '/gate') return null
  return <BottomNav />
}