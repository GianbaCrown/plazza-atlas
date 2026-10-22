import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    formats: ['image/webp'],
    minimumCacheTTL: 2678400, // 31 days
    qualities: [75],
    deviceSizes: [640, 828],
    imageSizes: [320],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ytmfscpofiphsidseezh.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig

