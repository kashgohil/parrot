import { createRootRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";

export const Route = createRootRoute({
  component: RootLayout,
});

type AppStatus = "idle" | "recording" | "transcribing" | "cleaning";

interface DictationResult {
  raw_text: string;
  cleaned_text: string;
  pasted: boolean;
}

function RootLayout() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Auth redirect logic
  useEffect(() => {
    if (isLoading) return;

    const isAuthRoute = location.pathname.startsWith("/login") || location.pathname.startsWith("/signup");
    const onboardingPaths = ["/setup-mode", "/cloud-setup", "/local-setup", "/tour"];
    const isOnboardingRoute = onboardingPaths.some(p => location.pathname.startsWith(p));

    if (!isAuthenticated && !isAuthRoute) {
      navigate({ to: "/login" });
    } else if (isAuthenticated && !user?.onboarding_completed && !isOnboardingRoute) {
      navigate({ to: "/setup-mode" });
    }
  }, [isAuthenticated, isLoading, user, location.pathname, navigate]);

  // Check if we should render the full layout or just the outlet
  const isAuthRoute = location.pathname.startsWith("/login") || location.pathname.startsWith("/signup");
  const onboardingPaths = ["/setup-mode", "/cloud-setup", "/local-setup", "/tour"];
  const isOnboardingRoute = onboardingPaths.some(p => location.pathname.startsWith(p));

  // For auth and onboarding routes, just render the outlet (they have their own layouts)
  if (isAuthRoute || isOnboardingRoute) {
    return <Outlet />;
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin-fast" />
      </div>
    );
  }

  // If not authenticated, don't render the main layout
  if (!isAuthenticated) {
    return null;
  }

  return <AuthenticatedLayout />;
}

function AuthenticatedLayout() {
  const [status, setStatus] = useState<AppStatus>("idle");
  const [result, setResult] = useState<DictationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubs = [
      listen("recording-started", () => {
        setStatus("recording");
        setResult(null);
        setError(null);
      }),
      listen<number>("recording-stopped", async () => {
        setStatus("transcribing");
        try {
          const res = await invoke<DictationResult>("transcribe_last");
          setResult(res);
        } catch (e) {
          setError(String(e));
        }
        setStatus("idle");
      }),
      listen("cleanup-started", () => {
        setStatus("cleaning");
      }),
    ];
    return () => {
      unsubs.forEach((p) => p.then((f) => f()));
    };
  }, []);

  return (
    <div className="flex h-screen">
      <nav className="w-[200px] bg-secondary border-r border-border flex flex-col pt-8 pb-4 shrink-0">
        <div data-tauri-drag-region className="px-5 pb-4 border-b border-border mb-2 cursor-default">
          <h1 className="text-xl font-bold text-primary">Parrot</h1>
        </div>
        <div className="flex flex-col gap-0.5 px-2">
          <Link
            to="/"
            className="block px-3 py-2.5 text-muted-foreground no-underline rounded-md text-sm transition-colors hover:bg-card hover:text-foreground [&.active]:bg-card [&.active]:text-primary [&.active]:font-semibold"
            activeProps={{ className: "active" }}
          >
            History
          </Link>
          <Link
            to="/settings"
            className="block px-3 py-2.5 text-muted-foreground no-underline rounded-md text-sm transition-colors hover:bg-card hover:text-foreground [&.active]:bg-card [&.active]:text-primary [&.active]:font-semibold"
            activeProps={{ className: "active" }}
          >
            Settings
          </Link>
          <Link
            to="/profile"
            className="block px-3 py-2.5 text-muted-foreground no-underline rounded-md text-sm transition-colors hover:bg-card hover:text-foreground [&.active]:bg-card [&.active]:text-primary [&.active]:font-semibold"
            activeProps={{ className: "active" }}
          >
            Profile
          </Link>
        </div>
      </nav>
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div data-tauri-drag-region className="h-8 shrink-0 cursor-default" />
        <div className="flex-1 px-6 pb-6">
          <Outlet />
        </div>
      </main>
      {status === "recording" && <RecordingOverlay />}
      {status === "transcribing" && <ProcessingOverlay label="Transcribing..." />}
      {status === "cleaning" && <ProcessingOverlay label="Cleaning up..." />}
      {result && <ResultOverlay result={result} onDismiss={() => setResult(null)} />}
      {error && <ErrorOverlay message={error} onDismiss={() => setError(null)} />}
    </div>
  );
}

function RecordingOverlay() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="fixed top-5 right-5 z-[1000] flex items-center gap-2.5 px-[18px] py-2.5 rounded-3xl text-sm font-semibold text-white bg-pk-accent/90 shadow-[0_4px_20px_rgba(255,112,67,0.4)] animate-pulse-glow">
      <div className="w-2.5 h-2.5 bg-white rounded-full animate-blink" />
      <div className="flex items-center gap-0.5 h-[18px]">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="w-[3px] h-1.5 bg-white rounded-sm animate-waveform"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
      <span>Recording</span>
      <span className="tabular-nums opacity-80">{mins}:{secs.toString().padStart(2, "0")}</span>
    </div>
  );
}

function ProcessingOverlay({ label }: { label: string }) {
  return (
    <div className="fixed top-5 right-5 z-[1000] flex items-center gap-2.5 px-[18px] py-2.5 rounded-3xl text-sm font-semibold text-white bg-blue-500/90 shadow-[0_4px_20px_rgba(59,130,246,0.4)]">
      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-fast" />
      <span>{label}</span>
    </div>
  );
}

function ResultOverlay({ result, onDismiss }: { result: DictationResult; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const display = result.cleaned_text || result.raw_text;

  return (
    <div
      className="fixed top-5 right-5 z-[1000] bg-card border border-border rounded-xl px-[18px] py-3.5 max-w-[400px] cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.12)]"
      onClick={onDismiss}
    >
      <p className="text-sm leading-relaxed text-foreground">{display}</p>
      {result.pasted ? (
        <Badge className="mt-2 bg-pk-badge-green/20 text-pk-badge-green border-pk-badge-green/30">Pasted</Badge>
      ) : (
        <Badge variant="secondary" className="mt-2">Copied to clipboard</Badge>
      )}
    </div>
  );
}

function ErrorOverlay({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className="fixed top-5 right-5 z-[1000] flex items-center gap-2.5 px-[18px] py-2.5 rounded-3xl text-[13px] font-normal text-white bg-red-500/90 max-w-[400px] cursor-pointer"
      onClick={onDismiss}
    >
      <span>{message}</span>
    </div>
  );
}
