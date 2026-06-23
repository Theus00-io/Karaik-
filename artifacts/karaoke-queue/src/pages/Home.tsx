import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import {
  useGetQueue,
  useCreateReservation,
  useSearchSongs,
  useGetReservationsByCpf,
  getGetQueueQueryKey,
  getGetReservationsByCpfQueryKey,
} from "@workspace/api-client-react";
import type { SongSearchResult } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppCtx } from "../contexts/AppContext";
import { formatCPF, unmaskCPF, maskCPFPartial, validateCPF } from "../lib/cpf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Music,
  Search,
  Mic2,
  Clock,
  CheckCircle2,
  SkipForward,
  X,
  ChevronRight,
  Loader2,
  Play,
  Settings,
  ExternalLink,
  EyeOff,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

function YouTubePreviewModal({
  song,
  onClose,
  onSelect,
}: {
  song: SongSearchResult;
  onClose: () => void;
  onSelect: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors"
          data-testid="button-close-preview"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Embed */}
        <div className="aspect-video bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${song.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
            title={song.title}
          />
        </div>

        {/* Info + actions */}
        <div className="p-4 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold leading-snug line-clamp-2">{song.title}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{song.channelName}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <a
              href={`https://www.youtube.com/watch?v=${song.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 px-3 rounded-lg hover:bg-muted/50"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              YouTube
            </a>
            <Button
              onClick={onSelect}
              className="bg-primary hover:bg-primary/90 gap-1.5"
              data-testid="button-select-from-preview"
            >
              <Mic2 className="w-4 h-4" />
              Escolher
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  QUEUED: { label: "Na fila", icon: <Clock className="w-3.5 h-3.5" />, color: "text-amber-400" },
  PLAYING: { label: "Tocando", icon: <Play className="w-3.5 h-3.5 fill-current" />, color: "text-green-400" },
  FINISHED: { label: "Concluída", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-indigo-400" },
  SKIPPED: { label: "Pulada", icon: <SkipForward className="w-3.5 h-3.5" />, color: "text-orange-400" },
  REMOVED: { label: "Removida", icon: <X className="w-3.5 h-3.5" />, color: "text-red-400" },
};

export default function Home() {
  const [, setLocation] = useLocation();
  const { activeSession, refetchSession } = useAppCtx();
  const queryClient = useQueryClient();

  // Form state
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState<SongSearchResult | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showExtrato, setShowExtrato] = useState(false);
  const [previewSong, setPreviewSong] = useState<SongSearchResult | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const hiddenKey = activeSession?.id && unmaskCPF(cpf).length === 11
    ? `extratoHidden:${activeSession.id}:${unmaskCPF(cpf)}`
    : null;

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(() => {
    if (!hiddenKey) return new Set();
    try {
      const raw = localStorage.getItem(hiddenKey);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (!hiddenKey) return;
    try {
      localStorage.setItem(hiddenKey, JSON.stringify([...hiddenIds]));
    } catch { /* ignore */ }
  }, [hiddenIds, hiddenKey]);

  const toggleHideEntry = (id: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const debouncedSearch = useDebounce(searchQuery, 500);
  const unmaskCpf = unmaskCPF(cpf);
  const isValidCpf = validateCPF(unmaskCpf);

  const { data: queue, isLoading: isLoadingQueue } = useGetQueue(
    activeSession?.id || "",
    {
      query: {
        enabled: !!activeSession?.id,
        refetchInterval: 3000,
        queryKey: getGetQueueQueryKey(activeSession?.id || ""),
      },
    }
  );

  const { data: searchResults, isLoading: isSearching } = useSearchSongs(
    { q: debouncedSearch },
    {
      query: {
        enabled: debouncedSearch.length >= 2,
        queryKey: [`search-songs-${debouncedSearch}`],
      },
    }
  );

  const { data: extrato } = useGetReservationsByCpf(
    activeSession?.id || "",
    unmaskCpf,
    {
      query: {
        enabled: !!(activeSession?.id && isValidCpf && showExtrato),
        refetchInterval: 3000,
        queryKey: getGetReservationsByCpfQueryKey(activeSession?.id || "", unmaskCpf),
      },
    }
  );

  const createReservation = useCreateReservation({
    mutation: {
      onSuccess: (data) => {
        toast.success(`Reserva confirmada! Posição #${data.position}`);
        setSelectedSong(null);
        setSearchQuery("");
        setShowExtrato(true);
        queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey(activeSession?.id || "") });
        queryClient.invalidateQueries({
          queryKey: getGetReservationsByCpfQueryKey(activeSession?.id || "", unmaskCpf),
        });
      },
      onError: (err: unknown) => {
        const msg =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          "Erro ao reservar. Tente novamente.";
        toast.error(msg);
      },
    },
  });

  const handleReserve = () => {
    if (!activeSession) return toast.error("Nenhuma sessão ativa.");
    if (!isValidCpf) return toast.error("CPF inválido.");
    if (!name.trim()) return toast.error("Digite seu nome.");
    if (!selectedSong) return toast.error("Selecione uma música.");

    createReservation.mutate({
      sessionId: activeSession.id,
      data: {
        cpf: unmaskCpf,
        name: name.trim(),
        youtubeId: selectedSong.youtubeId,
        title: selectedSong.title,
        channelName: selectedSong.channelName,
        thumbnailUrl: selectedSong.thumbnailUrl,
      },
    });
  };

  // Close search on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const playingEntry = queue?.find((e) => e.reservation.status === "PLAYING");
  const queuedEntries = queue?.filter((e) => e.reservation.status === "QUEUED") || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30">
              <Mic2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground">KaraoKê Queue</h1>
              {activeSession && (
                <p className="text-xs text-muted-foreground leading-none">{activeSession.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeSession?.status === "OPEN" && playingEntry && (
              <Button
                size="sm"
                onClick={() => setLocation("/player")}
                className="gap-1.5 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                data-testid="button-open-player"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Player
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/operator")}
              className="w-9 h-9 text-muted-foreground hover:text-foreground"
              data-testid="button-operator-panel"
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* No active session banner */}
      {!activeSession && (
        <div className="max-w-6xl mx-auto px-4 pt-8">
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Mic2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Nenhuma sessão ativa</h2>
            <p className="text-muted-foreground mb-6">
              O operador ainda não abriu uma sessão de karaokê.
            </p>
            <Button onClick={() => setLocation("/operator")} variant="outline">
              Painel do Operador
            </Button>
          </div>
        </div>
      )}

      {activeSession && (
        <div className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Reservation Form */}
          <div className="space-y-5">
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
                Reservar Música
              </h2>

              <div className="space-y-3">
                {/* CPF */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    CPF
                  </label>
                  <Input
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => {
                      const formatted = formatCPF(e.target.value);
                      if (unmaskCPF(formatted).length <= 11) setCpf(formatted);
                    }}
                    className={`bg-card border-border focus-visible:ring-primary/50 font-mono ${unmaskCpf.length === 11 && !isValidCpf ? "border-destructive focus-visible:ring-destructive/50" : ""}`}
                    data-testid="input-cpf"
                  />
                  {unmaskCpf.length === 11 && !isValidCpf && (
                    <p className="text-xs text-destructive mt-1">CPF inválido.</p>
                  )}
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Nome
                  </label>
                  <Input
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-card border-border focus-visible:ring-primary/50"
                    data-testid="input-name"
                  />
                </div>

                {/* Song Search */}
                <div ref={searchRef} className="relative">
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Buscar Música
                  </label>
                  {selectedSong ? (
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-primary/40">
                      <button
                        onClick={() => setPreviewSong(selectedSong)}
                        className="relative group flex-shrink-0"
                        title="Pré-visualizar"
                        data-testid="button-preview-selected"
                      >
                        <img
                          src={selectedSong.thumbnailUrl}
                          alt=""
                          className="w-14 h-10 rounded-lg object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-5 h-5 text-white fill-white" />
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight line-clamp-1">
                          {selectedSong.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {selectedSong.channelName}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedSong(null)}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0 p-1"
                        data-testid="button-clear-song"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Buscar título ou artista..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setShowSearchResults(true);
                          }}
                          onFocus={() => setShowSearchResults(true)}
                          className="pl-9 bg-card border-border focus-visible:ring-primary/50"
                          data-testid="input-search-song"
                        />
                        {isSearching && (
                          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                        )}
                      </div>

                      {showSearchResults && searchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border border-border bg-card shadow-2xl max-h-72 overflow-y-auto">
                          {searchResults.map((song) => (
                            <div
                              key={song.youtubeId}
                              className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-border last:border-0 group"
                              data-testid={`song-result-${song.youtubeId}`}
                            >
                              {/* Thumbnail with play-preview overlay */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewSong(song);
                                }}
                                className="relative flex-shrink-0"
                                title="Pré-visualizar"
                                data-testid={`button-preview-${song.youtubeId}`}
                              >
                                <img
                                  src={song.thumbnailUrl}
                                  alt=""
                                  className="w-16 h-11 rounded-lg object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/55 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                                    <Play className="w-3.5 h-3.5 text-black fill-black ml-0.5" />
                                  </div>
                                </div>
                              </button>

                              {/* Title + channel — click to select */}
                              <button
                                onClick={() => {
                                  setSelectedSong(song);
                                  setShowSearchResults(false);
                                  setSearchQuery("");
                                }}
                                className="flex-1 min-w-0 text-left"
                              >
                                <p className="text-sm font-medium line-clamp-1">{song.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {song.channelName}
                                </p>
                              </button>

                              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <Button
                  onClick={handleReserve}
                  disabled={createReservation.isPending || !isValidCpf || !name.trim() || !selectedSong}
                  className="w-full h-12 text-base font-bold rounded-xl bg-primary hover:bg-primary/90"
                  data-testid="button-reserve"
                >
                  {createReservation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Mic2 className="w-5 h-5 mr-2" />
                      Reservar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Extrato */}
            {isValidCpf && (
              <div>
                <button
                  onClick={() => setShowExtrato(!showExtrato)}
                  className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground uppercase tracking-widest mb-3 transition-colors"
                  data-testid="button-toggle-extrato"
                >
                  <Music className="w-4 h-4" />
                  Meu Extrato
                  <ChevronRight
                    className={cn("w-4 h-4 transition-transform", showExtrato && "rotate-90")}
                  />
                </button>

                {showExtrato && extrato && (
                  <div className="space-y-2">
                    {extrato.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        Nenhuma reserva nesta sessão.
                      </p>
                    ) : (
                      <>
                        {extrato
                          .filter((r) => showHidden || !hiddenIds.has(r.id))
                          .map((r) => {
                            const s = STATUS_LABELS[r.status];
                            const isHidden = hiddenIds.has(r.id);
                            return (
                              <div
                                key={r.id}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-xl bg-card border border-border group transition-opacity",
                                  isHidden && "opacity-40"
                                )}
                                data-testid={`extrato-item-${r.id}`}
                              >
                                <img
                                  src={r.song.thumbnailUrl}
                                  alt=""
                                  className="w-12 h-9 rounded-lg object-cover flex-shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className={cn("text-sm font-medium line-clamp-1", isHidden && "line-through text-muted-foreground")}>
                                    {r.song.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{r.song.channelName}</p>
                                </div>
                                {!isHidden && (
                                  <span
                                    className={cn(
                                      "flex items-center gap-1 text-xs font-medium",
                                      s?.color
                                    )}
                                  >
                                    {s?.icon}
                                    {s?.label}
                                  </span>
                                )}
                                <button
                                  onClick={() => toggleHideEntry(r.id)}
                                  className="ml-1 p-1 rounded-lg text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                                  title={isHidden ? "Mostrar no extrato" : "Ocultar do extrato"}
                                >
                                  {isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            );
                          })}

                        {/* Hidden items footer */}
                        {hiddenIds.size > 0 && (
                          <button
                            onClick={() => setShowHidden((v) => !v)}
                            className="w-full text-xs text-muted-foreground/60 hover:text-muted-foreground py-1.5 flex items-center justify-center gap-1.5 transition-colors"
                          >
                            {showHidden ? (
                              <><EyeOff className="w-3 h-3" /> Esconder {hiddenIds.size} {hiddenIds.size === 1 ? "oculta" : "ocultas"}</>
                            ) : (
                              <><Eye className="w-3 h-3" /> {hiddenIds.size} {hiddenIds.size === 1 ? "música oculta" : "músicas ocultas"}</>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: Live Queue */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
              Fila ao Vivo
              {queue && (
                <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">
                  ({queuedEntries.length} aguardando)
                </span>
              )}
            </h2>

            {isLoadingQueue ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !queue || queue.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-10 text-center">
                <Music className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">A fila está vazia.</p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Seja o primeiro a cantar!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Playing now */}
                {playingEntry && (
                  <div
                    className="relative overflow-hidden rounded-2xl border border-primary/40 bg-primary/5 p-3 flex items-center gap-3"
                    data-testid={`queue-playing-${playingEntry.id}`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                    <img
                      src={playingEntry.reservation.song.thumbnailUrl}
                      alt=""
                      className="w-14 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-primary uppercase tracking-wider">
                          Tocando Agora
                        </span>
                      </div>
                      <p className="text-sm font-bold leading-tight line-clamp-1">
                        {playingEntry.reservation.song.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {playingEntry.reservation.participant.name} ·{" "}
                        {maskCPFPartial(playingEntry.reservation.participant.cpf)}
                      </p>
                    </div>
                    {/* Animated bars */}
                    <div className="flex items-end gap-0.5 h-6 flex-shrink-0 mr-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-1 bg-primary rounded-full animate-bounce"
                          style={{
                            height: `${50 + i * 20}%`,
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Queued entries */}
                {queuedEntries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-border/80 transition-colors"
                    data-testid={`queue-entry-${entry.id}`}
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-sm font-bold text-muted-foreground">
                        {entry.position}
                      </span>
                    </div>
                    <img
                      src={entry.reservation.song.thumbnailUrl}
                      alt=""
                      className="w-14 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight line-clamp-1">
                        {entry.reservation.song.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {entry.reservation.participant.name} ·{" "}
                        {maskCPFPartial(entry.reservation.participant.cpf)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* YouTube Preview Modal */}
      {previewSong && (
        <YouTubePreviewModal
          song={previewSong}
          onClose={() => setPreviewSong(null)}
          onSelect={() => {
            setSelectedSong(previewSong);
            setShowSearchResults(false);
            setSearchQuery("");
            setPreviewSong(null);
          }}
        />
      )}
    </div>
  );
}
