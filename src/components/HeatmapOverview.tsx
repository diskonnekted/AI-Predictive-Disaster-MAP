import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DisasterEvent, Location } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { fetchWeatherDataForMultipleLocations } from '@/utils/api';
import { Cloud, Droplets, AlertTriangle, Settings, Layers, X, ChevronUp, ChevronDown, MapPin } from 'lucide-react';
import DynamicIsland from '@/components/DynamicIsland';
import EmergencySOS from '@/components/EmergencySOS';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { createOfflineTileLayer } from '@/utils/offlineTileLayer';
import { predictFlood } from '@/utils/mlModels';
import { DEFAULT_REGION } from '@/config/region';

interface HeatmapOverviewProps {
  disasters: DisasterEvent[];
  userLocation: Location | null;
  nearbyDisasters: DisasterEvent[];
  language?: 'en' | 'id';
  isPickingLocation?: boolean;
  onLocationPick?: (location: Location) => void;
}

// Fix Leaflet default icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

type RiskLevel = 'low' | 'medium' | 'high';
type OverlayMode = 'disaster' | 'temperature' | 'pollution';
type MapLayer = 'default' | 'satellite' | 'terrain' | 'streets';

const HeatmapOverview: React.FC<HeatmapOverviewProps> = ({ 
  disasters, 
  userLocation, 
  nearbyDisasters, 
  language = 'id',
  isPickingLocation = false,
  onLocationPick
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const glowLayerRef = useRef<L.LayerGroup | null>(null);
  const tooltipLayerRef = useRef<L.LayerGroup | null>(null);
  const stateLayerRef = useRef<any>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const pickingCrosshairRef = useRef<L.Layer | null>(null);
  const disasterLayerRef = useRef<L.LayerGroup | null>(null);
  const [activeFilters, setActiveFilters] = useState<Set<RiskLevel>>(
    new Set(['low', 'medium', 'high'])
  );
  const [overlayMode, setOverlayMode] = useState<OverlayMode>('disaster');
  const [mapLayer, setMapLayer] = useState<MapLayer>('default');
  const [heatmapRadius, setHeatmapRadius] = useState(35);
  const [heatmapBlur, setHeatmapBlur] = useState(25);
  const [weatherData, setWeatherData] = useState<Map<string, { temp: number; aqi: number; floodRisk: number; floodFactors: string[] }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [loadingDismissed, setLoadingDismissed] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [allStatesData, setAllStatesData] = useState<any>(null);
  const [stateAverages, setStateAverages] = useState<Map<string, { avgTemp: number; avgAqi: number; avgRisk: number; count: number }>>(new Map());
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const [showMapStyleSheet, setShowMapStyleSheet] = useState(false);
  const [showHeatmapSheet, setShowHeatmapSheet] = useState(false);
  const [isLegendMobileOpen, setIsLegendMobileOpen] = useState(false);

  // Auto-resize leaflet map on window resize for mobile
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        setTimeout(() => mapInstanceRef.current?.invalidateSize(), 50);
      }
    };
    window.addEventListener('resize', handleResize);
    // Initial trigger
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, { zoomControl: false }).setView(
      [DEFAULT_REGION.center.lat, DEFAULT_REGION.center.lng],
      DEFAULT_REGION.zoom.overview
    );
    mapInstanceRef.current = map;

    const getTileUrl = () => {
      // Bias Google tiles to the configured region (labels/locale).
      return `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&gl=${DEFAULT_REGION.googleTilesRegion}`;
    };

    const tileLayer = createOfflineTileLayer(getTileUrl(), {
      attribution: '© Google Maps',
      maxZoom: 18,
      regionName: 'browsing',
      className: isDarkMode ? 'dark-map-tiles' : '' // Use refined CSS filter to make Google Maps look like dark mode
    });
    (tileLayer as any).addTo(map);
    tileLayerRef.current = tileLayer;

    // Load state/desa boundaries
    fetch('/geojson/desa.geojson')
      .then(response => response.json())
      .then(geojsonData => {
        setAllStatesData(geojsonData);
      })
      .catch(error => console.error('Error loading boundaries:', error));

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 📡 Global Telemetry Map Navigation: Centering Listener
  useEffect(() => {
    const handleCenterMap = (e: any) => {
      const location = e.detail;
      if (mapInstanceRef.current && location) {
        console.log("📍 Centering map on specialized telemetry:", location);
        mapInstanceRef.current.setView([location.lat, location.lng], 12, {
          animate: true,
          duration: 1.5
        });

        // Find the marker in the disaster layer and open its popup
        if (disasterLayerRef.current) {
          disasterLayerRef.current.eachLayer((layer: any) => {
            if (layer instanceof L.Marker) {
              const latlng = layer.getLatLng();
              // Check if coordinates match closely
              if (Math.abs(latlng.lat - location.lat) < 0.001 && Math.abs(latlng.lng - location.lng) < 0.001) {
                setTimeout(() => {
                  layer.openPopup();
                }, 1500); // Wait for the transition to finish before opening popup
              }
            }
          });
        }
      }
    };

    window.addEventListener('centerMap', handleCenterMap);
    return () => window.removeEventListener('centerMap', handleCenterMap);
  }, []);

  // 📍 Handle Manual Location Picking Click
  useEffect(() => {
    if (!mapInstanceRef.current || !isPickingLocation) {
      if (mapRef.current) mapRef.current.style.cursor = 'grab';
      return;
    }

    const map = mapInstanceRef.current;
    mapRef.current!.style.cursor = 'crosshair';

    const onMapClick = (e: L.LeafletMouseEvent) => {
      if (onLocationPick) {
        onLocationPick({
          lat: e.latlng.lat,
          lng: e.latlng.lng,
          name: language === 'en' ? 'Manual Location' : 'Lokasi Manual'
        });
      }
    };

    map.on('click', onMapClick);
    return () => {
      map.off('click', onMapClick);
    };
  }, [isPickingLocation, onLocationPick, language]);

  // 📍 User Location Marker Sync
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-location-marker',
        html: `
          <div class="relative">
            <div class="absolute -inset-4 bg-primary/30 rounded-full animate-ping" />
            <div class="absolute -inset-2 bg-primary/20 rounded-full animate-pulse" />
            <div class="w-4 h-4 bg-primary rounded-full border-2 border-white shadow-lg flex items-center justify-center">
              <div class="w-1.5 h-1.5 bg-white rounded-full" />
            </div>
          </div>
        `,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
      } else {
        userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { 
          icon: userIcon,
          zIndexOffset: 1000 
        }).addTo(map);
        
        // Add a nice popup
        userMarkerRef.current.bindPopup(`
          <div class="p-1">
            <p class="font-bold text-xs uppercase tracking-tight text-primary">
              ${language === 'en' ? 'My Verified Location' : 'Lokasi Terverifikasi'}
            </p>
            <p class="text-[10px] text-muted-foreground mt-0.5">${userLocation.name}</p>
          </div>
        `, { closeButton: false, offset: [0, -5] });
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    }
  }, [userLocation, language]);

  // 🌋 Active Disasters Markers Sync
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear previous disaster layer
    if (disasterLayerRef.current) {
      map.removeLayer(disasterLayerRef.current);
    }

    const disasterGroup = L.layerGroup();

    disasters.forEach((disaster) => {
      const { lat, lng } = disaster.location;
      const level = disaster.severity === 'high' ? 'high' : disaster.severity === 'medium' ? 'medium' : 'low';
      if (!activeFilters.has(level)) return;

      // Determine severity/prediction color
      const isPred = disaster.isPrediction;
      const markerColor = isPred ? '#a855f7' : (disaster.severity === 'high' ? '#ef4444' : disaster.severity === 'medium' ? '#f97316' : '#eab308');

      // Determine icon based on disaster type
      const iconHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-8 h-8 rounded-full opacity-35 ${isPred ? 'animate-pulse border-2 border-dashed border-purple-500' : 'animate-ping'}" style="${isPred ? '' : `background-color: ${markerColor};`}" />
          <div class="absolute w-6 h-6 rounded-full opacity-20 animate-pulse" style="background-color: ${markerColor};" />
          <div class="w-7 h-7 rounded-full border-2 border-white shadow-xl flex items-center justify-center text-white font-bold" style="background-color: ${markerColor};">
            ${disaster.type === 'earthquake' ? '🌋' : disaster.type === 'flood' ? '🌊' : disaster.type === 'cyclone' ? '🌀' : disaster.type === 'fire' ? '🔥' : '⚠️'}
          </div>
        </div>
      `;

      const disasterIcon = L.divIcon({
        className: 'disaster-location-marker',
        html: iconHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const badgeHtml = isPred
        ? `<span class="ml-auto text-[8px] font-black px-1.5 py-0.5 rounded border border-purple-500/30 bg-purple-500/15 text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1">
             🧠 AI Prediction
           </span>`
        : `<span class="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase" style="color: ${markerColor}; border-color: ${markerColor};">
             ${disaster.severity}
           </span>`;

      const probHtml = isPred && disaster.probability !== undefined
        ? `<div class="mt-1.5 p-1 px-2 rounded bg-purple-500/5 text-[10px] text-purple-600 dark:text-purple-400 font-semibold border border-purple-500/10">
             ${language === 'en' ? 'Probability' : 'Probabilitas'}: ${(disaster.probability * 100).toFixed(0)}%
             ${disaster.confidence ? ` (Conf: ${(disaster.confidence * 100).toFixed(0)}%)` : ''}
           </div>`
        : '';

      const popupHtml = `
        <div class="p-2 min-w-[200px] text-slate-800 dark:text-slate-100">
          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="text-lg">${disaster.type === 'earthquake' ? '🌋' : disaster.type === 'flood' ? '🌊' : disaster.type === 'cyclone' ? '🌀' : disaster.type === 'fire' ? '🔥' : '⚠️'}</span>
            <span class="font-black text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              ${disaster.type.toUpperCase()}
            </span>
            ${badgeHtml}
          </div>
          <h4 class="font-bold text-sm leading-snug mb-1 text-slate-900 dark:text-white">${disaster.title}</h4>
          <p class="text-xs text-slate-600 dark:text-slate-300 leading-normal mb-1.5">${disaster.description}</p>
          ${probHtml}
          <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1.5 mt-2 border-t border-slate-100 dark:border-slate-800">
            <span>${new Date(disaster.time).toLocaleDateString(language === 'en' ? 'en-US' : 'id-ID', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            ${disaster.url ? `<a href="${disaster.url}" target="_blank" class="text-primary hover:underline font-bold">${language === 'en' ? 'Details' : 'Detail'} →</a>` : ''}
          </div>
        </div>
      `;

      L.marker([lat, lng], { icon: disasterIcon })
        .bindPopup(popupHtml, { maxWidth: 300 })
        .addTo(disasterGroup);
    });

    disasterGroup.addTo(map);
    disasterLayerRef.current = disasterGroup;

    return () => {
      if (disasterLayerRef.current) {
        map.removeLayer(disasterLayerRef.current);
      }
    };
  }, [disasters, activeFilters, language]);

  // 📡 Siaga Banjar Agent: Map Layer & Mode Synchronization
  useEffect(() => {
    const handleSyncLayer = (e: any) => {
      const layer = e.detail as MapLayer;
      if (['default', 'satellite', 'terrain', 'streets'].includes(layer)) {
        console.log(`🗺️ Syncing Map Layer: ${layer}`);
        setMapLayer(layer);
      }
    };

    const handleSyncMode = (e: any) => {
      const mode = e.detail as OverlayMode;
      if (['disaster', 'temperature', 'pollution'].includes(mode)) {
        console.log(`🗺️ Syncing Map Mode: ${mode}`);
        setOverlayMode(mode);
      }
    };

    window.addEventListener('syncMapLayer', handleSyncLayer as EventListener);
    window.addEventListener('syncMapMode', handleSyncMode as EventListener);
    return () => {
      window.removeEventListener('syncMapLayer', handleSyncLayer as EventListener);
      window.removeEventListener('syncMapMode', handleSyncMode as EventListener);
    };
  }, []);

  // Listen for theme changes
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          const isDark = document.documentElement.classList.contains('dark');
          setIsDarkMode(isDark);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Update map layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    let tileUrl = '';
    let attribution = '© Google Maps';

    if (mapLayer === 'satellite') {
      tileUrl = `https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&gl=${DEFAULT_REGION.googleTilesRegion}`;
    } else if (mapLayer === 'terrain') {
      tileUrl = `https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}&gl=${DEFAULT_REGION.googleTilesRegion}`;
    } else if (mapLayer === 'streets') {
      tileUrl = `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&gl=${DEFAULT_REGION.googleTilesRegion}`;
    } else {
      tileUrl = `https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&gl=${DEFAULT_REGION.googleTilesRegion}`;
    }

    const newTileLayer = createOfflineTileLayer(tileUrl, {
      attribution,
      maxZoom: 18,
      regionName: mapLayer === 'default' ? 'browsing' : mapLayer,
      // Apply dark tint to standard roadmap layers, but never to satellite/terrain
      className: (isDarkMode && mapLayer !== 'satellite' && mapLayer !== 'terrain') ? 'dark-map-tiles' : ''
    });
    (newTileLayer as any).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTileLayer;
  }, [mapLayer, isDarkMode]);

  // Update state boundaries layer
  useEffect(() => {
    if (!mapInstanceRef.current || !allStatesData) return;

    // Remove old state layer
    if (stateLayerRef.current) {
      mapInstanceRef.current.removeLayer(stateLayerRef.current);
    }

    const dataToShow = selectedState
      ? {
        ...allStatesData,
        features: allStatesData.features.filter((f: any) =>
          (f.properties?.NAMOBJ || f.properties?.WADMKC || f.properties?.name) === selectedState
        )
      }
      : allStatesData;

    const stateLayer = L.geoJSON(dataToShow, {
      style: {
        color: '#3388ff',
        weight: 1,
        opacity: 0.25,
        fillOpacity: 0.02,
        fillColor: '#3388ff'
      },
      onEachFeature: (feature, layer) => {
        const stateName = feature.properties?.NAMOBJ || feature.properties?.name || (language === 'en' ? 'Village' : 'Desa');

        layer.on({
          mouseover: (e) => {
            if (!selectedState) {
              e.target.setStyle({
                weight: 1.5,
                opacity: 0.4,
                fillOpacity: 0.05
              });
            }
          },
          mouseout: (e) => {
            if (!selectedState) {
              e.target.setStyle({
                weight: 1,
                opacity: 0.25,
                fillOpacity: 0.02
              });
            }
          },
          click: (e) => {
            if (selectedState === stateName) {
              // Double click to reset
              setSelectedState(null);
              mapInstanceRef.current?.setView(
                [DEFAULT_REGION.center.lat, DEFAULT_REGION.center.lng],
                DEFAULT_REGION.zoom.reset
              );
            } else {
              setSelectedState(stateName);
              const bounds = layer.getBounds();
              mapInstanceRef.current?.fitBounds(bounds, { padding: [50, 50] });
            }
          }
        });

        // Create dynamic tooltip based on overlay mode and available data
        const getTooltipContent = () => {
          const avgData = stateAverages.get(stateName);
          let content = `<div style="font-size: 11px; padding: 2px;">
            <strong>${stateName}</strong>`;

          if (avgData && avgData.count > 0) {
            content += `<br/><span style="opacity: 0.8;">Based on ${avgData.count} cities</span>`;

            if (overlayMode === 'disaster') {
              const riskLevel = avgData.avgRisk >= 0.65 ? (language === 'en' ? 'HIGH' : 'TINGGI') : avgData.avgRisk >= 0.45 ? (language === 'en' ? 'MEDIUM' : 'SEDANG') : (language === 'en' ? 'LOW' : 'RENDAH');
              const riskColor = avgData.avgRisk >= 0.65 ? '#ff0000' : avgData.avgRisk >= 0.45 ? '#ffaa00' : '#00ff00';
              content += `<br/>${language === 'en' ? 'Avg Risk' : 'Rerata Risiko'}: <strong style="color: ${riskColor};">${riskLevel}</strong> (${(avgData.avgRisk * 100).toFixed(0)}%)`;
            } else if (overlayMode === 'temperature') {
              content += `<br/>${language === 'en' ? 'Avg Temp' : 'Rerata Suhu'}: <strong>${avgData.avgTemp.toFixed(1)}°C</strong>`;
            } else if (overlayMode === 'pollution') {
              content += `<br/>${language === 'en' ? 'Avg AQI' : 'Rerata AQI'}: <strong>${avgData.avgAqi.toFixed(0)}</strong>`;
            }
          }

          content += selectedState === stateName ? `<br/><span style="opacity: 0.7; font-size: 10px;">${language === 'en' ? 'Click again to reset' : 'Klik lagi untuk reset'}</span>` : '';
          content += '</div>';
          return content;
        };

        layer.bindTooltip(getTooltipContent(), {
          permanent: false,
          direction: 'center',
          className: 'state-tooltip'
        });

        // Update tooltip on hover to show current overlay data
        layer.on('mouseover', () => {
          // Use Leaflet Layer API to update bound tooltip content safely
          if ((layer as any).setTooltipContent) {
            (layer as any).setTooltipContent(getTooltipContent());
          } else if ((layer as any).getTooltip) {
            const tt = (layer as any).getTooltip();
            tt && tt.setContent && tt.setContent(getTooltipContent());
          }
        });
      }
    }).addTo(mapInstanceRef.current);

    stateLayerRef.current = stateLayer;
  }, [allStatesData, selectedState, overlayMode, stateAverages]);

  // Calculate state averages from real weather data
  useEffect(() => {
    if (weatherData.size === 0) return;

    const stateMap = new Map<string, { tempSum: number; aqiSum: number; riskSum: number; count: number }>();

    weatherData.forEach((data, key) => {
      const [lat, lng] = key.split(',').map(Number);

      // Determine location context based on coordinates (simplified mapping)
      let state = data.villageName || 'Unknown';

      // Real-data risk — directly from ML model
      let risk = data.floodRisk || 0;

      const existing = stateMap.get(state) || { tempSum: 0, aqiSum: 0, riskSum: 0, count: 0 };
      stateMap.set(state, {
        tempSum: existing.tempSum + data.temp,
        aqiSum: existing.aqiSum + data.aqi,
        riskSum: existing.riskSum + risk,
        count: existing.count + 1
      });
    });

    // Calculate averages
    const averages = new Map<string, { avgTemp: number; avgAqi: number; avgRisk: number; count: number }>();
    stateMap.forEach((data, state) => {
      averages.set(state, {
        avgTemp: data.tempSum / data.count,
        avgAqi: data.aqiSum / data.count,
        avgRisk: data.riskSum / data.count,
        count: data.count
      });
    });

    setStateAverages(averages);
  }, [weatherData]);


  const toggleFilter = (level: RiskLevel) => {
    setActiveFilters(prev => {
      const newFilters = new Set(prev);
      if (newFilters.has(level)) {
        newFilters.delete(level);
      } else {
        newFilters.add(level);
      }
      return newFilters;
    });
  };

  const getIntensityRange = (intensity: number): RiskLevel => {
    if (intensity >= 0.65) return 'high';
    if (intensity >= 0.45) return 'medium';
    return 'low';
  };

  // Cities covering all Indian states and regions
  const getLocalHeatmapPoints = (): Location[] => {
    const { north, south, west, east } = DEFAULT_REGION.bounds;
    const grid = Math.max(2, DEFAULT_REGION.heatmap.points.grid);

    const points: Location[] = [];
    // Create a simple uniform grid of sample points inside the bounding box.
    for (let y = 0; y < grid; y++) {
      const tLat = grid === 1 ? 0.5 : y / (grid - 1);
      const lat = north + (south - north) * tLat;
      for (let x = 0; x < grid; x++) {
        const tLng = grid === 1 ? 0.5 : x / (grid - 1);
        const lng = west + (east - west) * tLng;
        points.push({ lat, lng });
      }
    }

    // Always include exact center as an anchor point.
    points.push(DEFAULT_REGION.center);
    return points;
  };

  // Fetch weather and pollution data ONCE on mount, cache in localStorage for 15 min
  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const CACHE_KEY = 'heatmap_weather_cache';
    const CACHE_TTL = 60 * 60 * 1000; // 1 hour

    // Try to restore from cache first
    const tryRestoreCache = (): boolean => {
      try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return false;
        const cached = JSON.parse(raw);
        if (Date.now() - cached.timestamp > CACHE_TTL) {
          localStorage.removeItem(CACHE_KEY);
          return false;
        }
        const restored = new Map<string, { temp: number; aqi: number; floodRisk: number; floodFactors: string[] }>();
        for (const [k, v] of cached.data) {
          restored.set(k, v);
        }
        if (restored.size > 0) {
          setWeatherData(restored);
          console.log(`✅ Restored ${restored.size} cities from cache`);
          return true;
        }
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
      return false;
    };

    // Save to cache
    const saveToCache = (dataMap: Map<string, any>) => {
      try {
        const serializable = Array.from(dataMap.entries());
        localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: serializable }));
      } catch { /* quota exceeded, ignore */ }
    };

    // Fetch with retry + exponential backoff
    const fetchWithRetry = async (url: string, opts: RequestInit, retries = 3): Promise<Response> => {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const res = await fetch(url, opts);
          if (res.ok) return res;
          if (res.status === 429 && attempt < retries - 1) {
            const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
            console.warn(`⏳ Rate limited, retrying in ${delay / 1000}s...`);
            await new Promise(r => setTimeout(r, delay));
            continue;
          }
          return res; // Non-429 error, return as-is
        } catch (e) {
          if (attempt === retries - 1) throw e;
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      throw new Error('Max retries exceeded');
    };
    const loadData = async () => {
      // Try cache first
      if (tryRestoreCache()) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setWeatherData(new Map());

      const cities = getLocalHeatmapPoints();
      const totalCities = cities.length;
      setLoadingProgress({ current: 0, total: totalCities });

      const dataMap = new Map<string, { temp: number; aqi: number; floodRisk: number; floodFactors: string[] }>();

      try {
        // Phase 1: Fetch weather in larger chunks to reduce number of requests
        const METEO_CHUNK = 50;
        let meteoData: any[] = new Array(cities.length).fill(null);
        let aqiData: any[] = new Array(cities.length).fill(null);

        for (let c = 0; c < cities.length; c += METEO_CHUNK) {
          if (signal.aborted) break;
          const chunk = cities.slice(c, c + METEO_CHUNK);
          const chunkLats = chunk.map(ci => ci.lat).join(',');
          const chunkLngs = chunk.map(ci => ci.lng).join(',');
          try {
            const [wRes, aRes] = await Promise.all([
              fetchWithRetry(`https://api.open-meteo.com/v1/forecast?latitude=${chunkLats}&longitude=${chunkLngs}&current=temperature_2m,relative_humidity_2m,precipitation,surface_pressure,wind_speed_10m&timezone=auto`, { signal }, 3),
              fetchWithRetry(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${chunkLats}&longitude=${chunkLngs}&current=us_aqi&timezone=auto`, { signal }, 3).catch(() => null)
            ]);

            if (wRes && wRes.ok) {
              const d = await wRes.json();
              const arr = Array.isArray(d) ? d : [d];
              arr.forEach((item: any, idx: number) => {
                meteoData[c + idx] = item;
              });
            }
            if (aRes && aRes.ok) {
              const d = await aRes.json();
              const arr = Array.isArray(d) ? d : [d];
              arr.forEach((item: any, idx: number) => {
                aqiData[c + idx] = item;
              });
            }
          } catch (e) {
            console.warn(`⚠️ Weather chunk ${c}-${c + METEO_CHUNK} failed`, e);
          }
          // Update progress
          setLoadingProgress({ current: Math.min(c + METEO_CHUNK, totalCities), total: totalCities });
        }

        const weatherCount = meteoData.filter(Boolean).length;
        console.log(`🌦️ Weather data fetched for ${weatherCount}/${cities.length} cities`);

        // Phase 2: Process all cities synchronously — compute risk + AQI
        // Collect all ML prediction inputs first, then batch-predict
        const pendingPredictions: { cityIndex: number; lat: number; lng: number; temp: number; humidity: number; pressure: number; wind: number; precip: number; input: any; villageName: string }[] = [];

        for (let i = 0; i < cities.length; i++) {
          if (signal.aborted) break;
          const { lat, lng } = cities[i];
          if (meteoData[i]?.current?.temperature_2m != null) {
            const current = meteoData[i].current;
            const temp = current.temperature_2m;
            const humidity = current.relative_humidity_2m || 50;
            const pressure = current.surface_pressure || 1010;
            const wind = current.wind_speed_10m || 10;
            const currentPrecip = current.precipitation || 0;
            // Musim hujan di Indonesia (Banjarnegara) umumnya Oktober hingga April (Bulan 9, 10, 11, 0, 1, 2, 3 di JS)
            const is_monsoon = [9, 10, 11, 0, 1, 2, 3].includes(new Date().getMonth()) ? 1 : 0;
            // Banjarnegara berada di pedalaman dataran tinggi, bukan pesisir
            const is_coastal = 0;

            const aqi = aqiData[i]?.current?.us_aqi ?? 75;

            // Store temp data immediately
            dataMap.set(`${lat},${lng}`, { temp, aqi, floodRisk: 0, floodFactors: [], villageName: 'Location' });

            pendingPredictions.push({
              cityIndex: i, lat, lng, temp, humidity, pressure, wind, precip: currentPrecip, villageName: 'Location',
              input: {
                rainfall_24h_mm: currentPrecip * 24,
                rainfall_48h_mm: currentPrecip * 48,
                rainfall_72h_mm: currentPrecip * 72,
                max_hourly_rate_mm: currentPrecip,
                temperature_c: temp,
                humidity_pct: humidity,
                pressure_hpa: pressure,
                wind_speed_kmh: wind,
                is_monsoon,
                is_coastal
              }
            });
          }
        }

        // Batch ML predictions — run in small groups to avoid blocking UI thread
        const ML_BATCH = 20;
        for (let b = 0; b < pendingPredictions.length; b += ML_BATCH) {
          if (signal.aborted) break;
          const batch = pendingPredictions.slice(b, b + ML_BATCH);
          const results = await Promise.allSettled(
            batch.map(p => predictFlood(p.input))
          );
          results.forEach((res, idx) => {
            const p = batch[idx];
            const key = `${p.lat},${p.lng}`;
            const existing = dataMap.get(key);
            if (existing && res.status === 'fulfilled' && res.value) {
              existing.floodRisk = res.value.probability;
              existing.floodFactors = [
                `Precip: ${p.precip.toFixed(1)}mm/h`,
                `Humidity: ${p.humidity}%`,
                `Pressure: ${p.pressure.toFixed(0)}hPa`,
                `Wind: ${p.wind.toFixed(1)}km/h`
              ];
            }
          });
          // Yield to UI thread between batches
          await new Promise(r => setTimeout(r, 0));
        }
      } catch {
        // Ignore abort errors
      }

      if (!signal.aborted) {
        setWeatherData(new Map(dataMap));
        if (dataMap.size > 0) saveToCache(dataMap);
        setLoading(false);
        setLoadingDismissed(false);
        setLoadingProgress({ current: 0, total: 0 });
        console.log(`✅ Heatmap loaded ${dataMap.size}/${totalCities} cities with REAL Open-Meteo + AQI data`);
        console.log(`🌡️ Temperature range: ${Math.min(...Array.from(dataMap.values()).map(d => d.temp)).toFixed(1)}°C to ${Math.max(...Array.from(dataMap.values()).map(d => d.temp)).toFixed(1)}°C`);
        console.log(`💨 AQI range: ${Math.min(...Array.from(dataMap.values()).map(d => d.aqi))} to ${Math.max(...Array.from(dataMap.values()).map(d => d.aqi))}`);
        console.log(`🌊 Flood risk range: ${(Math.min(...Array.from(dataMap.values()).map(d => d.floodRisk)) * 100).toFixed(0)}% to ${(Math.max(...Array.from(dataMap.values()).map(d => d.floodRisk)) * 100).toFixed(0)}%`);
      }
    };

    loadData();

    return () => {
      abortController.abort();
    };
  }, []); // Only fetch ONCE on mount — data is same for all overlay modes


  // Get color based on value with better opacity for heatmap effect
  const getColor = (value: number, mode: OverlayMode, opacity: number = 0.6): string => {
    if (mode === 'temperature') {
      // Temperature: 10-45°C - Purple to Red gradient (matches legend)
      if (value < 15) return `rgba(168, 85, 247, ${opacity})`; // Cool purple (accent)
      if (value < 22) return `rgba(168, 85, 247, ${opacity})`; // Light purple (accent)
      if (value < 28) return `rgba(251, 146, 60, ${opacity})`; // Light orange (warning)
      if (value < 35) return `rgba(249, 115, 22, ${opacity})`; // Orange (warning darker)
      if (value < 40) return `rgba(239, 68, 68, ${opacity})`; // Red (destructive)
      return `rgba(220, 38, 38, ${opacity})`; // Hot dark red (destructive darker)
    } else if (mode === 'pollution') {
      // AQI: 0-300+ - Green to Yellow to Red to Purple gradient (matches legend)
      if (value < 50) return `rgba(34, 197, 94, ${opacity})`; // Good - green (success)
      if (value < 100) return `rgba(234, 179, 8, ${opacity})`; // Moderate - yellow (warning lighter)
      if (value < 150) return `rgba(251, 146, 60, ${opacity})`; // Unhealthy for sensitive - orange (warning)
      if (value < 200) return `rgba(239, 68, 68, ${opacity})`; // Unhealthy - red (destructive)
      if (value < 300) return `rgba(190, 18, 60, ${opacity})`; // Very unhealthy - dark red
      return `rgba(147, 51, 234, ${opacity})`; // Hazardous - purple (accent)
    } else {
      // Disaster risk - Green to Orange to Red gradient (matches legend exactly)
      if (value < 0.45) return `rgba(34, 197, 94, ${opacity})`; // Green (low/success)
      if (value < 0.65) return `rgba(251, 146, 60, ${opacity})`; // Orange (medium/warning)
      return `rgba(239, 68, 68, ${opacity})`; // Red (high/destructive)
    }
  };

  // Update heatmap glow circles + tooltip markers using Leaflet LayerGroups
  // Uses Leaflet's native renderer so circles move perfectly with the map (no lag)
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    // Clear previous layers
    if (glowLayerRef.current) { map.removeLayer(glowLayerRef.current); }
    if (tooltipLayerRef.current) { map.removeLayer(tooltipLayerRef.current); }

    const glowGroup = L.layerGroup();
    const tooltipGroup = L.layerGroup();

    weatherData.forEach((data, key) => {
      const [lat, lng] = key.split(',').map(Number);

      if (overlayMode === 'disaster') {
        const risk = data.floodRisk || 0;
        const level = getIntensityRange(risk);
        if (!activeFilters.has(level)) return;
        const riskFactors = data.floodFactors || ['Awaiting ML Inference...'];

        // ── Large glow circle (blurred via CSS for authentic heatmap look) ──
        L.circleMarker([lat, lng], {
          radius: heatmapRadius,
          fillColor: getColor(risk, 'disaster', 0.5),
          color: 'transparent',
          weight: 0,
          fillOpacity: 1,
          className: 'heatmap-glow',
          interactive: false, // no events = no overhead
        } as any).addTo(glowGroup);

        // ── Invisible hover circle for tooltip ──
        L.circleMarker([lat, lng], {
          radius: 25,
          fillColor: 'transparent',
          color: 'transparent',
          weight: 0,
          fillOpacity: 0,
        }).bindTooltip(`
            <strong>${language === 'en' ? 'Disaster Risk Score' : 'Skor Risiko Bencana'}</strong><br/>
            ${language === 'en' ? 'Level' : 'Tingkat'}: <strong style="color: ${getColor(risk, 'disaster', 1)}">${language === 'en' ? level.toUpperCase() : (level === 'high' ? 'TINGGI' : level === 'medium' ? 'SEDANG' : 'RENDAH')}</strong>
            &nbsp;(${(risk * 100).toFixed(0)}%)<br/>
            <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.2);">
              <span style="opacity: 0.8; font-size: 10px;">${language === 'en' ? 'Live data factors' : 'Faktor data waktu nyata'}:</span>
              <ul style="margin: 2px 0 0 0; padding-left: 14px; opacity: 0.9;">
                ${riskFactors.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
        `, { permanent: false, direction: 'top', className: 'custom-tooltip' }).addTo(tooltipGroup);
      } else {
        const value = overlayMode === 'temperature' ? data.temp : data.aqi;

        // ── Large glow circle ──
        L.circleMarker([lat, lng], {
          radius: heatmapRadius,
          fillColor: getColor(value, overlayMode, 0.5),
          color: 'transparent',
          weight: 0,
          fillOpacity: 1,
          className: 'heatmap-glow',
          interactive: false,
        } as any).addTo(glowGroup);

        // ── Hover tooltip ──
        L.circleMarker([lat, lng], {
          radius: 25,
          fillColor: 'transparent',
          color: 'transparent',
          weight: 0,
          fillOpacity: 0,
        }).bindTooltip(`
          <div style="font-size: 11px; padding: 4px;">
            <strong>${overlayMode === 'temperature' ? (language === 'en' ? '🌡️ Temperature' : '🌡️ Suhu') : (language === 'en' ? '💨 Air Quality' : '💨 Kualitas Udara')}</strong><br/>
            ${overlayMode === 'temperature'
              ? `<strong>${data.temp.toFixed(1)}°C</strong> <span style="opacity:0.7;font-size:10px;">(Open-Meteo Live)</span>`
              : `AQI: <strong>${data.aqi.toFixed(0)}</strong> <span style="opacity:0.7;font-size:10px;">(US EPA Standard)</span>`}
          </div>
        `, { permanent: false, direction: 'top', className: 'custom-tooltip' }).addTo(tooltipGroup);
      }
    });

    glowGroup.addTo(map);
    tooltipGroup.addTo(map);
    glowLayerRef.current = glowGroup;
    tooltipLayerRef.current = tooltipGroup;
  }, [overlayMode, weatherData, activeFilters, heatmapRadius]);

  return (
    <div className="h-full w-full relative">
      <style>{`
        .heatmap-glow {
          filter: blur(${heatmapBlur}px);
          opacity: 0.75;
          will-change: transform;
        }
        .custom-tooltip {
          background: rgba(0, 0, 0, 0.85) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 8px !important;
          padding: 4px 8px !important;
          color: white !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
          font-size: 11px !important;
        }
        .custom-tooltip::before {
          border-top-color: rgba(0, 0, 0, 0.85) !important;
        }
        .state-tooltip {
          background: rgba(51, 136, 255, 0.85) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 6px !important;
          padding: 3px 8px !important;
          color: white !important;
          font-weight: 500 !important;
          font-size: 11px !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
      <DynamicIsland userLocation={userLocation} />
      <div ref={mapRef} className="h-full w-full" />

      {/* 🧭 Manual Location Picking Overlay */}
      {isPickingLocation && (
        <div className="absolute inset-x-0 top-16 flex justify-center z-[1000] pointer-events-none">
          <div className="bg-primary/90 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce-slow pointer-events-auto">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest leading-none">
                {language === 'en' ? 'SETTING ACCURATE LOCATION' : 'MENETAPKAN LOKASI AKURAT'}
              </p>
              <p className="text-[10px] opacity-90 font-medium">
                {language === 'en' ? 'Click anywhere on the map to set your true location' : 'Klik di mana saja pada peta untuk menetapkan lokasi asli Anda'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* === BOTTOM CENTERED CONTROLS (Mode Toggles + Mobile Legend) === */}
      <div className="absolute bottom-[3.5rem] lg:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 z-[999] pointer-events-auto transition-all">
        
        {/* Layer Toggles */}
        <div className="glass-strong rounded-xl shadow-elevated border border-border/40 backdrop-blur-xl pointer-events-auto transition-all">
          <Tabs value={overlayMode} onValueChange={(value) => setOverlayMode(value as OverlayMode)}>
            <TabsList className="bg-card/60 backdrop-blur-xl rounded-lg border border-border/20 p-1 pointer-events-auto h-auto shadow-sm">
              <TabsTrigger
                value="disaster"
                className="gap-1.5 rounded-md transition-all duration-300 bg-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/50 py-1.5 px-2 sm:py-2 sm:px-4"
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline text-[11px] sm:text-xs font-semibold">{language === 'en' ? 'Risk' : 'Risiko'}</span>
              </TabsTrigger>
              <TabsTrigger
                value="temperature"
                className="gap-1.5 rounded-md transition-all duration-300 bg-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/50 py-1.5 px-2 sm:py-2 sm:px-4"
              >
                <Cloud className="h-4 w-4" />
                <span className="hidden sm:inline text-[11px] sm:text-xs font-semibold">{language === 'en' ? 'Temp' : 'Suhu'}</span>
              </TabsTrigger>
              <TabsTrigger
                value="pollution"
                className="gap-1.5 rounded-md transition-all duration-300 bg-transparent data-[state=active]:bg-primary data-[state=active]:text-primary-foreground hover:bg-muted/50 py-1.5 px-2 sm:py-2 sm:px-4"
              >
                <Droplets className="h-4 w-4" />
                <span className="hidden sm:inline text-[11px] sm:text-xs font-semibold">{language === 'en' ? 'AQI' : 'AQI'}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

      </div>

        {selectedState && (
          <button
            onClick={() => {
              setSelectedState(null);
              mapInstanceRef.current?.setView(
                [DEFAULT_REGION.center.lat, DEFAULT_REGION.center.lng],
                DEFAULT_REGION.zoom.reset
              );
            }}
            className="hidden lg:block glass-strong rounded-xl shadow-elevated border border-white/30 px-4 py-2 text-xs font-semibold hover:bg-muted/20 hover:border-border/50 transition-all duration-300 backdrop-blur-xl absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
          >
            {language === 'en' ? 'Show All Banjarnegara' : 'Tampilkan Seluruh Banjarnegara'}
          </button>
        )}

      {/* Desktop Map Layer Controls */}
      <div className="hidden lg:block absolute top-4 left-4 glass-strong rounded-xl border border-border/40 p-3 z-[1000] backdrop-blur-xl shadow-elevated">
        <h3 className="text-xs font-semibold mb-2 text-foreground">{language === 'en' ? 'Map Style' : 'Gaya Peta'}</h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => setMapLayer('default')}
            className={`px-3 py-2 text-xs rounded-lg transition-all duration-300 font-medium ${mapLayer === 'default'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card/90 hover:bg-card border border-border'
              }`}
          >
            {language === 'en' ? 'Default' : 'Default'}
          </button>
          <button
            onClick={() => setMapLayer('streets')}
            className={`px-3 py-2 text-xs rounded-lg transition-all duration-300 font-medium ${mapLayer === 'streets'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card/90 hover:bg-card border border-border'
              }`}
          >
            {language === 'en' ? 'Streets' : 'Jalan'}
          </button>
          <button
            onClick={() => setMapLayer('satellite')}
            className={`px-3 py-2 text-xs rounded-lg transition-all duration-300 font-medium ${mapLayer === 'satellite'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card/90 hover:bg-card border border-border'
              }`}
          >
            {language === 'en' ? 'Satellite' : 'Satelit'}
          </button>
          <button
            onClick={() => setMapLayer('terrain')}
            className={`px-3 py-2 text-xs rounded-lg transition-all duration-300 font-medium ${mapLayer === 'terrain'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card/90 hover:bg-card border border-border'
              }`}
          >
            {language === 'en' ? 'Terrain' : 'Medan'}
          </button>
        </div>
      </div>

      {/* Desktop Heatmap Controls */}
      <div className="hidden lg:block absolute top-4 right-4 glass-strong rounded-xl border border-border/40 p-4 z-[999] min-w-[200px] backdrop-blur-xl shadow-elevated">
        <h3 className="text-xs font-semibold mb-3 text-foreground flex items-center gap-2">
          <Settings className="w-4 h-4 text-primary" />
          {language === 'en' ? 'Heatmap Settings' : 'Pengaturan Peta Panas'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-foreground flex justify-between mb-3">
              <span className="font-medium">Radius</span>
              <span className="text-primary font-semibold">{heatmapRadius}px</span>
            </label>
            <Slider
              variant="contrast"
              min={30}
              max={120}
              step={1}
              value={[heatmapRadius]}
              onValueChange={(value) => setHeatmapRadius(value[0])}
              aria-label="Heatmap radius"
              className="cursor-pointer"
            />
          </div>
          <div>
            <label className="text-xs text-foreground flex justify-between mb-3">
              <span className="font-medium">{language === 'en' ? 'Blur' : 'Kekaburan'}</span>
              <span className="text-primary font-semibold">{heatmapBlur}px</span>
            </label>
            <Slider
              variant="contrast"
              min={10}
              max={80}
              step={1}
              value={[heatmapBlur]}
              onValueChange={(value) => setHeatmapBlur(value[0])}
              aria-label="Heatmap blur intensity"
              className="cursor-pointer"
            />
          </div>
        </div>
      </div>

      {loading && !loadingDismissed && (
        <div className="absolute top-1/2 -translate-y-1/2 lg:top-20 lg:translate-y-0 left-1/2 -translate-x-1/2 glass-strong p-4 rounded-xl border border-border/40 z-[999] min-w-[240px] backdrop-blur-xl shadow-xl">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 justify-center">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
              <span className="text-sm font-semibold">{language === 'en' ? 'Loading data...' : 'Memuat data...'}</span>
            </div>
            {loadingProgress.total > 0 && (
              <>
                <div className="text-xs text-center text-muted-foreground">
                  {language === 'en' ? `Loaded ${loadingProgress.current}/${loadingProgress.total} areas` : `Memuat ${loadingProgress.current}/${loadingProgress.total} wilayah`}
                </div>
                <div className="w-full bg-muted/50 rounded-full h-2.5 overflow-hidden border border-border/30">
                  <div
                    className="bg-gradient-to-r from-primary to-primary/80 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }}
                  ></div>
                </div>
              </>
            )}
            <button
              onClick={() => setLoadingDismissed(true)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors text-center mt-1 underline underline-offset-2"
            >
              {language === 'en' ? 'Dismiss' : 'Tutup'}
            </button>
          </div>
        </div>
      )}


      {/* === DESKTOP RISK LEGEND === */}
      {overlayMode === 'disaster' && (
        <div className="hidden lg:block absolute bottom-6 left-6 glass-strong p-4 rounded-xl shadow-elevated border border-border/30 z-[999] max-w-[250px] backdrop-blur-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">{language === 'en' ? 'Risk Level' : 'Tingkat Risiko'}</h3>
            <Badge variant="outline" className="text-xs px-2">{activeFilters.size}/3</Badge>
          </div>

          <div className="space-y-1.5 mb-3">
            <div onClick={() => toggleFilter('high')} className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all duration-300 border ${activeFilters.has('high') ? 'border-destructive/40 bg-destructive/10' : 'opacity-50 hover:opacity-80 hover:bg-muted/30 border-transparent'}`}>
              <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0" style={{ background: 'hsl(var(--destructive))', borderColor: 'hsl(var(--destructive))' }}></div>
              <div><span className="text-sm font-semibold text-foreground block">{language === 'en' ? 'High' : 'Tinggi'} ≥ 65%</span><span className="text-[10px] text-muted-foreground leading-tight">{language === 'en' ? 'Heavy rainfall, high humidity, low pressure' : 'Curah hujan lebat, kelembapan tinggi, tekanan rendah'}</span></div>
            </div>
            <div onClick={() => toggleFilter('medium')} className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all duration-300 border ${activeFilters.has('medium') ? 'border-warning/40 bg-warning/10' : 'opacity-50 hover:opacity-80 hover:bg-muted/30 border-transparent'}`}>
              <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0" style={{ background: 'hsl(var(--warning))', borderColor: 'hsl(var(--warning))' }}></div>
              <div><span className="text-sm font-semibold text-foreground block">{language === 'en' ? 'Medium' : 'Sedang'} 45–64%</span><span className="text-[10px] text-muted-foreground leading-tight">{language === 'en' ? 'Moderate rainfall, monsoon season, wind activity' : 'Curah hujan sedang, musim hujan, aktivitas angin'}</span></div>
            </div>
            <div onClick={() => toggleFilter('low')} className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-all duration-300 border ${activeFilters.has('low') ? 'border-success/40 bg-success/10' : 'opacity-50 hover:opacity-80 hover:bg-muted/30 border-transparent'}`}>
              <div className="w-4 h-4 rounded-full border-2 mt-0.5 shrink-0" style={{ background: 'hsl(var(--success))', borderColor: 'hsl(var(--success))' }}></div>
              <div><span className="text-sm font-semibold text-foreground block">{language === 'en' ? 'Low' : 'Rendah'} &lt; 45%</span><span className="text-[10px] text-muted-foreground leading-tight">{language === 'en' ? 'Low precipitation, stable pressure, dry conditions' : 'Presipitasi rendah, tekanan stabil, kondisi kering'}</span></div>
            </div>
          </div>

          <div className="border-t border-border/30 pt-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{language === 'en' ? 'Risk is calculated from' : 'Risiko dihitung dari'}</p>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5"><span className="text-[10px]">🤖</span><span className="text-[10px] text-muted-foreground">{language === 'en' ? 'TensorFlow.js Flood Prediction NN' : 'Model Prediksi Banjir TensorFlow.js'}</span></div>
              <div className="flex items-center gap-1.5"><span className="text-[10px]">🌦️</span><span className="text-[10px] text-muted-foreground">{language === 'en' ? '10 Live Weather Features (Open-Meteo)' : '10 Fitur Cuaca Langsung (Open-Meteo)'}</span></div>
              <div className="flex items-center gap-1.5"><span className="text-[10px]">📊</span><span className="text-[10px] text-muted-foreground">{language === 'en' ? 'Rainfall, Humidity, Pressure, Wind' : 'Curah Hujan, Kelembapan, Tekanan, Angin'}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* === MOBILE RISK LEGEND (sits above the mode tab bar) === */}
      {overlayMode === 'disaster' && (
        <div className="lg:hidden absolute bottom-24 left-3 z-[999]">
          {!isLegendMobileOpen ? (
            <Button
              className="rounded-full shadow-2xl h-10 px-4 glass-strong bg-card/90 border border-border/40 backdrop-blur-xl flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300"
              onClick={() => setIsLegendMobileOpen(true)}
            >
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-xs font-bold text-foreground">{language === 'en' ? 'Risk Level' : 'Tingkat Risiko'}</span>
            </Button>
          ) : (
            <div className="glass-strong p-3 rounded-xl shadow-2xl border border-border/40 w-[240px] max-w-[calc(100vw-32px)] backdrop-blur-xl bg-card/95 z-[999] animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-bold text-foreground">{language === 'en' ? 'Risk Level' : 'Tingkat Risiko'}</h3>
                  <Badge variant="outline" className="text-[10px] px-1 h-5">{activeFilters.size}/3</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setIsLegendMobileOpen(false)} className="h-6 w-6 p-0 rounded-full bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2 mb-3">
                <div onClick={() => toggleFilter('high')} className={`flex items-start gap-2 p-1.5 rounded-lg cursor-pointer transition-all border ${activeFilters.has('high') ? 'shadow-sm border-destructive/40 bg-destructive/10' : 'opacity-50 border-transparent'}`}>
                  <div className="w-3 h-3 rounded-full border-2 mt-0.5 shrink-0" style={{ background: 'hsl(var(--destructive))', borderColor: 'hsl(var(--destructive))' }}></div>
                  <div><span className="text-xs font-semibold block">{language === 'en' ? 'High' : 'Tinggi'} ≥ 65%</span><span className="text-[9px] text-muted-foreground leading-tight block mt-0.5">{language === 'en' ? 'Heavy rainfall, high humidity, low pressure' : 'Curah hujan lebat, kelembapan tinggi, tekanan rendah'}</span></div>
                </div>
                <div onClick={() => toggleFilter('medium')} className={`flex items-start gap-2 p-1.5 rounded-lg cursor-pointer transition-all border ${activeFilters.has('medium') ? 'shadow-sm border-warning/40 bg-warning/10' : 'opacity-50 border-transparent'}`}>
                  <div className="w-3 h-3 rounded-full border-2 mt-0.5 shrink-0" style={{ background: 'hsl(var(--warning))', borderColor: 'hsl(var(--warning))' }}></div>
                  <div><span className="text-xs font-semibold block">{language === 'en' ? 'Medium' : 'Sedang'} 45–64%</span><span className="text-[9px] text-muted-foreground leading-tight block mt-0.5">{language === 'en' ? 'Moderate rainfall, monsoon season, wind activity' : 'Curah hujan sedang, musim hujan, aktivitas angin'}</span></div>
                </div>
                <div onClick={() => toggleFilter('low')} className={`flex items-start gap-2 p-1.5 rounded-lg cursor-pointer transition-all border ${activeFilters.has('low') ? 'shadow-sm border-success/40 bg-success/10' : 'opacity-50 border-transparent'}`}>
                  <div className="w-3 h-3 rounded-full border-2 mt-0.5 shrink-0" style={{ background: 'hsl(var(--success))', borderColor: 'hsl(var(--success))' }}></div>
                  <div><span className="text-xs font-semibold block">{language === 'en' ? 'Low' : 'Rendah'} &lt; 45%</span><span className="text-[9px] text-muted-foreground leading-tight block mt-0.5">{language === 'en' ? 'Low precipitation, stable pressure, dry conditions' : 'Presipitasi rendah, tekanan stabil, kondisi kering'}</span></div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-2 space-y-1">
                <p className="text-[10px] text-muted-foreground">🤖 TF.js Flood Prediction NN</p>
                <p className="text-[10px] text-muted-foreground">🌦️ 10 Live Weather Features</p>
                <p className="text-[10px] text-muted-foreground">📊 Rainfall · Humidity · Pressure · Wind</p>
              </div>
            </div>
          )}
        </div>
      )}


      {/* Weather/Pollution Legend - sits above the Risk/SOS row on mobile */}
      {overlayMode !== 'disaster' && (
        <div className="absolute bottom-24 lg:bottom-20 left-3 glass-strong p-2 lg:p-3 rounded-xl shadow-elevated border border-border/40 z-[999] max-w-[160px] lg:max-w-[200px] backdrop-blur-xl">
          <h3 className="text-[10px] md:text-xs font-semibold mb-1.5 md:mb-2">
            {overlayMode === 'temperature' ? (language === 'en' ? 'Temperature' : 'Suhu') : (language === 'en' ? 'Air Quality' : 'Kualitas Udara')}
          </h3>
          <div className="space-y-1">
            {overlayMode === 'temperature' ? (
              <>
                <div className="flex items-center gap-1.5 md:gap-2 p-0.5 md:p-1">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full opacity-70 border-2 shadow-sm" style={{ background: 'rgb(168, 85, 247)', borderColor: 'rgb(168, 85, 247)' }}></div>
                  <span className="text-[10px] md:text-xs">{language === 'en' ? 'Cold' : 'Dingin'}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 p-0.5 md:p-1">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full opacity-70 border-2 shadow-sm" style={{ background: 'rgb(251, 146, 60)', borderColor: 'rgb(251, 146, 60)' }}></div>
                  <span className="text-[10px] md:text-xs">{language === 'en' ? 'Mild' : 'Sejuk'}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 p-0.5 md:p-1">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full opacity-70 border-2 shadow-sm" style={{ background: 'rgb(249, 115, 22)', borderColor: 'rgb(249, 115, 22)' }}></div>
                  <span className="text-[10px] md:text-xs">{language === 'en' ? 'Warm' : 'Hangat'}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 p-0.5 md:p-1">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full opacity-70 border-2 shadow-sm" style={{ background: 'rgb(239, 68, 68)', borderColor: 'rgb(239, 68, 68)' }}></div>
                  <span className="text-[10px] md:text-xs">{language === 'en' ? 'Hot' : 'Panas'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 md:gap-2 p-0.5 md:p-1">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full opacity-70 border-2 shadow-sm" style={{ background: 'rgb(34, 197, 94)', borderColor: 'rgb(34, 197, 94)' }}></div>
                  <span className="text-[10px] md:text-xs">{language === 'en' ? 'Good' : 'Baik'}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 p-0.5 md:p-1">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full opacity-70 border-2 shadow-sm" style={{ background: 'rgb(234, 179, 8)', borderColor: 'rgb(234, 179, 8)' }}></div>
                  <span className="text-[10px] md:text-xs">{language === 'en' ? 'Moderate' : 'Sedang'}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 p-0.5 md:p-1">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full opacity-70 border-2 shadow-sm" style={{ background: 'rgb(251, 146, 60)', borderColor: 'rgb(251, 146, 60)' }}></div>
                  <span className="text-[10px] md:text-xs">{language === 'en' ? 'Unhealthy' : 'Tidak Sehat'}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2 p-0.5 md:p-1">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full opacity-70 border-2 shadow-sm" style={{ background: 'rgb(239, 68, 68)', borderColor: 'rgb(239, 68, 68)' }}></div>
                  <span className="text-[10px] md:text-xs">{language === 'en' ? 'Hazardous' : 'Berbahaya'}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Emergency SOS - Mobile adjusted above bottom nav */}
      <div className="absolute bottom-24 lg:bottom-6 right-3 lg:right-6 z-[999] pointer-events-none">
        <div className="glass-strong rounded-2xl p-0.5 lg:p-3 border border-border/30 shadow-lg backdrop-blur-xl pointer-events-auto">
          <EmergencySOS
            userLocation={userLocation}
            nearbyDisasters={nearbyDisasters}
            language={language}
            compact
          />
        </div>
      </div>
    </div>
  );
};

export default HeatmapOverview;
