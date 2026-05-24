# Catatan pengembangan (lokal Banjarnegara + BMKG)

Dokumen ini mencatat keputusan teknis dan perubahan yang diterapkan untuk menjalankan aplikasi dengan fokus **Kabupaten Banjarnegara, Jawa Tengah, Indonesia**, serta integrasi data terbuka **BMKG**.

## Wilayah default

- Pusat peta dan parameter default: `src/config/region.ts` (`DEFAULT_REGION`).
- Koordinat pusat perkiraan kota Banjarnegara, bounding box untuk heatmap/offline tiles, zoom, radius fasilitas darurat, filter bencana (radius km, magnitudo minimum, lookback hari), sampling grid heatmap, dan **`bmkgAdm4`** (kode wilayah tingkat IV untuk API prakiraan BMKG).

## Data bencana (tidak lagi India-only)

- `fetchDisasterData` di `src/utils/api.ts` memfilter event (USGS, GDACS) berdasarkan **jarak dari pusat Banjarnegara**, bukan bbox India.
- Parameter diatur lewat `DEFAULT_REGION.disasters` di `src/config/region.ts`.

## Performa & cakupan lokal

- **Emergency services**: radius Overpass mengikuti `facilitiesRadiusM`.
- **Heatmap**: titik sampling diganti dari daftar kota India menjadi grid di dalam bounds Banjarnegara.
- **Offline maps**: preset di `src/components/OfflineMapManager.tsx` mengutamakan Banjarnegara (+ opsi Jawa Tengah rendah detail).

## Integrasi BMKG

Sesuai dokumentasi publik:

- [Data Prakiraan Cuaca Terbuka BMKG](https://data.bmkg.go.id/prakiraan-cuaca/)
- [Data Peringatan Dini Cuaca (CAP / nowcast)](https://data.bmkg.go.id/peringatan-dini-cuaca/)
- Contoh pengolahan JSON: [infoBMKG/data-cuaca](https://github.com/infoBMKG/data-cuaca)

### Prakiraan cuaca (JSON)

- Endpoint: `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4={kode_wilayah_IV}`
- Kode default aplikasi: `DEFAULT_REGION.bmkgAdm4` (contoh: Desa Sambong, Kec. Punggelan, Kab. Banjarnegara).
- Logika pengayaan: `src/utils/bmkg.ts` (`enrichWeatherWithBmkg`), dipanggil dari `fetchWeatherData` di `src/utils/api.ts`.

### Peringatan dini (RSS nowcast)

- Sumber RSS: `https://www.bmkg.go.id/alerts/nowcast/id`
- Di UI, item difilter ke teks yang relevan dengan **Banjarnegara / Jawa Tengah** (agar tetap lokal).

### Proxy backend (hindari CORS)

- `server.js` menambahkan:
  - `GET /api/bmkg/nowcast` → proxy RSS BMKG
  - `GET /api/bmkg/prakiraan?adm4=...` → proxy JSON prakiraan
- Frontend di development memakai `http://localhost:3001` sebagai proxy default (atau `VITE_BMKG_PROXY_URL` di `.env`).
- **Atribusi BMKG wajib ditampilkan** — sudah ada blok teks di `WeatherWidget` ketika `weather.bmkgMeta` terisi.

## Cuaca saat aplikasi dibuka

- `Dashboard` memuat cuaca untuk lokasi default Banjarnegara pada mount (agar data BMKG/Open-Meteo terlihat sebelum GPS tersedia).

## Variabel lingkungan

- Lihat `.env.example` untuk `VITE_BMKG_PROXY_URL` (opsional; proxy BMKG + Groq tetap di port backend default).

## Menjalankan lokal

- `npm run dev` menjalankan Vite dan `server.js` (Groq + proxy BMKG). Pastikan backend (mis. port 3001) aktif jika RSS/JSON BMKG diarahkan lewat proxy.

---

*Terakhir diperbarui sesuai penyesuaian lokal Banjarnegara dan integrasi BMKG.*
