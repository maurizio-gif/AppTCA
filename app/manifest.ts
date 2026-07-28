import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'CRM TCA',
    short_name: 'CRM TCA',
    description: 'Gestionale segreteria TC Ambrosiano',
    start_url: '/',
    display: 'standalone',
    background_color: '#f5f3f0',
    theme_color: '#7f2520',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
