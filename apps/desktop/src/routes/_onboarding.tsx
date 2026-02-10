import { DoodleBackground } from "@/components/doodle-background";
import { useAuth } from "@/lib/auth";
import {
	createFileRoute,
	Navigate,
	Outlet,
	useLocation,
} from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_onboarding")({
	component: OnboardingLayout,
});

const STEPS = [
	{ path: "/setup-mode", label: "Setup Mode" },
	{ path: "/local-profile", label: "Your Profile" },
	{ path: "/local-setup", label: "Local Setup" },
	{ path: "/cloud-setup", label: "Cloud Setup" },
	{ path: "/tour", label: "Quick Tour" },
];

function OnboardingLayout() {
	const { isAuthenticated, isLoading, user } = useAuth();
	const location = useLocation();
	const [setupMode, setSetupMode] = useState<string | null>(null);
	const [isCheckingMode, setIsCheckingMode] = useState(true);

	// Check setup mode
	useEffect(() => {
		const checkMode = async () => {
			try {
				const mode = await invoke<string | null>("get_setting", { key: "setup_mode" });
				setSetupMode(mode);
			} catch {
				setSetupMode(null);
			} finally {
				setIsCheckingMode(false);
			}
		};
		checkMode();
	}, []);

	if (isLoading || isCheckingMode) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin-fast" />
			</div>
		);
	}

	// For cloud mode, require authentication
	if (setupMode === "cloud" && !isAuthenticated) {
		return <Navigate to="/login" />;
	}

	// For local mode or no mode selected yet, allow without auth
	// (local mode doesn't require login)

	if (user?.onboarding_completed) {
		return <Navigate to="/" />;
	}

	const currentPath = location.pathname;
	const currentStepIndex = STEPS.findIndex((s) =>
		currentPath.startsWith(s.path),
	);
	const visibleSteps =
		setupMode === "local"
			? STEPS.filter((s) => s.path !== "/cloud-setup")
			: setupMode === "cloud"
			? STEPS.filter((s) => s.path !== "/local-setup" && s.path !== "/local-profile")
			: STEPS.filter(
					(s) => !s.path.includes("-setup") || s.path.includes("setup-mode"),
			  );

	return (
		<div className="h-screen flex relative overflow-hidden bg-background">
			<div
				data-tauri-drag-region
				className="absolute inset-x-0 top-0 h-8 cursor-default z-10"
			/>

			{/* Left panel — branding & progress */}
			<div className="hidden md:flex md:w-[260px] lg:w-[300px] bg-[#7cb342] flex-col justify-between p-6 lg:p-8 relative overflow-hidden shrink-0">
				{/* Background decoration */}
				<div className="absolute -top-24 -right-24 w-72 h-72 bg-white/8 rounded-full blur-2xl" />
				<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
				<div className="absolute top-1/3 right-0 w-48 h-48 bg-white/6 rounded-full blur-2xl" />

				{/* Brand header */}
				<div className="relative z-10">
					<div className="flex items-center gap-3">
						<div className="w-12 h-12 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
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
							<p className="text-white/60 text-xs font-medium">Setup</p>
						</div>
					</div>
				</div>

				{/* Step progress */}
				<div className="relative z-10">
					<p className="text-white/50 text-sm mb-6 font-medium">
						Let's get you set up
					</p>
					<div className="space-y-2">
						{visibleSteps.map((step, idx) => {
							const stepIndex = STEPS.findIndex((s) => s.path === step.path);
							const isActive = currentPath.startsWith(step.path);
							const isCompleted = stepIndex < currentStepIndex;

							return (
								<div key={step.path} className="flex items-center gap-3">
									<div
										className={`
											w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
											transition-all duration-200
											${
												isActive
													? "bg-white text-[#7cb342] shadow-lg"
													: isCompleted
													? "bg-white/25 text-white"
													: "bg-white/10 text-white/40"
											}
										`}
									>
										{isCompleted ? (
											<Check className="w-4 h-4" strokeWidth={2.5} />
										) : (
											idx + 1
										)}
									</div>
									<span
										className={`
											text-sm font-medium transition-colors
											${
												isActive
													? "text-white"
													: isCompleted
													? "text-white/70"
													: "text-white/40"
											}
										`}
									>
										{step.label}
									</span>
								</div>
							);
						})}
					</div>
				</div>

				{/* User info or local mode indicator */}
				<div className="relative z-10">
					<div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-xl">
						<div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
							<Sparkles className="w-3 h-3 text-white" />
						</div>
						<p className="text-white/60 text-xs truncate">
							{user?.email || (setupMode === "local" ? "Local Mode" : "Setting up...")}
						</p>
					</div>
				</div>
			</div>

			{/* Right panel — onboarding content */}
			<div className="flex-1 bg-background relative overflow-x-hidden overflow-y-auto">
				<DoodleBackground opacity={0.06} />

				<div className="min-h-full flex items-center justify-center p-6 lg:p-10">
					<div className="w-full max-w-md animate-fade-in-up relative z-10 py-8">
						{/* Mobile-only branding + progress */}
						<div className="flex flex-col items-center text-center mb-8 md:hidden">
							<div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
								<img
									src="/parrot-transparent.png"
									alt="Parrot"
									className="w-10 h-10"
								/>
							</div>
							<h1 className="text-xl font-bold text-foreground mb-4">
								Parrot Setup
							</h1>
							{/* Mobile step dots */}
							<div className="flex items-center gap-2">
								{visibleSteps.map((step) => {
									const stepIndex = STEPS.findIndex(
										(s) => s.path === step.path,
									);
									const isActive = currentPath.startsWith(step.path);
									const isCompleted = stepIndex < currentStepIndex;

									return (
										<div
											key={step.path}
											className={`h-2 rounded-full transition-all ${
												isActive
													? "w-6 bg-primary"
													: isCompleted
													? "w-2 bg-primary/50"
													: "w-2 bg-border"
											}`}
										/>
									);
								})}
							</div>
						</div>
						<Outlet />
					</div>
				</div>
			</div>
		</div>
	);
}
