import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WifiOff, Wifi, Download, HardDrive, MapPin } from 'lucide-react';
import { getStorageUsage, getPendingAlerts } from '@/utils/offlineStorage';
import OfflineMapManager from '@/components/OfflineMapManager';
import { toast } from 'sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OfflineIndicatorProps {
  isCollapsed?: boolean;
  language?: 'en' | 'id';
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ isCollapsed = false, language = 'id' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDetails, setShowDetails] = useState(false);
  const [showMapManager, setShowMapManager] = useState(false);
  const [storageInfo, setStorageInfo] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const t = {
    en: {
      connectionRestored: "Connection restored",
      youAreOnline: "You are back online",
      noInternet: "No internet connection",
      workingOffline: "Working in offline mode",
      pendingAlerts: "pending alerts will be sent",
      syncing: "Syncing queued emergency alerts",
      status: "Connection Status",
      connected: "You are connected to the internet",
      offlineMode: "Working in offline mode with cached data",
      statusLabel: "Status",
      pendingTitle: "Pending Emergency Alerts",
      pendingDesc: (count: number, online: boolean) => 
        `${count} alerts in queue.${online ? ' Will be sent automatically.' : ' Will be sent when connection is restored.'}`,
      storageTitle: "Offline Storage",
      used: "Used",
      available: "Available",
      percentageUsed: "used",
      offlineMapsTitle: "Offline Maps",
      offlineMapsDesc: "Download maps for your region to access detailed navigation during emergencies, even without internet.",
      manageMaps: "Manage Offline Maps",
      availableOffline: "Available Offline",
      guidelines: "Emergency guidelines",
      savedDisasters: "Saved disaster information",
      contacts: "Emergency contacts",
      offlineMaps: "Offline maps (if downloaded)",
      weatherData: "Weather data (last cached)",
    },
    id: {
      connectionRestored: "Koneksi dipulihkan",
      youAreOnline: "Anda kembali online",
      noInternet: "Tidak ada koneksi internet",
      workingOffline: "Bekerja dalam mode offline",
      pendingAlerts: "peringatan tertunda akan dikirim",
      syncing: "Menyinkronkan peringatan darurat dalam antrean",
      status: "Status Koneksi",
      connected: "Anda terhubung ke internet",
      offlineMode: "Bekerja dalam mode offline dengan data yang disimpan",
      statusLabel: "Status",
      pendingTitle: "Peringatan Darurat Tertunda",
      pendingDesc: (count: number, online: boolean) => 
        `${count} peringatan dalam antrean.${online ? ' Akan dikirim secara otomatis.' : ' Akan dikirim ketika koneksi dipulihkan.'}`,
      storageTitle: "Penyimpanan Offline",
      used: "Terpakai",
      available: "Tersedia",
      percentageUsed: "terpakai",
      offlineMapsTitle: "Peta Offline",
      offlineMapsDesc: "Unduh peta untuk wilayah Anda untuk mengakses navigasi terperinci selama keadaan darurat, bahkan tanpa internet.",
      manageMaps: "Kelola Peta Offline",
      availableOffline: "Tersedia Secara Offline",
      guidelines: "Panduan darurat",
      savedDisasters: "Informasi bencana yang disimpan",
      contacts: "Kontak darurat",
      offlineMaps: "Peta offline (jika diunduh)",
      weatherData: "Data cuaca (terakhir disimpan)",
    }
  };

  const l = t[language];
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success(l.connectionRestored, {
        description: l.youAreOnline
      });
      checkPendingAlerts();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning(l.noInternet, {
        description: l.workingOffline
      });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    checkPendingAlerts();
    updateStorageInfo();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  const checkPendingAlerts = async () => {
    try {
      const pending = await getPendingAlerts();
      setPendingCount(pending.length);
      if (pending.length > 0 && navigator.onLine) {
        toast.info(`${pending.length} ${l.pendingAlerts}`, {
          description: l.syncing
        });
      }
    } catch (error) {
      console.error('Error checking pending alerts:', error);
    }
  };
  const updateStorageInfo = async () => {
    try {
      const info = await getStorageUsage();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error getting storage info:', error);
    }
  };
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };
  return <>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={isCollapsed ? "icon" : "sm"}
              onClick={() => setShowDetails(true)}
              className={`${isCollapsed ? 'w-full h-10' : 'w-full'} relative hover:bg-primary/10 transition-all duration-200`}
            >
              {isOnline ? (
                <Wifi className={`${isCollapsed ? 'h-4 w-4' : 'h-4 w-4 mr-2'} text-success`} />
              ) : (
                <WifiOff className={`${isCollapsed ? 'h-4 w-4' : 'h-4 w-4 mr-2'} text-warning`} />
              )}
              {!isCollapsed && (
                <span className="font-semibold text-xs">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              )}
              {pendingCount > 0 && !isCollapsed && (
                <Badge variant="secondary" className="ml-auto text-[10px] px-1.5">
                  {pendingCount}
                </Badge>
              )}
              {pendingCount > 0 && isCollapsed && (
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-warning rounded-full border-2 border-background" />
              )}
            </Button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" align="center" sideOffset={8} className="bg-popover/95 backdrop-blur-xl border-border/50">
              <p className="font-semibold text-sm">{isOnline ? 'Online' : 'Offline'}</p>
              {pendingCount > 0 && (
                <p className="text-xs text-muted-foreground">{pendingCount} {language === 'en' ? 'pending' : 'tertunda'}</p>
              )}
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="z-[1000]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-amber-500" />}
              {l.status}
            </DialogTitle>
            <DialogDescription>
              {isOnline ? l.connected : l.offlineMode}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Connection Status */}
            <div className="p-4 rounded-lg bg-muted">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{l.statusLabel}</span>
                <Badge variant={isOnline ? 'default' : 'secondary'}>
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
            </div>

            {/* Pending Alerts */}
            {pendingCount > 0 && <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-4 w-4 text-amber-600" />
                  <span className="font-semibold text-amber-600">
                    {l.pendingTitle}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {l.pendingDesc(pendingCount, isOnline)}
                </p>
              </div>}

            {/* Storage Usage */}
            {storageInfo && <div className="p-4 rounded-lg bg-muted space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="h-4 w-4" />
                  <span className="font-semibold">{l.storageTitle}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{l.used}</span>
                    <span className="font-medium">
                      {formatBytes(storageInfo.usage)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{l.available}</span>
                    <span className="font-medium">
                      {formatBytes(storageInfo.quota)}
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2 mt-2">
                    <div className="bg-primary rounded-full h-2 transition-all" style={{
                  width: `${storageInfo.percentage}%`
                }} />
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {storageInfo.percentage.toFixed(1)}% {l.percentageUsed}
                  </div>
                </div>
              </div>}

            {/* Offline Maps */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">{l.offlineMapsTitle}</h4>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {l.offlineMapsDesc}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowDetails(false);
                  setShowMapManager(true);
                }}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                {l.manageMaps}
              </Button>
            </div>

            {/* Offline Features */}
            <div className="p-4 rounded-lg border">
              <h4 className="font-semibold mb-2">{l.availableOffline}</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>✓ {l.guidelines}</li>
                <li>✓ {l.savedDisasters}</li>
                <li>✓ {l.contacts}</li>
                <li>✓ {l.offlineMaps}</li>
                <li>✓ {l.weatherData}</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <OfflineMapManager open={showMapManager} onOpenChange={setShowMapManager} language={language} />
    </>;
};
export default OfflineIndicator;