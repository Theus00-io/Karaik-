import { QRCodeSVG } from "qrcode.react";
import { Mic2, Settings } from "lucide-react";

function getBaseUrl() {
  return window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, "");
}

export default function QRPage() {
  const base = getBaseUrl();
  const userUrl = base + "/";
  const adminUrl = base + "/operator";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 gap-12">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        KaraoKê Queue
      </h1>

      <div className="flex flex-col md:flex-row gap-10 w-full max-w-3xl">
        {/* Participant card */}
        <div className="flex-1 flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="flex items-center gap-2 text-primary">
            <Mic2 className="w-6 h-6" />
            <span className="text-lg font-semibold">Participante</span>
          </div>
          <div className="rounded-xl overflow-hidden border-4 border-primary/30 bg-white p-2">
            <QRCodeSVG
              value={userUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#1a0030"
              level="M"
            />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              Aponte a câmera para reservar sua música
            </p>
            <p className="text-xs font-mono text-muted-foreground/60 break-all">
              {userUrl}
            </p>
          </div>
        </div>

        {/* Admin card */}
        <div className="flex-1 flex flex-col items-center gap-6 rounded-2xl border border-border bg-card p-8 shadow-xl">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Settings className="w-6 h-6" />
            <span className="text-lg font-semibold">Operador</span>
          </div>
          <div className="rounded-xl overflow-hidden border-4 border-border bg-white p-2">
            <QRCodeSVG
              value={adminUrl}
              size={220}
              bgColor="#ffffff"
              fgColor="#1a0030"
              level="M"
            />
          </div>
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              Acesso ao painel do operador
            </p>
            <p className="text-xs font-mono text-muted-foreground/60 break-all">
              {adminUrl}
            </p>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground/40">
        Esta página é só para o operador — não compartilhe o QR do painel.
      </p>
    </div>
  );
}
