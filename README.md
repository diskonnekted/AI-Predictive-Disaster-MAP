<p align="center">
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TensorFlow.js-FF6F00?style=for-the-badge&logo=tensorflow&logoColor=white" alt="TensorFlow" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/PWA-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA" />
</p>

<h1 align="center">🛡️ Siaga Banjar</h1>
<h3 align="center">Platform Peringatan Dini Bencana Berbasis AI untuk Kabupaten Banjarnegara</h3>

<p align="center">
  <em>Command center real-time yang digerakkan AI untuk memprediksi, mendeteksi, dan mengelola bencana alam — dibangun untuk menyelamatkan jiwa.</em>
</p>

---

## 📋 Daftar Isi

- [Fitur](#-fitur)
- [Arsitektur](#-arsitektur)
- [Mesin Prediksi AI](#-mesin-prediksi-ai)
- [Tech Stack](#-tech-stack)
- [Cara Memulai](#-cara-memulai)
- [Variabel Lingkungan](#-variabel-lingkungan)
- [Lisensi](#-lisensi)

---

## ✨ Fitur

### 🗺️ Peta Interaktif & Heatmap
- Visualisasi bencana real-time dengan Leaflet Maps
- Tile Google Maps dengan region Indonesia (`gl=ID`)
- Dark mode via CSS filter matrix
- Caching tile offline via IndexedDB

### 🧠 Mesin Prediksi AI
- **Prediksi Banjir** — TF.js Dense NN (akurasi 96.4%)
- **Risiko Gempa** — Seismic NN (akurasi 83.5%)
- **Analisis SOS** — MobileBERT zero-shot NLP
- Semua inferensi berjalan di client-side untuk privasi

### ⚡ Sistem Peringatan Dini
- Agregasi alert multi-sumber (Open-Meteo, USGS, WAQI, BMKG)
- Peringkat risiko real-time composite
- Push notifications untuk alert kritis
- Export laporan PDF satu klik

### 🤖 AI Copilot
- Asisten bencana context-aware dengan Groq LLM
- Injeksi otomatis konteks bencana lokal
- Panduan evacuasi hyper-localized
- Serverless inference via Supabase Edge Functions

### 🏥 Peta Layanan Darurat
- Scan fasilitas 15 km (rumah sakit, polisi, pemadam)
- Overpass QL queries yang dioptimalkan
- Navigasi satu tap ke fasilitas terdekat
- Perhitungan jarak real-time

### 📱 PWA Offline-First
- Full Progressive Web App — installable di semua perangkat
- IndexedDB caching untuk maps, alerts, dan data cuaca
- Offline SOS dengan sensor perangkat
- Transisi online/offline yang mulis

### 🇮🇩 Integrasi BMKG
- Prakiraan cuaca dari BMKG (API publik)
- Peringatan dini cuaca (RSS nowcast)
- Proxy backend untuk menghindari CORS
- Atribusi BMKG wajib di UI

---

## 🏗️ Arsitektur

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        🖥️  PRESENTATION LAYER                          │
│                                                                          │
│   ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐   │
│   │  React Dashboard │  │ Leaflet GIS Maps │  │  AI Copilot Chat    │   │
│   │  (Vite + TS)     │  │ (Google gl=ID)   │  │  (Context-Aware)    │   │
│   └────────┬─────────┘  └────────┬─────────┘  └──────────┬──────────┘   │
└────────────┼─────────────────────┼────────────────────────┼──────────────┘
             │                     │                        │
┌────────────┼─────────────────────┼────────────────────────┼──────────────┐
│            ▼                     ▼                        ▼              │
│   ┌──────────────────────────────────────┐  ┌───────────────────────┐   │
│   │  Client-Side Parallel Fetcher        │  │ Supabase Edge Funcs   │   │
│   │  (Bulk REST Aggregation)             │  │ (Deno + JWT Auth)     │   │
│   └────────┬─────────────────────────────┘  └───────────┬───────────┘   │
│            │        🌐 CONNECTIVITY LAYER               │               │
└────────────┼────────────────────────────────────────────┼───────────────┘
             │                                            │
┌────────────┼────────────────────────────────────────────┼───────────────┐
│            ▼                                            ▼               │
│   ┌──────────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │
│   │ Multi-Factor Risk │  │ Early Warning   │  │ Groq LLM (via Edge) │  │
│   │ Matrix Engine     │  │ Pattern Engine  │  │ Prompt Engineering   │  │
│   └──────────────────┘  └─────────────────┘  └──────────────────────┘  │
│                    ⚙️  CORE ENGINES                                     │
└─────────────────────────────────────────────────────────────────────────┘
             │                                            │
┌────────────┼────────────────────────────────────────────┼───────────────┐
│            ▼                                            ▼               │
│   ┌──────────────────────────┐         ┌────────────────────────────┐  │
│   │  PostgreSQL (Supabase)   │         │  IndexedDB (Offline Cache) │  │
│   │  Vector Extensions       │         │  Tile + Alert Persistence  │  │
│   └──────────────────────────┘         └────────────────────────────┘  │
│                        💾 DATA LAYER                                    │
└─────────────────────────────────────────────────────────────────────────┘
             │
┌────────────┼────────────────────────────────────────────────────────────┐
│            ▼                                                            │
│   ┌────────────┐  ┌─────────┐  ┌──────────────┐  ┌───────────────┐    │
│   │ Open-Meteo  │  │  USGS   │  │  WAQI / AQI  │  │ Overpass API  │    │
│   │ Weather API │  │ Seismic │  │  Air Quality  │  │ OSM Facilities│    │
│   └────────────┘  └─────────┘  └──────────────┘  └───────────────┘    │
│   ┌────────────┐  ┌────────────────────────────────────────────────┐  │
│   │    BMKG    │  │           API SUMBER DATA                       │  │
│   │ Cuaca &    │  │   (Prakiraan Cuaca, Peringatan Dini Sekarang)    │  │
│   │ Peringatan │  │                                                  │  │
│   └────────────┘  └────────────────────────────────────────────────┘  │
│                     🌍 LIVE SENSOR FEEDS                                │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🧠 Mesin Prediksi AI

Sistem menggunakan **neural inference di client-side** untuk menyediakan prediksi bencana yang akurat dan menjaga privasi langsung di browser.

### Model

| Model | Framework | Data Training | Akurasi | Tujuan |
|-------|-----------|---------------|---------|--------|
| **Prediksi Banjir NN** | TensorFlow.js | 2.500 sampel cuaca Indonesia | 96.4% (0.99 AUC-ROC) | Memproses curah hujan, kelembaban, data tanah untuk probabilitas banjir |
| **Risiko Gempa NN** | TensorFlow.js | 2.000 observasi seismik USGS | 83.5% | Menghitung jendela risiko 30 hari dari kedalaman, b-values, clustering |
| **Analyzer Pesan SOS** | Transformers.js | MobileBERT (Hugging Face) | Zero-Shot | Klasifikasi urgensi & hazard dari pesan SOS |

### Pipeline Inferensi

```
Data Sensor Live → Normalisasi Fitur → Eksekusi Neural (WebGL/WASM) → Deployment Visual
       │                    │                        │                            │
   Open-Meteo,          Scalar yang          model.predict()              Heatmaps &
   USGS feeds           sama dari            via TF.js                   alert markers
                        training Python
```

---

## 💻 Tech Stack

<table>
<tr>
<td valign="top" width="33%">

### Machine Learning
- **TensorFlow.js** — Neural networks di browser
- **Transformers.js** — NLP inference lokal (Hugging Face)
- **Python / Keras** — Training model & dataset

</td>
<td valign="top" width="33%">

### Frontend
- **React 18 + Vite** — PWA-ready SPA
- **TypeScript** — Type-safe ML integration
- **Tailwind CSS** — Premium glassmorphism UI
- **Leaflet** — Interactive GIS mapping
- **Recharts** — Data visualization

</td>
<td valign="top" width="34%">

### Backend & Data
- **Supabase** — PostgreSQL + Edge Functions
- **IndexedDB** — Offline tile & data caching
- **Open-Meteo / USGS / WAQI** — Live sensor feeds
- **BMKG** — Cuaca & peringatan dini Indonesia
- **Overpass API** — Penemuan fasilitas darurat

</td>
</tr>
</table>

---

## 🚀 Cara Memulai

### Prerequisites

- **Node.js** ≥ 18
- **npm** atau **bun**
- Project [Supabase](https://supabase.com) (untuk AI Copilot edge functions)

### Instalasi

```bash
# Clone repository
git clone https://github.com/diskonnekted/AI-Predictive-Disaster-MAP.git
cd AI-Predictive-Disaster-MAP

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Tambahkan VITE_HF_TOKEN, Supabase keys, dll

# Jalankan development server
npm run dev
```

Aplikasi akan tersedia di `http://localhost:8080`.

### Menjalankan Backend

Backend diperlukan untuk proxy BMKG dan integrasi Groq:

```bash
# Terminal terpisah
npm run server
# atau
node server.js
```

Backend berjalan di `http://localhost:3002`.

---

## 🔧 Variabel Lingkungan

| Variabel | Deskripsi |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL project Supabase Anda |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous API key |
| `VITE_HF_TOKEN` | Hugging Face API token (untuk NLP models) |
| `VITE_BMKG_PROXY_URL` | URL proxy BMKG (default: http://localhost:3001) |

---

## 📍 Wilayah Default

Aplikasi ini dikonfigurasi untuk **Kabupaten Banjarnegara, Jawa Tengah, Indonesia**:

- **Pusat Peta**: `-7.345693, 109.670380` (Kota Banjarnegara)
- **Bounding Box**: -7.60 s/d -7.20 (LS), 109.45 s/d 109.95 (BT)
- **Radius fasilitas darurat**: 15 km
- **Radius bencana**: 120 km
- **Kode wilayah BMKG**: `33.04.12.2001` (Desa Sambong, Kec. Punggelan)

Konfigurasi dapat diubah di `src/config/region.ts`.

---

## 📄 Lisensi

Project ini bersifat open-source dan tersedia di bawah [MIT License](LICENSE).

---

<p align="center">
  <sub> Dibuat dengan ❤️ untuk Ketahanan Bencana</sub>
</p>