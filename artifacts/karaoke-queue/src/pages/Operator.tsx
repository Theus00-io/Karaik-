import { useState } from "react";
import { useLocation } from "wouter";
import {
  useOperatorLogin,
  useOperatorLogout,
  useCreateSession,
  useUpdateSessionStatus,
  useGetQueue,
  useFinishQueueEntry,
  useSkipQueueEntry,
  useRemoveQueueEntry,
  useGetSessionSummary,
  getGetQueueQueryKey,
  getListSessionsQueryKey,
  getGetActiveSessionQueryKey,
  getGetSessionSummaryQueryKey,
} from "@workspace/api-client-react";
import type { Session } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppCtx } from "../contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Check,
  SkipForward,
  X,
  Loader2,
  Mic2,
  Users,
  Music,
  Plus,
  LogOut,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { maskCPFPartial } from "../lib/cpf";

export default function Operator() {
  const [, setLocation] = useLocation();
  const { activeSession, refetchSession, operator, refetchOperator } = useAppCtx();
  const queryClient = useQueryClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newSessionName, setNewSessionName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data: queue } = useGetQueue(activeSession?.id || "", {
    query: {
      enabled: !!activeSession?.id,
      refetchInterval: 2000,
      queryKey: getGetQueueQueryKey(activeSession?.id || ""),
    },
  });

  const { data: summary } = useGetSessionSummary(activeSession?.id || "", {
    query: {
      enabled: !!activeSession?.id,
      refetchInterval: 5000,
      queryKey: getGetSessionSummaryQueryKey(activeSession?.id || ""),
    },
  });

  const loginMutation = useOperatorLogin({
    mutation: {
      onSuccess: () => {
        refetchOperator();
        toast.success("Login realizado com sucesso");
        setUsername("");
        setPassword("");
      },
      onError: () => toast.error("Credenciais inválidas"),
    },
  });

  const logoutMutation = useOperatorLogout({
    mutation: {
      onSuccess: () => {
        refetchOperator();
        toast.success("Sessão encerrada");
      },
    },
  });

  const createSessionMutation = useCreateSession({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
        refetchSession();
        setNewSessionName("");
        setShowCreateForm(false);
        toast.success("Sessão criada!");
      },
    },
  });

  const updateStatusMutation = useUpdateSessionStatus({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetActiveSessionQueryKey() });
        refetchSession();
      },
    },
  });

  const finishMutation = useFinishQueueEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey(activeSession?.id || "") });
        queryClient.invalidateQueries({
          queryKey: getGetSessionSummaryQueryKey(activeSession?.id || ""),
        });
        toast.success("Música concluída");
      },
    },
  });

  const skipMutation = useSkipQueueEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey(activeSession?.id || "") });
        toast.success("Música pulada");
      },
    },
  });

  const removeMutation = useRemoveQueueEntry({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetQueueQueryKey(activeSession?.id || "") });
        toast.success("Música removida da fila");
      },
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ data: { username, password } });
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;
    createSessionMutation.mutate({ data: { name: newSessionName.trim() } });
  };

  const handleStatusChange = (session: Session, status: "OPEN" | "PAUSED" | "CLOSED") => {
    updateStatusMutation.mutate({ sessionId: session.id, data: { status } });
  };

  // Not logged in
  if (!operator) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mx-auto mb-6">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-center mb-2">Painel do Operador</h1>
            <p className="text-muted-foreground text-center text-sm mb-8">
              Acesso restrito a operadores autorizados
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Usuário
                </label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  data-testid="input-username"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Senha
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  data-testid="input-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 font-bold"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="w-px h-5 bg-border" />
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Mic2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-bold">Painel do Operador</p>
                <p className="text-xs text-muted-foreground leading-none">{operator.displayName}</p>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate({})}
            className="text-muted-foreground gap-1.5"
            data-testid="button-logout"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Summary stats */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Na Fila", value: summary.queued, icon: <Music className="w-4 h-4" />, color: "text-amber-400" },
              { label: "Participantes", value: summary.totalParticipants, icon: <Users className="w-4 h-4" />, color: "text-blue-400" },
              { label: "Concluídas", value: summary.completed, icon: <Check className="w-4 h-4" />, color: "text-green-400" },
              { label: "Puladas", value: summary.skipped + summary.removed, icon: <SkipForward className="w-4 h-4" />, color: "text-orange-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-4">
                <div className={cn("mb-2", s.color)}>{s.icon}</div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Session management */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Sessao
            </h2>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="gap-1.5 h-8"
              data-testid="button-new-session"
            >
              <Plus className="w-3.5 h-3.5" />
              Nova
            </Button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreateSession} className="flex gap-2 mb-4">
              <Input
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder='Ex: "KaraoKê Bar do João — 11/06/2025"'
                className="flex-1"
                data-testid="input-session-name"
              />
              <Button type="submit" disabled={createSessionMutation.isPending} data-testid="button-create-session">
                {createSessionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
              </Button>
            </form>
          )}

          {activeSession ? (
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border">
              <div>
                <p className="font-semibold">{activeSession.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={cn(
                      "text-xs font-bold uppercase px-2 py-0.5 rounded-full",
                      activeSession.status === "OPEN" && "bg-green-500/20 text-green-400",
                      activeSession.status === "PAUSED" && "bg-amber-500/20 text-amber-400",
                      activeSession.status === "CLOSED" && "bg-red-500/20 text-red-400"
                    )}
                  >
                    {activeSession.status === "OPEN" ? "Aberta" : activeSession.status === "PAUSED" ? "Pausada" : "Encerrada"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {activeSession.status === "OPEN" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(activeSession, "PAUSED")}
                    disabled={updateStatusMutation.isPending}
                    className="gap-1.5"
                    data-testid="button-pause-session"
                  >
                    <Pause className="w-3.5 h-3.5" />
                    Pausar
                  </Button>
                )}
                {activeSession.status === "PAUSED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange(activeSession, "OPEN")}
                    disabled={updateStatusMutation.isPending}
                    className="gap-1.5"
                    data-testid="button-resume-session"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Retomar
                  </Button>
                )}
                {(activeSession.status === "OPEN" || activeSession.status === "PAUSED") && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleStatusChange(activeSession, "CLOSED")}
                    disabled={updateStatusMutation.isPending}
                    className="gap-1.5"
                    data-testid="button-close-session"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    Encerrar
                  </Button>
                )}
                {activeSession.status === "OPEN" && (
                  <Button
                    size="sm"
                    onClick={() => setLocation("/player")}
                    className="gap-1.5 bg-primary hover:bg-primary/90"
                    data-testid="button-open-player-op"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Abrir Player
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhuma sessão ativa.</p>
          )}
        </div>

        {/* Queue control */}
        {activeSession && (
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">
              Fila — Controle
            </h2>

            {!queue || queue.length === 0 ? (
              <div className="text-center py-8">
                <Music className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">A fila está vazia</p>
              </div>
            ) : (
              <div className="space-y-2">
                {queue.map((entry) => {
                  const isPlaying = entry.reservation.status === "PLAYING";
                  return (
                    <div
                      key={entry.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                        isPlaying
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-muted/20 hover:bg-muted/30"
                      )}
                      data-testid={`op-queue-entry-${entry.id}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        {isPlaying ? (
                          <Play className="w-3.5 h-3.5 text-primary fill-current" />
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">
                            {entry.position}
                          </span>
                        )}
                      </div>

                      <img
                        src={entry.reservation.song.thumbnailUrl}
                        alt=""
                        className="w-12 h-9 rounded-lg object-cover flex-shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-1">
                          {entry.reservation.song.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.reservation.participant.name} ·{" "}
                          {maskCPFPartial(entry.reservation.participant.cpf)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {isPlaying && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-8 h-8 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            onClick={() => finishMutation.mutate({ entryId: entry.id })}
                            disabled={finishMutation.isPending}
                            title="Concluir"
                            data-testid={`button-finish-${entry.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                          onClick={() => skipMutation.mutate({ entryId: entry.id })}
                          disabled={skipMutation.isPending}
                          title="Pular"
                          data-testid={`button-skip-${entry.id}`}
                        >
                          <SkipForward className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-8 h-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => removeMutation.mutate({ entryId: entry.id })}
                          disabled={removeMutation.isPending}
                          title="Remover"
                          data-testid={`button-remove-${entry.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
