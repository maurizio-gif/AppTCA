import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-body',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['800'],
  variable: '--font-display',
})

export const metadata = {
  title: 'CRM TCA',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-512.png',
    apple: '/apple-touch-icon.png',
  },
  // Permette "Aggiungi a Home" su iOS: si apre a schermo intero, senza
  // barra degli indirizzi di Safari, come una vera app installata.
  appleWebApp: {
    capable: true,
    title: 'CRM TCA',
    // 'default': barra di stato opaca chiara, coerente con la nostra
    // topbar bianca. 'black-translucent' renderebbe la barra trasparente
    // e richiederebbe di gestire il safe-area-inset per non finire sotto
    // la notch/isola dinamica: non necessario per questa app.
    statusBarStyle: 'default',
  },
}

export const viewport = {
  themeColor: '#7f2520',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>{children}</body>
    </html>
  )
}
