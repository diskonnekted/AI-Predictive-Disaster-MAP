import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 space-y-6 backdrop-blur-sm bg-card/50 border-border/50">
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-10 h-10 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold text-foreground">Pasang Siaga Banjarnegara</h1>
          
          {isInstalled ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-green-500">
                <CheckCircle2 className="w-6 h-6" />
                <p className="font-semibold">Aplikasi Berhasil Terpasang!</p>
              </div>
              <p className="text-muted-foreground text-sm">
                Anda sekarang dapat menggunakan Siaga Banjarnegara seperti aplikasi asli, bahkan saat luring (offline).
              </p>
              <Button onClick={() => navigate("/")} className="w-full">
                Buka Aplikasi
              </Button>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Pasang Siaga Banjarnegara di perangkat Anda untuk akses cepat peringatan bencana, asisten AI pendeteksi bahaya, dan fitur luring.
              </p>

              <div className="space-y-3 text-left">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground">Bekerja luring dengan data tersimpan</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground">Akses cepat dari layar utama</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground">Pengalaman aplikasi asli (PWA)</p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-foreground">Dukungan multibahasa dengan fitur terjemahan</p>
                </div>
              </div>

              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="w-5 h-5 mr-2" />
                  Pasang Sekarang
                </Button>
              ) : (
                <div className="space-y-4 pt-2">
                  <p className="text-[11px] text-muted-foreground text-center">
                    Cara pasang di iPhone: Ketuk Bagikan (Share) <span className="font-mono">→</span> Tambahkan ke Layar Utama (Add to Home Screen)
                  </p>
                  <p className="text-[11px] text-muted-foreground text-center">
                    Cara pasang di Android: Ketuk menu (titik tiga) <span className="font-mono">→</span> Instal aplikasi
                  </p>
                  <Button onClick={() => navigate("/")} variant="outline" className="w-full">
                    Lanjut ke Website
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Install;
