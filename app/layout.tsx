import type { Metadata } from 'next'
import './globals.css'
import '@solana/wallet-adapter-react-ui/styles.css'
import Providers from './components/Providers'

export const metadata: Metadata = {
  title: 'Double or Nothing',
  description: 'Double or Nothing - 50/50 Solana coin flip game. Win 2x your bet or lose it all!',
  keywords: ['solana', 'coin flip', 'double or nothing', 'crypto game', 'gambling'],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      { rel: 'android-chrome-192x192', url: '/android-chrome-192x192.png' },
      { rel: 'android-chrome-512x512', url: '/android-chrome-512x512.png' },
    ],
  },
  openGraph: {
    title: 'Double or Nothing',
    description: '50/50 Solana coin flip game. Win 2x your bet or lose it all!',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Double or Nothing',
    description: '50/50 Solana coin flip game. Win 2x your bet or lose it all!',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
