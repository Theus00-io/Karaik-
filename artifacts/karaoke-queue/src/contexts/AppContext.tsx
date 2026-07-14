import { createContext, useContext, ReactNode } from "react";
import { useGetOperatorMe, useGetActiveSession } from "@workspace/api-client-react";
import type { OperatorSession, Session } from "@workspace/api-client-react";

interface AppContextType {
  operator: OperatorSession | null | undefined;
  isLoadingOperator: boolean;
  activeSession: Session | null | undefined;
  isLoadingSession: boolean;
  refetchOperator: () => void;
  refetchSession: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const { data: operator, isLoading: isLoadingOperator, refetch: refetchOperator } = useGetOperatorMe({
    query: { retry: false, queryKey: ["getOperatorMe"] }
  });

  const { data: activeSession, isLoading: isLoadingSession, refetch: refetchSession } = useGetActiveSession({
    query: { retry: false, queryKey: ["getActiveSession"] }
  });

  return (
    <AppContext.Provider value={{
      operator: operator || null,
      isLoadingOperator,
      activeSession: activeSession || null,
      isLoadingSession,
      refetchOperator,
      refetchSession
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppCtx() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppCtx must be used within an AppProvider");
  }
  return context;
}
