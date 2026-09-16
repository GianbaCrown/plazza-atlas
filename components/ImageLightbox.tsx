'use client'
import { useEffect, useCallback } from 'react'

type Props = {
  src: string
  alt: string
  onClose: () => void
}

export default function ImageLightbox({ src, alt, onClose }: Props) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)

    // Freeze all scrollable elements
    const scrollables = document.querySelectorAll<HTMLElement>('*')
    const snapshots: { el: HTMLElement; overflow: string; touchAction: string }[] = []
    scrollables.forEach((el) => {
      const style = window.getComputedStyle(el)
      const overflow = style.overflowY
      if (overflow === 'auto' || overflow === 'scroll') {
        snapshots.push({ el, overflow: el.style.overflowY, touchAction: el.style.touchAction })
        el.style.overflowY = 'hidden'
        el.style.touchAction = 'none'
      }
    })
    const prevBodyOverflow = document.body.style.overflow
    const prevBodyTouchAction = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevBodyOverflow
      document.body.style.touchAction = prevBodyTouchAction
      snapshots.forEach(({ el, overflow, touchAction }) => {
        el.style.overflowY = overflow
        el.style.touchAction = touchAction
      })
    }
  }, [handleKey])

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      style={{ touchAction: 'none' }}
      onTouchMove={(e) => e.preventDefault()}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
        aria-label="Close"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="1" y1="1" x2="13" y2="13"/>
          <line x1="13" y1="1" x2="1" y2="13"/>
        </svg>
      </button>
      <p className="absolute bottom-4 left-0 right-0 text-center text-white/30 text-xs">
        Tap anywhere to close
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        className="max-w-[95vw] max-h-[92vh] object-contain rounded-lg shadow-2xl"
      />
    </div>
  )
}