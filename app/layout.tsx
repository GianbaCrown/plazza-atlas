import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'
import { GoogleAnalytics } from '@next/third-parties/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-serif',
})

export const metadata: Metadata = {
  title: 'Plazza Atlas',
  description: 'The world map of movie wonder.',
  openGraph: {
    title: 'Plazza Atlas',
    description: 'The world map of movie wonder.',
    siteName: 'Plazza Atlas',
    images: [
      {
        url: 'https://plazza-atlas.cc/og-image-2.jpg',
         width: 2400,
        height: 1260,
        alt: 'Plazza Atlas, the world map of movie wonder',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plazza Atlas',
    description: 'The world map of movie wonder.',
    images: ['https://plazza-atlas.cc/og-image-2.jpg'],
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable}`}>
        {children}
        {modal}
               {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  )
}
