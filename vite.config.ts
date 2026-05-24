import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendPort = env.PORT || "3001";

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/api': {
          target: `http://localhost:${backendPort}`,
          changeOrigin: true,
        },
        '/hf-api': {
          target: 'https://router.huggingface.co',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/hf-api/, ''),
        }
      }
    },

  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192x192.png', 'icon-512x512.png'],
      // Override the strict 2MB default sizing limit to allow Vercel to cache heavy WASM pipelines offline
      workbox: {
        maximumFileSizeToCacheInBytes: 35000000 // 35 MiB
      },
      manifest: {
        name: 'Dasbor Prediktif Cuaca',
        short_name: 'Dasbor Prediktif',
        description: 'Sistem manajemen bencana dan tanggap darurat real-time dengan dukungan offline',
        theme_color: '#667eea',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
};
});


