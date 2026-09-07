import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AlertCircle, RotateCcw } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useConfig } from "./hooks/useConfig";
import { useIsMobile } from "./hooks/useIsMobile";
import { AppShell } from "./components/layout/AppShell";
import { LibraryPage } from "./pages/LibraryPage";
import { SourcePage } from "./pages/SourcePage";
import { SettingsPage } from "./pages/SettingsPage";
import { SetupPage } from "./pages/SetupPage";
import { AddPage } from "./pages/AddPage";
import { ErrorsPage } from "./pages/ErrorsPage";

function BackendUnreachable({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <AlertCircle className="size-8 text-destructive" />
        <p className="text-sm font-medium">Cannot reach the backend</p>
        <p className="text-xs text-muted-foreground">
          Try restarting the app, then try again.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="size-3.5" /> Retry
        </Button>
      </div>
    </div>
  );
}

const CONNECTING_RETRIES = 3;
const MAX_AUTO_RETRIES = 10;
const RETRY_INTERVAL_MS = 2000;
const RETRY_BACKOFF_MS = 10_000;

function AppRoutes() {
  const { data: config, isLoading, isError, refetch } = useConfig();
  const [retryCount, setRetryCount] = useState(0);

  const isBackingOff = retryCount >= MAX_AUTO_RETRIES;

  useEffect(() => {
    if (!isError) {
      setRetryCount(0);
      return;
    }
    const interval = setInterval(
      () => {
        setRetryCount((c) => c + 1);
        refetch();
      },
      isBackingOff ? RETRY_BACKOFF_MS : RETRY_INTERVAL_MS
    );
    return () => clearInterval(interval);
  }, [isError, refetch, isBackingOff]);

  const isConnecting = isLoading || (isError && retryCount < CONNECTING_RETRIES);

  if (isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-sm">Connecting...</span>
      </div>
    );
  }

  if (isError) {
    return <BackendUnreachable onRetry={() => { setRetryCount(0); refetch(); }} />;
  }

  const needsSetup = !config?.setup_complete;

  return (
    <Routes>
      <Route path="/setup" element={needsSetup ? <SetupPage /> : <Navigate to="/library" replace />} />
      <Route element={needsSetup ? <Navigate to="/setup" replace /> : <AppShell />}>
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/library/:id" element={<SourcePage />} />
        <Route path="/add" element={<AddPage />} />
        <Route path="/errors" element={<ErrorsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to={needsSetup ? "/setup" : "/library"} replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const isMobile = useIsMobile();

  return (
    <BrowserRouter>
      <TooltipProvider>
        <Toaster
          theme="dark"
          position={isMobile ? "top-center" : "bottom-right"}
          mobileOffset={{ bottom: "calc(var(--bottom-nav-h) + 0.75rem)", left: "0.75rem", right: "0.75rem" }}
          toastOptions={{
            classNames: {
              toast: "bg-popover text-popover-foreground ring-1 ring-foreground/10 rounded-xl border-0",
              title: "text-sm font-medium",
              description: "text-xs text-muted-foreground",
              actionButton: "bg-primary text-primary-foreground hover:bg-primary/80",
            },
          }}
        />
        <AppRoutes />
      </TooltipProvider>
    </BrowserRouter>
  );
}
