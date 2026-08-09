/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Le pagine dashboard leggono dati live da Supabase: niente cache
    // lato client tra una navigazione e l'altra, altrimenti passando da
    // una sezione all'altra si vedono dati vecchi finche' non si ricarica.
    staleTimes: {
      dynamic: 0,
    },
    // Default 1 MB: troppo poco per l'allegato delle notifiche (fino a 5 MB
    // di file + i campi del form nello stesso multipart).
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
}

export default nextConfig
