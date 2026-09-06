import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AlertCircle, RotateCcw } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useConfig } from "./hooks/useConfig";
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
          Make sure the SpotiStorage backend is running on :8000, then try again.
        </p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="size-3.5" /> Retry
        </Button>
      </div>
    </div>
  );
}

const CONNECTING_RETRIES = 3;

function AppRoutes() {
  const { data: config, isLoading, isError, refetch } = useConfig();
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isError) {
      setRetryCount(0);
      return;
    }
    const interval = setInterval(() => {
      setRetryCount((c) => c + 1);
      refetch();
    }, 2000);
    return () => clearInterval(interval);
  }, [isError, refetch]);

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
  return (
    <BrowserRouter>
      <TooltipProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
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
