import { useAuth } from "@/lib/auth";
import {
	createFileRoute,
	Navigate,
	Outlet,
	useLocation,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_onboarding")({
	component: OnboardingLayout,
});

const STEPS = [
	{ path: "/onboarding/setup-mode", label: "Setup" },
	{ path: "/onboarding/local-setup", label: "Local" },
	{ path: "/onboarding/cloud-setup", label: "Cloud" },
	{ path: "/onboarding/tour", label: "Tour" },
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

	// Determine current step index
	const currentPath = location.pathname;
	const currentStepIndex = STEPS.findIndex((s) =>
		currentPath.startsWith(s.path),
	);
	const visibleSteps =
		user?.setup_mode === "local"
			? STEPS.filter((s) => s.path !== "/onboarding/cloud-setup")
			: user?.setup_mode === "cloud"
				? STEPS.filter((s) => s.path !== "/onboarding/local-setup")
				: STEPS.filter(
						(s) => !s.path.includes("-setup") || s.path.includes("setup-mode"),
					);

	return (
		<div className="min-h-screen flex flex-col bg-background">
			<div data-tauri-drag-region className="h-8 shrink-0 cursor-default bg-card" />
			{/* Header with step indicator */}
			<header className="border-b border-border pb-4 px-6 bg-card">
				<div className="max-w-2xl mx-auto">
					<div className="flex items-center justify-between mb-4">
						<h1 className="text-xl font-bold text-primary">Parrot Setup</h1>
						<span className="text-sm text-muted-foreground">{user?.email}</span>
					</div>

					{/* Step indicator */}
					<div className="flex items-center gap-2">
						{visibleSteps.map((step, index) => {
							const stepIndex = STEPS.findIndex((s) => s.path === step.path);
							const isActive = currentPath.startsWith(step.path);
							const isCompleted = stepIndex < currentStepIndex;

							return (
								<div key={step.path} className="flex items-center">
									{index > 0 && (
										<div
											className={`w-8 h-0.5 mx-1 ${
												isCompleted ? "bg-primary" : "bg-border"
											}`}
										/>
									)}
									<div
										className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
											isActive
												? "bg-primary text-primary-foreground"
												: isCompleted
													? "bg-primary/20 text-primary"
													: "bg-secondary text-muted-foreground"
										}`}
									>
										<span
											className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
												isActive
													? "bg-primary-foreground text-primary"
													: isCompleted
														? "bg-primary text-primary-foreground"
														: "bg-muted-foreground/20"
											}`}
										>
											{isCompleted ? "✓" : index + 1}
										</span>
										<span className="hidden sm:inline">{step.label}</span>
									</div>
								</div>
							);
						})}
					</div>
				</div>
			</header>

			{/* Content */}
			<main className="flex-1 flex items-center justify-center p-6">
				<div className="w-full max-w-2xl">
					<Outlet />
				</div>
			</main>
		</div>
	);
}
