import { DoodleBackground } from "@/components/doodle-background";
import { useAuth } from "@/lib/auth";
import {
	createFileRoute,
	Navigate,
	Outlet,
	useLocation,
} from "@tanstack/react-router";
import { Check, User, Settings, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_onboarding")({
	component: OnboardingLayout,
});

// Steps for Local mode
const LOCAL_STEPS = [
	{ path: "/local-profile", label: "Your Profile", icon: User, description: "Create your local profile" },
	{ path: "/local-setup", label: "Local Setup", icon: Settings, description: "Configure local AI models" },
	{ path: "/tour", label: "Quick Tour", icon: BookOpen, description: "Learn how to use Parrot" },
];

// Steps for Cloud mode
const CLOUD_STEPS = [
	{ path: "/setup-mode", label: "Choose Plan", icon: Settings, description: "Select your subscription" },
	{ path: "/cloud-setup", label: "Cloud Setup", icon: Settings, description: "Configure API keys" },
	{ path: "/tour", label: "Quick Tour", icon: BookOpen, description: "Learn how to use Parrot" },
];

function OnboardingLayout() {
	const { isAuthenticated, isLoading, user, setupMode } = useAuth();
	const location = useLocation();

	if (isLoading) {
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

	// Determine which steps to show based on mode
	const steps = setupMode === "local" ? LOCAL_STEPS : CLOUD_STEPS;
	const currentPath = location.pathname;
	const currentStepIndex = steps.findIndex((s) =>
		currentPath.startsWith(s.path),
	);

	// Get current step info
	const currentStep = steps[currentStepIndex];
	const StepIcon = currentStep?.icon || User;

	return (
		<div className="h-screen flex relative overflow-hidden bg-background">
			<div
				data-tauri-drag-region
				className="absolute inset-x-0 top-0 h-8 cursor-default z-10"
			/>

			{/* Left panel — branding & progress */}
			<div className="hidden md:flex md:w-[280px] lg:w-[320px] bg-pk-primary flex-col justify-between p-6 lg:p-8 relative overflow-hidden shrink-0">
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
					<div className="space-y-3">
						{steps.map((step, idx) => {
							const isActive = currentPath.startsWith(step.path);
							const isCompleted = idx < currentStepIndex;

							return (
								<div key={step.path} className="flex items-start gap-3">
									<div
										className={`
											w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold shrink-0
											transition-all duration-200 mt-0.5
											${
												isActive
													? "bg-white text-pk-primary shadow-lg"
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
									<div className="flex-1 min-w-0">
										<span
											className={`
												text-sm font-medium transition-colors block
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
										{isActive && (
											<span className="text-xs text-white/60 mt-0.5 block">
												{step.description}
											</span>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Current step indicator */}
				<div className="relative z-10">
					<div className="px-3 py-3 bg-white/10 rounded-xl border border-white/10">
						<div className="flex items-center gap-2">
							<div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
								<StepIcon className="w-4 h-4 text-white" />
							</div>
							<div className="flex-1 min-w-0">
								<p className="text-white/60 text-xs">Current Step</p>
								<p className="text-white text-sm font-medium truncate">
									{currentStep?.label || "Getting started"}
								</p>
							</div>
						</div>
						{currentStep && (
							<p className="text-white/50 text-xs mt-2 pt-2 border-t border-white/10">
								Step {currentStepIndex + 1} of {steps.length}
							</p>
						)}
					</div>
				</div>
			</div>

			{/* Right panel — onboarding content */}
			<div className="flex-1 bg-background relative overflow-x-hidden overflow-y-auto">
				<DoodleBackground opacity={0.06} />

				<div className="min-h-full flex items-center justify-center p-6 lg:p-10">
					<div className="w-full max-w-md relative z-10 py-8">
						{/* Mobile-only branding + progress */}
						<div className="flex flex-col items-center text-center mb-8 md:hidden">
							<div className="w-14 h-14 rounded-2xl bg-pk-primary flex items-center justify-center mb-3">
								<img
									src="/parrot-transparent.png"
									alt="Parrot"
									className="w-10 h-10"
								/>
							</div>
							<h1 className="text-xl font-bold text-foreground mb-2">
								Parrot Setup
							</h1>
							{currentStep && (
								<p className="text-muted-foreground text-sm mb-4">
									Step {currentStepIndex + 1} of {steps.length}: {currentStep.label}
								</p>
							)}
							{/* Mobile step dots */}
							<div className="flex items-center gap-2">
								{steps.map((step, idx) => {
									const isActive = currentPath.startsWith(step.path);
									const isCompleted = idx < currentStepIndex;

									return (
										<div
											key={step.path}
											className={`h-2 rounded-full transition-all ${
												isActive
													? "w-6 bg-pk-primary"
													: isCompleted
													? "w-2 bg-pk-primary/50"
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
