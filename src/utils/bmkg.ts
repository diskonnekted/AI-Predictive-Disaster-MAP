import type { HourlyForecast, WeatherAlert, WeatherData, WeatherForecast } from '@/types';
import { DEFAULT_REGION } from '@/config/region';

const BMKG_PRAKIRAAN_API = 'https://api.bmkg.go.id/publik/prakiraan-cuaca';
const BMKG_NOWCAST_RSS = 'https://www.bmkg.go.id/alerts/nowcast/id';

export const BANJARNEGARA_KECAMATAN = [
  { name: 'Susukan', lat: -7.458, lng: 109.584, adm4: '33.04.01.2012' },
  { name: 'Purwareja Klampok', lat: -7.464, lng: 109.436, adm4: '33.04.02.2005' },
  { name: 'Mandiraja', lat: -7.472, lng: 109.512, adm4: '33.04.03.2014' },
  { name: 'Purwanegara', lat: -7.447, lng: 109.601, adm4: '33.04.04.2010' },
  { name: 'Bawang', lat: -7.402, lng: 109.643, adm4: '33.04.05.2002' },
  { name: 'Banjarnegara', lat: -7.399, lng: 109.697, adm4: '33.04.06.1012' },
  { name: 'Sigaluh', lat: -7.387, lng: 109.782, adm4: '33.04.07.2013' },
  { name: 'Madukara', lat: -7.368, lng: 109.721, adm4: '33.04.08.2011' },
  { name: 'Banjarmangu', lat: -7.342, lng: 109.702, adm4: '33.04.09.2003' },
  { name: 'Wanadadi', lat: -7.351, lng: 109.620, adm4: '33.04.10.2004' },
  { name: 'Rakit', lat: -7.381, lng: 109.539, adm4: '33.04.11.2004' },
  { name: 'Punggelan', lat: -7.301, lng: 109.612, adm4: '33.04.12.2001' },
  { name: 'Karangkobar', lat: -7.271, lng: 109.741, adm4: '33.04.13.2001' },
  { name: 'Pagentan', lat: -7.284, lng: 109.771, adm4: '33.04.14.2012' },
  { name: 'Pejawaran', lat: -7.256, lng: 109.815, adm4: '33.04.15.2009' },
  { name: 'Batur', lat: -7.206, lng: 109.827, adm4: '33.04.16.2002' },
  { name: 'Wanayasa', lat: -7.231, lng: 109.745, adm4: '33.04.17.2017' },
  { name: 'Kalibening', lat: -7.221, lng: 109.637, adm4: '33.04.18.2004' },
  { name: 'Pandanarum', lat: -7.236, lng: 109.598, adm4: '33.04.19.2001' },
  { name: 'Pagedongan', lat: -7.442, lng: 109.698, adm4: '33.04.20.2001' },
];

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dy = lat1 - lat2;
  const dx = lng1 - lng2;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getNearestBmkgAdm4(lat: number, lng: number): string | null {
  // 1. Explicit check for default region center coordinates
  if (Math.abs(lat - DEFAULT_REGION.center.lat) < 0.001 && Math.abs(lng - DEFAULT_REGION.center.lng) < 0.001) {
    return '33.04.06.1012'; // Return Kecamatan Banjarnegara (Krandegan)
  }

  // 2. Explicit check for the Kabupaten Banjarnegara boundary centroid (-7.3558733, 109.6600728)
  if (Math.abs(lat - (-7.3558733)) < 0.01 && Math.abs(lng - 109.6600728) < 0.01) {
    return '33.04.06.1012'; // Return Kecamatan Banjarnegara (Krandegan)
  }

  let nearestKec = BANJARNEGARA_KECAMATAN[0];
  let minDistance = Infinity;

  for (const kec of BANJARNEGARA_KECAMATAN) {
    const dist = calculateDistance(lat, lng, kec.lat, kec.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestKec = kec;
    }
  }

  // If closest center is more than 0.35 degrees away (~40km), it is outside Banjarnegara.
  if (minDistance > 0.35) {
    return null;
  }

  return nearestKec.adm4;
}



function bmkgProxyBase(): string {
  return import.meta.env.VITE_BMKG_PROXY_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
}

