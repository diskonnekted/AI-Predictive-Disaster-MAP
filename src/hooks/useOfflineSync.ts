import { useEffect, useCallback } from 'react';
import {
  getPendingAlerts,
  removePendingAlert,
  cacheDisasters,
  cacheFacilities,
  cacheWeather,
} from '@/utils/offlineStorage';
import { toast } from 'sonner';
import { DisasterEvent, EmergencyFacility, WeatherData } from '@/types';

const GOOGLE_APPS_SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

export const useOfflineSync = () => {
  // Sync pending emergency alerts when online via Google Apps Script (bypasses Supabase Edge Function)
  const syncPendingAlerts = useCallback(async () => {
    if (!navigator.onLine) return;

    const pending = await getPendingAlerts().catch(() => []);

    if (!GOOGLE_APPS_SCRIPT_URL) {
      if (pending.length > 0) {
        console.warn('⚠️ VITE_GOOGLE_APPS_SCRIPT_URL belum dikonfigurasi – tidak dapat menyelaraskan peringatan tertunda');
      }
      return;
    }

    try {
      if (pending.length === 0) return;

      for (const alert of pending) {
        try {
          const payload = alert.payload;
          const contacts = payload.contacts || [];
          const userName = payload.userName || 'Pengguna Siaga Banjarnegara';
          const location = payload.location || {};
          const status = payload.status || '';
          const timestamp = payload.timestamp || new Date().toISOString();
          const nearbyDisastersInfo = payload.nearbyDisasters || [];
          const googleMapsLink = `https://www.google.com/maps?q=${location.lat},${location.lng}`;

          const disasterInfo = nearbyDisastersInfo.length > 0
            ? `<div style="margin-top: 20px; padding: 15px; background-color: #fee; border-left: 4px solid #f44;">
                 <h3 style="margin: 0 0 10px 0; color: #c33;">⚠️ Bencana Terdeteksi di Sekitar:</h3>
                 <ul style="margin: 0; padding-left: 20px;">
                   ${nearbyDisastersInfo.map((d: string) => `<li>${d}</li>`).join('')}
                 </ul>
               </div>`
            : '';

          let allSent = true;

          for (const contact of contacts) {
            try {
              const emailPayload = {
                to: contact.email,
                fromName: 'Peringatan Darurat Siaga Banjarnegara',
                subject: `🚨 PERINGATAN DARURAT dari ${userName}`,
                text: `Status Darurat: ${status}. Lokasi: ${location.lat?.toFixed?.(6) ?? location.lat}, ${location.lng?.toFixed?.(6) ?? location.lng}${location.address ? ` - ${location.address}` : ''}. Peta: ${googleMapsLink}. Waktu: ${new Date(timestamp).toLocaleString('id-ID')}`,
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
                    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                      <div style="background: linear-gradient(135deg, #ef4444 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">🚨 PERINGATAN DARURAT</h1>
                      </div>
                      <div style="background: white; padding: 30px; border: 2px solid #ef4444; border-top: none; border-radius: 0 0 10px 10px;">
                        <p style="font-size: 18px; font-weight: bold; color: #c33; margin-top: 0;">Halo ${contact.name},</p>
                        <p style="font-size: 16px;"><strong>${userName}</strong> telah mengirimkan sinyal darurat melalui aplikasi Siaga Banjarnegara.</p>
                        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                          <h2 style="margin-top: 0; color: #ef4444;">Status Saat Ini:</h2>
                          <p style="font-size: 18px; margin: 10px 0;"><strong>${status}</strong></p>
                          <h3 style="color: #ef4444; margin-top: 20px;">📍 Lokasi:</h3>
                          <p style="margin: 5px 0;">Latitude: ${location.lat}<br>Longitude: ${location.lng}${location.address ? `<br>Alamat: ${location.address}` : ''}</p>
                          <p style="margin: 15px 0;"><a href="${googleMapsLink}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">📍 Lihat di Google Maps</a></p>
                          <p style="color: #666; font-size: 14px; margin-top: 20px;">Waktu: ${new Date(timestamp).toLocaleString('id-ID')}</p>
                        </div>
                        ${disasterInfo}
                        <div style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-top: 20px;">
                          <p style="margin: 0; color: #856404;"><strong>⚠️ Mohon segera merespons</strong><br>Jika Anda dapat membantu, hubungi ${userName} secepat mungkin.</p>
                        </div>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                        <p style="font-size: 12px; color: #999; text-align: center; margin-bottom: 0;">Peringatan ini dikirim secara otomatis via Siaga Banjarnegara - Sistem Informasi Bencana.</p>
                      </div>
                    </body>
                  </html>
                `
              };

              await fetch(GOOGLE_APPS_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(emailPayload),
                redirect: 'follow',
              });
            } catch (emailErr) {
              console.error(`Gagal mengirim email antrian ke ${contact.email}:`, emailErr);
              allSent = false;
            }
          }

          if (allSent) {
            await removePendingAlert(alert.id);
          }
        } catch (error) {
          console.error(`Gagal mengirim peringatan ${alert.id}:`, error);
        }
      }

      const remaining = await getPendingAlerts();
      const sent = pending.length - remaining.length;

      if (sent > 0) {
        toast.success(`${sent} peringatan darurat terkirim`, {
          description: 'Pesan darurat telah berhasil disampaikan ke kontak Anda',
        });
      }
    } catch (error) {
      console.error('Error menyelaraskan peringatan tertunda:', error);
    }
  }, []);

  // Cache data for offline use
  const cacheDataForOffline = useCallback(async (
    disasters?: DisasterEvent[],
    facilities?: EmergencyFacility[],
    weather?: { location: string; data: WeatherData }
  ) => {
    try {
      if (disasters && disasters.length > 0) {
        await cacheDisasters(disasters);
      }
      
      if (facilities && facilities.length > 0) {
        await cacheFacilities(facilities);
      }
      
      if (weather) {
        await cacheWeather(weather.location, weather.data);
      }
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      syncPendingAlerts();
    };

    window.addEventListener('online', handleOnline);

    // Initial sync if online
    if (navigator.onLine) {
      syncPendingAlerts();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncPendingAlerts]);

  return {
    syncPendingAlerts,
    cacheDataForOffline,
    isOnline: navigator.onLine,
  };
};
