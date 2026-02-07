import { DoodleBackground } from "@/components/doodle-background";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { SubscriptionProvider } from "@/lib/subscription";
import {
	createRootRoute,
	Link,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { BookA, CircleCheck, Settings, User, LogOut, Sparkles, History } from "lucide-react";
import { useEffect, useState } from "react";

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
	const { isAuthenticated, isLoading, user, justLoggedIn, clearJustLoggedIn } =
		useAuth();
	const location = useLocation();
	const navigate = useNavigate();
	const [showWelcome, setShowWelcome] = useState(false);

	// Show welcome screen after login
	useEffect(() => {
		if (justLoggedIn && isAuthenticated) {
			setShowWelcome(true);
			const timer = setTimeout(() => {
				setShowWelcome(false);
				clearJustLoggedIn();
			}, 2000);
			return () => clearTimeout(timer);
		}
	}, [justLoggedIn, isAuthenticated, clearJustLoggedIn]);

	// Auth redirect logic — skip while welcome screen is showing
	useEffect(() => {
		if (isLoading || showWelcome) return;

		const isAuthRoute =
			location.pathname.startsWith("/login") ||
			location.pathname.startsWith("/signup");
		const onboardingPaths = [
			"/setup-mode",
			"/cloud-setup",
			"/local-setup",
			"/tour",
		];
		const isOnboardingRoute = onboardingPaths.some((p) =>
			location.pathname.startsWith(p),
		);

		if (!isAuthenticated && !isAuthRoute) {
			navigate({ to: "/login" });
		} else if (
			isAuthenticated &&
			!user?.onboarding_completed &&
			!isOnboardingRoute
		) {
			navigate({ to: "/setup-mode" });
		} else if (
			isAuthenticated &&
			user?.onboarding_completed &&
			(isOnboardingRoute || isAuthRoute)
		) {
			navigate({ to: "/" });
		}
	}, [
		isAuthenticated,
		isLoading,
		user,
		location.pathname,
		navigate,
		showWelcome,
	]);

	// Welcome animation after login
	if (showWelcome) {
		return <WelcomeScreen name={user?.name} />;
	}

	// Check if we should render the full layout or just the outlet
	const isAuthRoute =
		location.pathname.startsWith("/login") ||
		location.pathname.startsWith("/signup");
	const onboardingPaths = [
		"/setup-mode",
		"/cloud-setup",
		"/local-setup",
		"/tour",
	];
	const isOnboardingRoute = onboardingPaths.some((p) =>
		location.pathname.startsWith(p),
	);

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

	return (
		<SubscriptionProvider>
			<AuthenticatedLayout />
		</SubscriptionProvider>
	);
}

function WelcomeScreen({ name }: { name?: string | null }) {
	const [phase, setPhase] = useState<"enter" | "exit">("enter");

	useEffect(() => {
		const timer = setTimeout(() => setPhase("exit"), 1400);
		return () => clearTimeout(timer);
	}, []);

	return (
		<div
			className={`min-h-screen flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
				phase === "exit" ? "opacity-0" : "opacity-100"
			}`}
		>
			<div className="animate-fade-in-up flex flex-col items-center gap-4">
				<div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center animate-welcome-pop">
					<CircleCheck className="w-8 h-8 text-primary animate-welcome-check" />
				</div>
				<div className="text-center">
					<h1 className="text-2xl font-semibold text-foreground">
						{name ? `Welcome back, ${name.split(" ")[0]}` : "Welcome back"}
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Setting things up...
					</p>
				</div>
			</div>
		</div>
	);
}

function AuthenticatedLayout() {
	const { user, logout } = useAuth();
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
		<div className="flex h-screen relative bg-background">
			<div
				data-tauri-drag-region
				className="absolute inset-x-0 top-0 h-8 cursor-default z-10"
			/>

			{/* Left Sidebar */}
			<div className="hidden md:flex md:w-[240px] lg:w-[260px] bg-[#7cb342] flex-col relative overflow-hidden shrink-0">
				{/* Decorative elements */}
				<div className="absolute -top-24 -right-24 w-72 h-72 bg-white/8 rounded-full blur-2xl" />
				<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
				<div className="absolute top-1/3 right-0 w-48 h-48 bg-white/6 rounded-full blur-2xl" />

				{/* Brand header */}
				<div className="relative z-10 p-6 lg:p-7">
					<div className="flex items-center gap-3">
						<div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
							<img
								src="/parrot-transparent.png"
								alt="Parrot"
								className="w-8 h-8 drop-shadow-md"
							/>
						</div>
						<div>
							<h1 className="text-2xl font-bold text-white tracking-tight">
								Parrot
							</h1>
							<p className="text-white/60 text-xs font-medium">Voice dictation that just works</p>
						</div>
					</div>
				</div>

				{/* Navigation */}
				<nav className="relative z-10 flex-1 px-4 py-4">
					<div className="space-y-1">
						<NavLink to="/" icon={History} label="History" />
						<NavLink to="/vocabulary" icon={BookA} label="Vocabulary" />
						<NavLink to="/settings" icon={Settings} label="Settings" />
						<NavLink to="/profile" icon={User} label="Profile" />
					</div>
				</nav>

				{/* User section */}
				<div className="relative z-10 p-4 lg:p-6">
					<div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
						<div className="flex items-center gap-3 mb-3">
							<div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
								<User className="w-4 h-4 text-white" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-white truncate">
									{user?.name || user?.email?.split("@")[0] || "User"}
								</p>
								<p className="text-xs text-white/50 truncate">{user?.email}</p>
							</div>
						</div>
						<button
							onClick={logout}
							className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition-all"
						>
							<LogOut className="w-3.5 h-3.5" />
							Sign out
						</button>
					</div>
				</div>
			</div>

			{/* Main content area */}
			<div className="flex-1 flex flex-col relative overflow-hidden">
				<DoodleBackground opacity={0.06} />
				
				{/* Mobile header */}
				<div
					data-tauri-drag-region
					className="h-8 shrink-0 cursor-default md:hidden"
				/>
				
				{/* Mobile navigation bar */}
				<div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background/80 backdrop-blur-sm relative z-10">
					<div className="flex items-center gap-2">
						<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
							<img
								src="/parrot-transparent.png"
								alt="Parrot"
								className="w-6 h-6"
							/>
						</div>
						<span className="font-bold text-foreground">Parrot</span>
					</div>
				</div>
				
				{/* Mobile tab bar */}
				<div className="md:hidden flex items-center justify-around px-2 py-2 border-b border-border bg-background/80 backdrop-blur-sm relative z-10">
					<MobileNavLink to="/" icon={History} label="History" />
					<MobileNavLink to="/vocabulary" icon={BookA} label="Words" />
					<MobileNavLink to="/settings" icon={Settings} label="Settings" />
					<MobileNavLink to="/profile" icon={User} label="Profile" />
				</div>

				{/* Page content */}
				<main className="flex-1 overflow-y-auto relative z-10">
					<div className="max-w-3xl mx-auto w-full px-5 py-6 lg:py-8">
						<Outlet />
					</div>
				</main>
			</div>

			{/* Status overlays */}
			{status === "recording" && <RecordingOverlay />}
			{status === "transcribing" && (
				<ProcessingOverlay label="Transcribing..." />
			)}
			{status === "cleaning" && <ProcessingOverlay label="Cleaning up..." />}
			{result && (
				<ResultOverlay result={result} onDismiss={() => setResult(null)} />
			)}
			{error && (
				<ErrorOverlay message={error} onDismiss={() => setError(null)} />
			)}
		</div>
	);
}

