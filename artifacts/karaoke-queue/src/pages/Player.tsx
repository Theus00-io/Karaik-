import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  useGetQueue,
  useFinishQueueEntry,
  useSkipQueueEntry,
  usePlayQueueEntry,
  getGetQueueQueryKey,
} from "@workspace/api-client-react";
import type { QueueEntry } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppCtx } from "../contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Play, SkipForward, Check, AlertTriangle, MonitorPlay } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export default function Player() {
  const { activeSession } = useAppCtx();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [countdown, setCountdown] = useState<number | null>(null);
  const [showControls, setShowControls] = useState(true);
  const [playingEntry, setPlayingEntry] = useState<QueueEntry | null>(null);
  const [nextEntry, setNextEntry] = useState<QueueEntry | null>(null);

  const playerRef = useRef<any>(null);
  const mouseMoveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioningRef = useRef(false);
  const playingEntryRef = useRef<QueueEntry | null>(null);
  const nextEntryRef = useRef<QueueEntry | null>(null);

  const sessionId = activeSession?.id || "";

  const { data: queue } = useGetQueue(sessionId, {
    query: {
      enabled: !!sessionId,
      refetchInterval: 2000,
      queryKey: getGetQueueQueryKey(sessionId),
    },
  });

  const invalidateQueue = () =>
    queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey(sessionId) });

  const finishMutation = useFinishQueueEntry({
    mutation: { onSuccess: invalidateQueue },
  });

  const skipMutation = useSkipQueueEntry({
    mutation: { onSuccess: invalidateQueue },
  });

  const playMutation = usePlayQueueEntry({
    mutation: { onSuccess: invalidateQueue },
  });

  // Keep refs in sync so callbacks can access current values without stale closure
  useEffect(() => {
    playingEntryRef.current = playingEntry;
  }, [playingEntry]);

  useEffect(() => {
    nextEntryRef.current = nextEntry;
  }, [nextEntry]);

  // Sync queue data
  useEffect(() => {
    if (!queue) return;
    const playing = queue.find((e) => e.reservation.status === "PLAYING") || null;
    const queued = queue
      .filter((e) => e.reservation.status === "QUEUED")
      .sort((a, b) => a.position - b.position);

    setPlayingEntry(playing);
    setNextEntry(queued[0] || null);

    if (!playing && queued[0] && !isTransitioningRef.current && countdown === null) {
      isTransitioningRef.current = true;
      setCountdown(5);
    }
  }, [queue]); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown ticker
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
      return () => clearTimeout(t);
    } else {
      setCountdown(null);
      const next = nextEntryRef.current;
      if (next) {
        playMutation.mutate({ entryId: next.id });
        isTransitioningRef.current = false;
      }
    }
  }, [countdown]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSkipCountdown = () => {
    setCountdown(null);
    const next = nextEntryRef.current;
    if (next) {
      playMutation.mutate({ entryId: next.id });
      isTransitioningRef.current = false;
    }
  };

  // YouTube IFrame API
  useEffect(() => {
    const initPlayer = () => {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player("yt-player", {
        height: "100%",
        width: "100%",
        playerVars: { autoplay: 1, controls: 1, rel: 0, modestbranding: 1, fs: 0 },
        events: {
          onReady: (event: any) => {
            const current = playingEntryRef.current;
            if (current?.reservation.song.youtubeId) {
              event.target.loadVideoById(current.reservation.song.youtubeId);
            }
          },
          onStateChange: (event: any) => {
            // 0 = ended
            if (event.data === 0) {
              const current = playingEntryRef.current;
              if (current) finishMutation.mutate({ entryId: current.id });
            }
          },
          onError: (event: any) => {
            if ([101, 150, 153].includes(event.data)) {
              toast.error("Erro ao carregar o vídeo. Pulando automaticamente em 2.5s...");
              setTimeout(() => {
                const current = playingEntryRef.current;
                if (current) skipMutation.mutate({ entryId: current.id });
              }, 2500);
            }
          },
        },
      });
    };

    if (window.YT) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (_) {}
        playerRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load video when playingEntry changes
  useEffect(() => {
    if (playerRef.current?.loadVideoById && playingEntry?.reservation.song.youtubeId) {
      playerRef.current.loadVideoById(playingEntry.reservation.song.youtubeId);
    }
  }, [playingEntry?.reservation.song.youtubeId]);

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      if (mouseMoveTimeout.current) clearTimeout(mouseMoveTimeout.current);
      mouseMoveTimeout.current = setTimeout(() => setShowControls(false), 3000);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (mouseMoveTimeout.current) clearTimeout(mouseMoveTimeout.current);
    };
  }, []);

  if (!activeSession) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white flex-col gap-4">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <h2 className="text-2xl font-bold">Nenhuma sessão ativa</h2>
        <Button onClick={() => setLocation("/")} variant="outline">
          Voltar para Início
        </Button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full bg-black overflow-hidden relative"
      style={{ cursor: showControls ? "auto" : "none" }}
    >
      {/* YouTube Player */}
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-1000",
          countdown !== null ? "opacity-0" : "opacity-100"
        )}
      >
        <div id="yt-player" className="w-full h-full" />
      </div>

      {/* Countdown Overlay */}
      {countdown !== null && (
        <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center z-40">
          <div className="relative w-48 h-48 mb-8 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90 absolute inset-0">
              <circle cx="96" cy="96" r="88" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
              <circle
                cx="96"
                cy="96"
                r="88"
                stroke="hsl(var(--primary))"
                strokeWidth="8"
                fill="none"
                strokeDasharray="553"
                strokeDashoffset={553 - (553 * countdown) / 5}
                style={{ transition: "stroke-dashoffset 1s linear" }}
              />
            </svg>
            <span className="text-6xl font-black text-white">{countdown}</span>
          </div>

          {nextEntry ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <p className="text-xl text-primary font-medium mb-2 uppercase tracking-widest">
                Proxima Musica
              </p>
              <h1 className="text-4xl font-black text-white mb-2 leading-tight max-w-4xl px-8">
                {nextEntry.reservation.song.title}
              </h1>
              <p className="text-xl text-white/70 font-light mb-10">
                {nextEntry.reservation.song.channelName}
              </p>

              <div className="flex items-center justify-center gap-4 bg-white/5 rounded-full pl-2 pr-6 py-2 border border-white/10 mx-auto w-fit">
                <img
                  src={nextEntry.reservation.song.thumbnailUrl}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="text-left">
                  <p className="text-sm text-white/50">Cantor(a)</p>
                  <p className="text-lg text-white font-bold">{nextEntry.reservation.participant.name}</p>
                </div>
              </div>
            </div>
          ) : (
            <h1 className="text-3xl font-bold text-white">Preparando proxima musica...</h1>
          )}

          <Button
            size="lg"
            className="mt-10 text-lg px-8 h-14 rounded-full bg-white text-black hover:bg-white/90"
            onClick={handleSkipCountdown}
            data-testid="button-play-now"
          >
            <Play className="w-5 h-5 mr-2 fill-current" />
            Tocar Agora
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!playingEntry && !nextEntry && countdown === null && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-30">
          <MonitorPlay className="w-24 h-24 text-primary/30 mb-6" />
          <h1 className="text-4xl font-bold text-white/50">Fila Encerrada</h1>
          <p className="text-xl text-white/30 mt-4">Aguardando novos cantores...</p>
          <Button
            variant="ghost"
            className="mt-8 text-white/40 hover:text-white/70"
            onClick={() => setLocation("/")}
            data-testid="button-back-home"
          >
            Voltar para Início
          </Button>
        </div>
      )}

      {/* Operator Controls Bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 w-full p-6 flex justify-center items-end transition-all duration-500 z-50",
          showControls ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        )}
      >
        <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl flex items-center gap-4 shadow-2xl">
          <div className="flex flex-col mr-2">
            <span className="text-xs text-white/50 uppercase font-bold tracking-wider">
              Tocando
            </span>
            <span className="text-white font-medium max-w-[220px] truncate text-sm">
              {playingEntry ? playingEntry.reservation.song.title : "Nenhuma musica"}
            </span>
          </div>

          <Button
            variant="outline"
            size="icon"
            className="w-11 h-11 rounded-full border-white/20 bg-white/5 hover:bg-white/10 text-white"
            disabled={!playingEntry || skipMutation.isPending}
            onClick={() => playingEntry && skipMutation.mutate({ entryId: playingEntry.id })}
            data-testid="button-skip"
          >
            <SkipForward className="w-5 h-5" />
          </Button>

          <Button
            className="h-11 px-5 rounded-full bg-primary hover:bg-primary/90 text-white font-bold gap-2"
            disabled={!playingEntry || finishMutation.isPending}
            onClick={() => playingEntry && finishMutation.mutate({ entryId: playingEntry.id })}
            data-testid="button-finish"
          >
            <Check className="w-5 h-5" />
            Concluir
          </Button>

          <Button
            variant="ghost"
            className="ml-2 text-white/50 hover:text-white text-sm"
            onClick={() => setLocation("/")}
            data-testid="button-exit-player"
          >
            Sair
          </Button>
        </div>
      </div>
    </div>
  );
}
