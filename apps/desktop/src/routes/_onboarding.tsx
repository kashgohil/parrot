import { DoodleBackground } from "@/components/doodle-background";
import { useAuth } from "@/lib/auth";
import {
	createFileRoute,
	Navigate,
	Outlet,
	useLocation,
} from "@tanstack/react-router";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_onboarding")({
	component: OnboardingLayout,
});

const STEPS = [
	{ path: "/setup-mode", label: "Setup Mode" },
	{ path: "/local-setup", label: "Local Setup" },
	{ path: "/cloud-setup", label: "Cloud Setup" },
	{ path: "/tour", label: "Quick Tour" },
];

function OnboardingLayout() {
	const { isAuthenticated, isLoading, user } = useAuth();
	const location = useLocation();

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin-fast" />
			</div>
		);
	}

	if (!isAuthenticated) {
		return <Navigate to="/login" />;
	}

	if (user?.onboarding_completed) {
		return <Navigate to="/" />;
	}

	const currentPath = location.pathname;
	const currentStepIndex = STEPS.findIndex((s) =>
		currentPath.startsWith(s.path),
	);
	const visibleSteps =
		user?.setup_mode === "local"
			? STEPS.filter((s) => s.path !== "/cloud-setup")
			: user?.setup_mode === "cloud"
			? STEPS.filter((s) => s.path !== "/local-setup")
			: STEPS.filter(
					(s) => !s.path.includes("-setup") || s.path.includes("setup-mode"),
			  );

	return (
		<div className="h-screen flex relative overflow-hidden">
			<div
				data-tauri-drag-region
				className="absolute inset-x-0 top-0 h-8 cursor-default z-10"
			/>

			{/* Left panel — branding & progress */}
			<div className="hidden md:flex md:w-[220px] lg:w-[280px] xl:w-[340px] 2xl:w-[400px] bg-primary flex-col justify-between p-6 lg:p-8 xl:p-10 relative overflow-hidden shrink-0">
				{/* Background decoration */}
				<div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
				<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full" />
				<div className="absolute top-1/2 right-10 w-40 h-40 bg-white/5 rounded-full" />

				<div className="relative z-10">
					<div className="flex items-center gap-3 mb-2">
						<img
							src="/parrot-transparent.png"
							alt="Parrot"
							className="w-12 h-12 drop-shadow-lg"
						/>
						<h1 className="text-2xl font-bold text-primary-foreground">
							Parrot
						</h1>
					</div>
				</div>

				{/* Step progress */}
				<div className="relative z-10 space-y-3">
					<p className="text-primary-foreground/60 text-sm mb-12">
						Let's get you set up
					</p>
					{visibleSteps.map((step, index) => {
						const stepIndex = STEPS.findIndex((s) => s.path === step.path);
						const isActive = currentPath.startsWith(step.path);
						const isCompleted = stepIndex < currentStepIndex;

						return (
							<div key={step.path} className="flex items-center gap-4">
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 transition-colors ${
										isActive
											? "bg-primary-foreground text-primary"
											: isCompleted
											? "bg-white/25 text-primary-foreground"
											: "bg-white/10 text-primary-foreground/40"
									}`}
								>
									{isCompleted ? (
										<Check className="w-4 h-4" strokeWidth={2.5} />
									) : (
										index + 1
									)}
								</div>
								<span
									className={`text-sm font-medium transition-colors ${
										isActive
											? "text-primary-foreground"
											: isCompleted
											? "text-primary-foreground/70"
											: "text-primary-foreground/40"
									}`}
								>
									{step.label}
								</span>
							</div>
						);
					})}
				</div>

				<p className="relative z-10 text-primary-foreground/40 text-xs">
					{user?.email}
				</p>
			</div>

			{/* Right panel — onboarding content */}
			<div className="flex-1 bg-background relative overflow-x-hidden overflow-y-auto">
				<DoodleBackground opacity={0.1} />

				<div className="min-h-full flex items-center justify-center p-6 lg:p-8 xl:p-10">
					<div className="w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl animate-fade-in-up relative z-10 py-8">
						{/* Mobile-only branding + progress */}
						<div className="flex flex-col items-center text-center mb-8 md:hidden">
							<img
								src="/parrot-transparent.png"
								alt="Parrot"
								className="w-14 h-14 mx-auto mb-3 drop-shadow-lg"
							/>
							<h1 className="text-xl font-bold text-foreground mb-3">
								Parrot Setup
							</h1>
							{/* Mobile step dots */}
							<div className="flex items-center gap-2">
								{visibleSteps.map((step, index) => {
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
