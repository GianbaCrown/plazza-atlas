'use client'
import { useEffect, useCallback, useRef, useState } from 'react'

type Props = {
  src: string
  alt: string
  onClose: () => void
}

export default function ImageLightbox({ src, alt, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const [scale, setScale] = useState(1)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const lastTouchDist = useRef<number | null>(null)
  const lastScale = useRef(1)

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKey)

    const scrollables = Array.from(document.querySelectorAll<HTMLElement>('*')).filter((el) => {
      const s = window.getComputedStyle(el)
      return s.overflowY === 'auto' || s.overflowY === 'scroll'
    })
    const snapshots = scrollables.map((el) => ({
      el, overflowY: el.style.overflowY, touchAction: el.style.touchAction,
    }))
    scrollables.forEach((el) => { el.style.overflowY = 'hidden'; el.style.touchAction = 'none' })
    const prevOverflow = document.body.style.overflow
    const prevTouch = document.body.style.touchAction
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = prevOverflow
      document.body.style.touchAction = prevTouch
      snapshots.forEach(({ el, overflowY, touchAction }) => {
        el.style.overflowY = overflowY
        el.style.touchAction = touchAction
      })
    }
  }, [handleKey])

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy)
      lastScale.current = scale

      // Set transform origin to midpoint of two fingers
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        setOrigin({
          x: ((midX - rect.left) / rect.width) * 100,
          y: ((midY - rect.top) / rect.height) * 100,
        })
      }
    }
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      e.stopPropagation()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const newScale = Math.max(1, Math.min(4, lastScale.current * (dist / lastTouchDist.current)))
      setScale(newScale)
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) {
      lastTouchDist.current = null
      // Snap back to 1 if barely zoomed
      if (scale < 1.1) setScale(1)
    }
  }

  function handleDoubleTap() {
    setScale((s) => s > 1 ? 1 : 2.5)
    setOrigin({ x: 50, y: 50 })
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      style={{ touchAction: 'none' }}
      onTouchMove={(e) => { if (scale <= 1) e.preventDefault() }}
      onClick={scale <= 1 ? onClose : undefined}
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

      <p className="absolute bottom-4 left-0 right-0 text-center text-white/30 text-xs pointer-events-none">
        {scale > 1 ? 'Pinch to zoom · Tap to close' : 'Pinch to zoom · Tap anywhere to close'}
      </p>

      <div
        ref={containerRef}
        className="relative max-w-[95vw] max-h-[92vh] overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          onDoubleClick={handleDoubleTap}
          className="max-w-[95vw] max-h-[92vh] object-contain rounded-lg shadow-2xl select-none"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: `${origin.x}% ${origin.y}%`,
            transition: lastTouchDist.current ? 'none' : 'transform 200ms ease',
            cursor: scale > 1 ? 'zoom-out' : 'zoom-in',
            touchAction: 'none',
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}