/** Map deskripsi BMKG ke ikon mendekati set Open-Meteo/OpenWeather style */
function iconFromBmkgDescription(desc?: string): string {
  const d = (desc || '').toLowerCase();
  if (d.includes('hujan')) return '10d';
  if (d.includes('petir') || d.includes('badai')) return '11d';
  if (d.includes('kabut') || d.includes('berkabut')) return '50d';
  if (d.includes('berawan')) return '04d';
  if (d.includes('cerah berawan') || d.includes('sebagian')) return '02d';
  if (d.includes('cerah')) return '01d';
  return '02d';
}

function severityFromBmkgTitleDescription(title: string, description: string): WeatherAlert['severity'] {
  const t = `${title} ${description}`.toLowerCase();
  if (t.includes('petir') || t.includes('hujan lebat') || t.includes('angin kencang') || t.includes('banjir')) {
    return 'severe';
  }
  if (t.includes('hujan') || t.includes('was') || t.includes('waspada')) {
    return 'moderate';
  }
  return 'minor';
}

export async function fetchBmkgPrakiraanJson(adm4: string): Promise<any | null> {
  const proxy = bmkgProxyBase();
  const urls: string[] = [];
  if (proxy) {
    urls.push(`${proxy.replace(/\/$/, '')}/api/bmkg/prakiraan?adm4=${encodeURIComponent(adm4)}`);
  }
  urls.push(`${BMKG_PRAKIRAAN_API}?adm4=${encodeURIComponent(adm4)}`);

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function fetchBmkgNowcastRssText(): Promise<string | null> {
  const proxy = bmkgProxyBase();
  const urls: string[] = [];
  if (proxy) {
    urls.push(`${proxy.replace(/\/$/, '')}/api/bmkg/nowcast`);
  }
  urls.push(BMKG_NOWCAST_RSS);

  for (const url of urls) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!res.ok) continue;
      return await res.text();
    } catch {
      /* try next */
    }
  }
  return null;
}

function parseNowcastRss(xml: string): Array<{
  title: string;
  link: string;
  description: string;
  pubDate: string;
  guid: string;
}> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const items = Array.from(doc.querySelectorAll('rss channel item, channel item'));
  return items.map((item) => ({
    title: item.querySelector('title')?.textContent?.trim() || '',
    link: item.querySelector('link')?.textContent?.trim() || '',
    description: item.querySelector('description')?.textContent?.trim() || '',
    pubDate: item.querySelector('pubDate')?.textContent?.trim() || '',
    guid: item.querySelector('guid')?.textContent?.trim() || item.querySelector('link')?.textContent?.trim() || '',
  }));
}

/** Filter untuk fokus Banjarnegara / Jawa Tengah (teks RSS bahasa Indonesia) */
function isRelevantBanjarnegaraOrJateng(text: string): boolean {
  const t = text.toLowerCase();
  return (
    t.includes('banjarnegara') ||
    t.includes('jawa tengah') ||
    t.includes('jateng') ||
    t.includes('kab. banjarnegara') ||
    t.includes('kabupaten banjarnegara')
  );
}

export function bmkgNowcastToAlerts(xml: string): WeatherAlert[] {
  const rows = parseNowcastRss(xml);
  const out: WeatherAlert[] = [];
  for (const row of rows) {
    const blob = `${row.title}\n${row.description}`;
    if (!isRelevantBanjarnegaraOrJateng(blob)) continue;
    const id = `bmkg-${row.guid || row.link || row.title}`.slice(0, 200);
    out.push({
      id,
      title: row.title,
      description: row.description,
      severity: severityFromBmkgTitleDescription(row.title, row.description),
      start: row.pubDate || new Date().toISOString(),
      end: row.pubDate || new Date().toISOString(),
    });
  }
  return out;
}

function buildHourlyFromBmkgDaySlots(slots: any[]): HourlyForecast[] {
  if (!Array.isArray(slots)) return [];
  return slots.slice(0, 12).map((slot) => {
    const local = slot.local_datetime as string | undefined;
    const tsec = local
      ? Math.floor(new Date(local.replace(' ', 'T')).getTime() / 1000)
      : Math.floor(Date.now() / 1000);
    return {
      time: tsec,
      temperature: Math.round(Number(slot.t) || 0),
      feelsLike: Math.round(Number(slot.t) || 0),
      precipitation: Math.round(Number(slot.tp) || 0),
      rain: Math.round(Number(slot.tp) || 0),
      humidity: Math.round(Number(slot.hu) || 0),
      windSpeed: Math.round(Number(slot.ws) || 0),
      condition: slot.weather_desc || '—',
      description: slot.weather_desc_en || slot.weather_desc || '',
      icon: iconFromBmkgDescription(slot.weather_desc),
    };
  });
}

