import { MetadataRoute } from 'next'

export const dynamic = "force-static";
 
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KLS Luxe: Private Chauffeur',
    short_name: 'KLS Luxe',
    description: 'Premier Executive Black Car & Luxury Chauffeur Service.',
    start_url: '/',
    display: 'standalone',
    background_color: '#060608',
    theme_color: '#060608',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      }
    ],
  }
}
