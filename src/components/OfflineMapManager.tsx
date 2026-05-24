import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, Trash2, MapPin, HardDrive } from 'lucide-react';
import { toast } from 'sonner';
import {
  downloadRegion,
  getDownloadedRegions,
  deleteRegion,
  getCacheSize,
  clearAllCache,
} from '@/utils/mapTileCache';
import { DEFAULT_REGION } from '@/config/region';

interface OfflineMapManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language?: 'en' | 'id';
}

const OfflineMapManager: React.FC<OfflineMapManagerProps> = ({ open, onOpenChange, language = 'id' }) => {
  const t = {
    en: {
      title: "Offline Maps",
      description: "Download maps for offline access during emergencies",
      storageUsed: "Storage Used",
      clearAll: "Clear All Maps",
      downloading: "Downloading",
      availableRegions: "Available Regions",
      downloaded: "Downloaded",
      zoomLevels: "Zoom levels",
      download: "Download",
      tilesCached: "tiles cached",
      tip: "Downloaded maps will be automatically used when you're offline. Larger regions with higher zoom levels require more storage space.",
      successDownload: "Download complete",
      successDownloadDesc: (name: string) => `${name} is now available offline`,
      errorDownload: "Download failed",
      errorDownloadDesc: "Please try again later",
      successDelete: "Region deleted",
      successDeleteDesc: "Offline map data removed",
      errorDelete: "Delete failed",
      confirmClear: "Delete all offline maps? This cannot be undone.",
      successClear: "All offline maps deleted",
      errorClear: "Clear failed",
      centralJava: "Central Java (Low Detail)",
    },
    id: {
      title: "Peta Offline",
      description: "Unduh peta untuk akses offline selama keadaan darurat",
      storageUsed: "Penyimpanan Terpakai",
      clearAll: "Hapus Semua Peta",
      downloading: "Mengunduh",
      availableRegions: "Wilayah Tersedia",
      downloaded: "Terunduh",
      zoomLevels: "Level zoom",
      download: "Unduh",
      tilesCached: "petak disimpan",
      tip: "Peta yang diunduh akan otomatis digunakan saat Anda offline. Wilayah yang lebih luas dengan tingkat zoom lebih tinggi membutuhkan ruang penyimpanan lebih banyak.",
      successDownload: "Unduh selesai",
      successDownloadDesc: (name: string) => `${name} sekarang tersedia secara offline`,
      errorDownload: "Unduh gagal",
      errorDownloadDesc: "Silakan coba lagi nanti",
      successDelete: "Wilayah dihapus",
      successDeleteDesc: "Data peta offline dihapus",
      errorDelete: "Gagal menghapus",
      confirmClear: "Hapus semua peta offline? Tindakan ini tidak dapat dibatalkan.",
      successClear: "Semua peta offline dihapus",
      errorClear: "Gagal menghapus semua",
      centralJava: "Jawa Tengah (Detail Rendah)",
    }
  };

  const l = t[language];

  const PRESET_REGIONS = [
    {
      name: DEFAULT_REGION.name,
      bounds: DEFAULT_REGION.bounds,
      zoomLevels: DEFAULT_REGION.offlineTiles.zoomLevels,
    },
    {
      name: l.centralJava,
      // Broader but still local-ish footprint.
      bounds: { north: -6.0, south: -8.5, west: 108.0, east: 111.5 },
      zoomLevels: [8, 9, 10],
    },
  ];
  const [downloadedRegions, setDownloadedRegions] = useState<any[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const [cacheSize, setCacheSize] = useState<number>(0);

  useEffect(() => {
    if (open) {
      loadRegions();
      loadCacheSize();
    }
  }, [open]);

  const loadRegions = async () => {
    try {
      const regions = await getDownloadedRegions();
      setDownloadedRegions(regions);
    } catch (error) {
      console.error('Error loading regions:', error);
    }
  };

  const loadCacheSize = async () => {
    try {
      const size = await getCacheSize();
      setCacheSize(size);
    } catch (error) {
      console.error('Error loading cache size:', error);
    }
  };

  const handleDownload = async (region: typeof PRESET_REGIONS[0]) => {
    setDownloading(region.name);
    setDownloadProgress({ current: 0, total: 1 });

    try {
      await downloadRegion({
        name: region.name,
        bounds: region.bounds,
        zoomLevels: region.zoomLevels,
        onProgress: (current, total) => {
          setDownloadProgress({ current, total });
        },
      });

      toast.success(l.successDownload, {
        description: l.successDownloadDesc(region.name),
      });

      await loadRegions();
      await loadCacheSize();
    } catch (error) {
      console.error('Error downloading region:', error);
      toast.error(l.errorDownload, {
        description: l.errorDownloadDesc,
      });
    } finally {
      setDownloading(null);
      setDownloadProgress(null);
    }
  };

  const handleDelete = async (regionName: string) => {
    try {
      await deleteRegion(regionName);
      toast.success(l.successDelete, {
        description: l.successDeleteDesc,
      });
      await loadRegions();
      await loadCacheSize();
    } catch (error) {
      console.error('Error deleting region:', error);
      toast.error(l.errorDelete);
    }
  };

  const handleClearAll = async () => {
    if (!confirm(l.confirmClear)) return;

    try {
      await clearAllCache();
      toast.success(l.successClear);
      await loadRegions();
      await loadCacheSize();
    } catch (error) {
      console.error('Error clearing cache:', error);
      toast.error(l.errorClear);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const isRegionDownloaded = (regionName: string) => {
    return downloadedRegions.some(r => r.name === regionName && r.status === 'completed');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {l.title}
          </DialogTitle>
          <DialogDescription>
            {l.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Storage Info */}
          <Card className="p-4 bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">{l.storageUsed}</span>
              </div>
              <span className="text-sm font-medium">{formatBytes(cacheSize)}</span>
            </div>
            {downloadedRegions.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="w-full mt-2"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {l.clearAll}
              </Button>
            )}
          </Card>

          {/* Download Progress */}
          {downloading && downloadProgress && (
            <Card className="p-4 border-primary/20 bg-primary/5">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">{l.downloading} {downloading}...</span>
                  <span className="text-muted-foreground">
                    {downloadProgress.current} / {downloadProgress.total} tiles
                  </span>
                </div>
                <Progress 
                  value={(downloadProgress.current / downloadProgress.total) * 100} 
                  className="h-2"
                />
              </div>
            </Card>
          )}

          {/* Available Regions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">{l.availableRegions}</h3>
            {PRESET_REGIONS.map((region) => {
              const downloaded = isRegionDownloaded(region.name);
              const isDownloading = downloading === region.name;

              return (
                <Card key={region.name} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{region.name}</h4>
                        {downloaded && (
                          <Badge variant="secondary" className="text-xs">
                            {l.downloaded}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {l.zoomLevels}: {region.zoomLevels.join(', ')}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {downloaded ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(region.name)}
                          disabled={isDownloading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleDownload(region)}
                          disabled={isDownloading || downloading !== null}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          {l.download}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Show region info */}
                  {downloaded && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                      {downloadedRegions.find(r => r.name === region.name)?.tileCount} {l.tilesCached}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>

          {/* Info */}
          <Card className="p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tip:</strong> {l.tip}
            </p>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfflineMapManager;