function NavLink({
	to,
	icon: Icon,
	label,
}: {
	to: string;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
}) {
	const location = useLocation();
	const isActive = location.pathname === to;

	return (
		<Link
			to={to}
			className={`
				flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium no-underline
				transition-all duration-200
				${
					isActive
						? "bg-white/20 text-white shadow-lg shadow-black/5"
						: "text-white/70 hover:text-white hover:bg-white/10"
				}
			`}
		>
			<Icon className={`w-4 h-4 ${isActive ? "text-white" : ""}`} />
			{label}
		</Link>
	);
}

function MobileNavLink({
	to,
	icon: Icon,
	label,
}: {
	to: string;
	icon: React.ComponentType<{ className?: string }>;
	label: string;
}) {
	const location = useLocation();
	const isActive = location.pathname === to;

	return (
		<Link
			to={to}
			className={`
				flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium no-underline
				transition-all duration-200
				${
					isActive
						? "text-primary"
						: "text-muted-foreground hover:text-foreground"
				}
			`}
		>
			<div className={`p-2 rounded-xl transition-colors ${isActive ? "bg-primary/10" : ""}`}>
				<Icon className={`w-4 h-4 ${isActive ? "text-primary" : ""}`} />
			</div>
			{label}
		</Link>
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
		<div className="fixed top-5 right-5 z-[1000] flex items-center gap-2.5 px-[18px] py-2.5 rounded-2xl text-sm font-semibold text-white bg-pk-accent shadow-lg animate-pulse-glow">
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
			<span className="tabular-nums opacity-80">
				{mins}:{secs.toString().padStart(2, "0")}
			</span>
		</div>
	);
}

function ProcessingOverlay({ label }: { label: string }) {
	return (
		<div className="fixed top-5 right-5 z-[1000] flex items-center gap-2.5 px-[18px] py-2.5 rounded-2xl text-sm font-semibold text-white bg-blue-500 shadow-lg">
			<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-fast" />
			<span>{label}</span>
		</div>
	);
}

function ResultOverlay({
	result,
	onDismiss,
}: {
	result: DictationResult;
	onDismiss: () => void;
}) {
	useEffect(() => {
		const timer = setTimeout(onDismiss, 6000);
		return () => clearTimeout(timer);
	}, [onDismiss]);

	const display = result.cleaned_text || result.raw_text;

	return (
		<div
			className="fixed top-5 right-5 z-[1000] bg-card border border-border rounded-2xl px-5 py-4 max-w-[420px] cursor-pointer shadow-xl animate-slide-in-right"
			onClick={onDismiss}
		>
			<div className="flex items-start gap-3">
				<div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
					<Sparkles className="w-4 h-4 text-primary" />
				</div>
				<div className="flex-1 min-w-0">
					<p className="text-sm leading-relaxed text-foreground line-clamp-3">{display}</p>
					{result.pasted ? (
						<Badge className="mt-3 bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">
							Pasted successfully
						</Badge>
					) : (
						<Badge variant="secondary" className="mt-3">
							Copied to clipboard
						</Badge>
					)}
				</div>
			</div>
		</div>
	);
}

function ErrorOverlay({
	message,
	onDismiss,
}: {
	message: string;
	onDismiss: () => void;
}) {
	useEffect(() => {
		const timer = setTimeout(onDismiss, 5000);
		return () => clearTimeout(timer);
	}, [onDismiss]);

	return (
		<div
			className="fixed top-5 right-5 z-[1000] flex items-center gap-3 px-5 py-3 rounded-2xl text-[13px] font-medium text-white bg-red-500 shadow-lg max-w-[400px] cursor-pointer animate-slide-in-right"
			onClick={onDismiss}
		>
			<div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
				<span className="text-sm">!</span>
			</div>
			<span className="flex-1">{message}</span>
		</div>
	);
}
