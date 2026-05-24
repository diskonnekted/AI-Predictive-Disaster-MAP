import type { Location } from '@/types';

/**
 * Regional defaults for the app.
 *
 * This project originally shipped with India-centric defaults. For local use in
 * Banjarnegara (Central Java, Indonesia), we centralize the map defaults here.
 */
export const DEFAULT_REGION = {
  name: 'Banjarnegara, Central Java, Indonesia',
  // Commonly-cited town center coordinates for Banjarnegara.
  center: { lat: -7.396209024846692, lng: 109.69512107137585 } satisfies Location,
  // Bounding box around Banjarnegara regency + a small buffer.
  // Used for offline tile downloads and to scope "local mode" data fetching.
  bounds: {
    north: -7.20,
    south: -7.60,
    west: 109.45,
    east: 109.95,
  },
  // Map defaults tuned for a regency-level view.
  zoom: {
    overview: 11,
    emergency: 12,
    reset: 11,
  },
  // Keep facilities local by default (meters).
  facilitiesRadiusM: 15000,
  // Disaster feed filters around Banjarnegara.
  disasters: {
    // Radius (km) around center.
    radiusKm: 120,
    // Include smaller quakes; 2.5+ is often too sparse locally.
    minMagnitude: 1.5,
    // Look back further to ensure data appears.
    daysBack: 180,
  },
  // Heatmap sampling: fewer points = fewer API calls.
  heatmap: {
    points: {
      // Roughly NxN sampling across bounds.
      grid: 6,
    },
  },
  // Offline map download zoom levels (kept modest to save storage).
  offlineTiles: {
    zoomLevels: [10, 11, 12, 13],
  },
  // Google tile region parameter. Using ID makes labels/region bias Indonesia.
  googleTilesRegion: 'ID',
  /**
   * Kode wilayah administratif tingkat IV (desa/kelurahan) untuk API prakiraan BMKG.
   * Contoh: Desa Sambong, Kec. Punggelan, Kab. Banjarnegara (Jawa Tengah).
   * @see https://data.bmkg.go.id/prakiraan-cuaca/
   */
  bmkgAdm4: '33.04.12.2001',
} as const;

