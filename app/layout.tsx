import type { Metadata } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const fraunces = Fraunces({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-serif' })

export const metadata: Metadata = {
  title: 'Plazza Atlas',
  description: 'An atlas of movie theaters that no longer exist.',
}

export default function RootLayout({
  children, modal,
}: { children: React.ReactNode; modal: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fraunces.variable}`}>
        {children}
        {modal}
      </body>
    </html>
  )
}