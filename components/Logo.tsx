import Link from 'next/link'

export default function Logo({ variant = 'dark' }: { variant?: 'light' | 'dark' }) {
  const color = variant === 'light' ? '#ffffff' : '#1a1a2e'
  return (

  /* <Link href="/" className="inline-flex items-center gap-2 select-none">
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="13" stroke={color} strokeWidth="1.5" />
       /* <text x="14" y="18" textAnchor="middle" fontSize="11" fontFamily="serif" fill={color}>PA</text>
      </svg>
      <span style={{ color }} className="font-serif text-base tracking-tight hidden sm:inline">
        Plazza Atlas
      </span>
    </Link> */

    <Link href="/" className="inline-flex items-center select-none">
      <img
        src="/logo-plazza-atlas.svg"
        alt="Plazza Atlas"
        
        style={{
          height: '50px',
          width: 'auto',
          opacity: '0.9',
          filter: variant === 'light' ? 'brightness(0) invert(1)' : 'none',
        }}
      />
    </Link>
  )
}