import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense } from "react";
import { AppProvider } from "./contexts/AppContext";

const Home = lazy(() => import("@/pages/Home"));
const Player = lazy(() => import("@/pages/Player"));
const Operator = lazy(() => import("@/pages/Operator"));
const NotFound = lazy(() => import("@/pages/not-found"));
const QRPage = lazy(() => import("@/pages/QR"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Suspense fallback={<div role="status" className="min-h-screen grid place-items-center text-muted-foreground">Carregando experiência…</div>}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/player" component={Player} />
        <Route path="/operator" component={Operator} />
        <Route path="/qr" component={QRPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster
            position="top-right"
            theme="dark"
            richColors
            closeButton
          />
        </AppProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
