'use client'
import { usePathname } from 'next/navigation'
import BottomNav from './BottomNav'

type Props = {
  onRandom?: () => void
}

export default function ConditionalBottomNav({ onRandom }: Props) {
  const pathname = usePathname()
  if (pathname.startsWith('/admin') || pathname === '/gate') return null
  return <BottomNav onRandom={onRandom} />
}