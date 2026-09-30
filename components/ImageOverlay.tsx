'use client'
import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  src: string
  alt: string
  caption?: string
  credit?: string
  onClose: () => void
}

export default function ImageOverlay({ src, alt, caption, credit, onClose }: Props) {
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [scale, setScale] = useState(1)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const lastTouchDist = useRef<number | null>(null)
  const lastScale = useRef(1)
  const containerRef = useRef<HTMLDivElement>(null)
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches

  useEffect(() => {
    setMounted(true)
    requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 220)
  }

  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastTouchDist.current = Math.sqrt(dx * dx + dy * dy)
      lastScale.current = scale
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
      const newScale = Math.max(1, Math.min(5, lastScale.current * (dist / lastTouchDist.current)))
      setScale(newScale)
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) {
      lastTouchDist.current = null
      if (scale < 1.15) setScale(1)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 220ms ease',
        background: 'rgba(9, 9, 11, 0.95)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={scale <= 1 ? handleClose : undefined}
    >
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer z-10"
      >
        <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="1" y1="1" x2="13" y2="13"/>
          <line x1="13" y1="1" x2="1" y2="13"/>
        </svg>
      </button>

      <div
        ref={containerRef}
        style={{
          width: isMobile ? '100vw' : '80vw',
          maxWidth: isMobile ? '100vw' : '80vw',
          transform: visible ? 'translateY(0)' : 'translateY(16px)',
          transition: lastTouchDist.current ? 'none' : 'transform 220ms cubic-bezier(0.32, 0, 0.18, 1)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          touchAction: 'none',
        }}
       onClick={handleClose}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: isMobile ? '85vh' : '80vh',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
            borderRadius: isMobile ? '0' : '0px',
            transform: `scale(${scale})`,
            transformOrigin: `${origin.x}% ${origin.y}%`,
            transition: lastTouchDist.current ? 'none' : 'transform 200ms ease',
            cursor: isMobile
              ? (scale > 1 ? 'zoom-out' : 'default')
              : 'zoom-in',
            userSelect: 'none',
          }}
        />

        {(caption || credit) && (
          <p className="mt-3 text-xs text-center leading-relaxed px-4" style={{ maxWidth: '80vw' }}>
            {caption && <span className="text-zinc-400">{caption}</span>}
            {caption && credit && <span className="text-zinc-400"> · </span>}
            {credit && <span className="text-zinc-400">{credit}</span>}
          </p>
        )}
      </div>

      <p className="absolute bottom-4 text-[10px] text-zinc-500 pointer-events-none">
        {isMobile ? 'Pinch to zoom · Tap to close' : 'Click anywhere to close'}
      </p>
    </div>,
    document.body
  )
}