function buildDailyForecastFromBmkg(cuacaDays: any[][]): WeatherForecast[] {
  if (!Array.isArray(cuacaDays)) return [];
  return cuacaDays.slice(0, 3).map((slots, idx) => {
    const daySlots = Array.isArray(slots) ? slots : [];
    const temps = daySlots.map((s) => Number(s.t)).filter((n) => !Number.isNaN(n));
    const minT = temps.length ? Math.min(...temps) : 0;
    const maxT = temps.length ? Math.max(...temps) : 0;
    const mid = daySlots[Math.floor(daySlots.length / 2)] || daySlots[0];
    const dateStr = (mid?.local_datetime as string | undefined)?.split(' ')[0] || `day-${idx + 1}`;
    return {
      date: dateStr,
      temperature: { min: Math.round(minT), max: Math.round(maxT) },
      rainfall: 0,
      condition: mid?.weather_desc || '—',
      icon: iconFromBmkgDescription(mid?.weather_desc),
    };
  });
}

/**
 * Gabungkan data BMKG (prakiraan + peringatan dini) ke respons Open-Meteo.
 * Atribusi BMKG wajib ditampilkan di UI (lihat data.bmkg.go.id).
 */
export async function enrichWeatherWithBmkg(base: WeatherData): Promise<WeatherData> {
  const adm4 = getNearestBmkgAdm4(base.location.lat, base.location.lng);
  if (!adm4) {
    return base; // Skip BMKG enrichment if outside Banjarnegara
  }

  const [json, rssXml] = await Promise.all([
    fetchBmkgPrakiraanJson(adm4),
    fetchBmkgNowcastRssText(),
  ]);


  const lokasi = json?.lokasi || json?.data?.[0]?.lokasi;
  const cuacaRoot = json?.data?.[0]?.cuaca;
  const day0 = Array.isArray(cuacaRoot) && Array.isArray(cuacaRoot[0]) ? cuacaRoot[0] : [];

  let merged: WeatherData = {
    ...base,
    bmkgMeta: {
      adm4,
      desa: lokasi?.desa,
      kecamatan: lokasi?.kecamatan,
      kotkab: lokasi?.kotkab,
      provinsi: lokasi?.provinsi,
      prakiraanUrl: BMKG_PRAKIRAAN_API,
      nowcastRssUrl: BMKG_NOWCAST_RSS,
    },
  };

  if (day0.length > 0) {
    const cur = day0[0];
    merged = {
      ...merged,
      location: {
        lat: typeof lokasi?.lat === 'number' ? lokasi.lat : base.location.lat,
        lng: typeof lokasi?.lon === 'number' ? lokasi.lon : base.location.lng,
        name: [lokasi?.desa, lokasi?.kecamatan, lokasi?.kotkab, lokasi?.provinsi]
          .filter(Boolean)
          .join(', '),
      },
      temperature: Math.round(Number(cur.t) ?? base.temperature),
      humidity: Math.round(Number(cur.hu) ?? base.humidity),
      windSpeed: Math.round(Number(cur.ws) ?? base.windSpeed),
      windDirection: cur.wd_deg != null && cur.wd_deg !== '' ? Number(cur.wd_deg) : base.windDirection,
      rainfall: Number(cur.tp) || base.rainfall,
      condition: cur.weather_desc || base.condition,
      icon: iconFromBmkgDescription(cur.weather_desc),
      hourlyForecast: buildHourlyFromBmkgDaySlots(day0),
      forecast: buildDailyForecastFromBmkg(cuacaRoot as any[][]),
    };
  }

  if (rssXml) {
    const bmkgAlerts = bmkgNowcastToAlerts(rssXml);
    merged = {
      ...merged,
      alerts: [...bmkgAlerts, ...(base.alerts || [])],
    };
  }

  return merged;
}
