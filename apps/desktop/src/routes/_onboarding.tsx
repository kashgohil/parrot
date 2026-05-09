import { DoodleBackground } from "@/components/doodle-background";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
	createFileRoute,
	Navigate,
	Outlet,
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import { ArrowLeft, Check, User, Settings, BookOpen } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

const SMOOTH = [0.22, 1, 0.36, 1] as const;
const INTRO_HOLD_MS = 1900;
const HIDE_MS = 280;
const MORPH_MS = 600;
const REVEAL_MS = 380;

type Phase = "intro" | "hide" | "morph" | "reveal" | "ready";

// Module-level: splash plays once per app launch.
let splashShownThisLaunch = false;

export const Route = createFileRoute("/_onboarding")({
	component: OnboardingLayout,
});

const ONBOARDING_STEPS = [
	{
		path: "/local-profile",
		label: "Your Profile",
		icon: User,
		description: "Create your profile",
	},
	{
		path: "/local-setup",
		label: "AI Setup",
		icon: Settings,
		description: "Configure AI models",
	},
	{
		path: "/tour",
		label: "Quick Tour",
		icon: BookOpen,
		description: "Learn how to use Parrot",
	},
];

function BackButton() {
	const navigate = useNavigate();
	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={() => navigate({ to: "/local-profile" })}
		>
			<ArrowLeft className="w-4 h-4 mr-2" />
			Back
		</Button>
	);
}

function OnboardingLayout() {
	const { isLoading, user } = useAuth();
	const location = useLocation();
	const [phase, setPhase] = useState<Phase>(
		splashShownThisLaunch ? "ready" : "intro",
	);

	// Measure the real panel's actual width so the overlay can retract to
	// the exact pixel it occupies — no guessing, no jolt possible.
	const panelRef = useRef<HTMLDivElement>(null);
	const [panelPx, setPanelPx] = useState<number>(320);

	useEffect(() => {
		const el = panelRef.current;
		if (!el) return;
		const update = () => setPanelPx(el.offsetWidth);
		update();
		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, []);

	useEffect(() => {
		if (splashShownThisLaunch) return;
		const timers: ReturnType<typeof setTimeout>[] = [];
		timers.push(setTimeout(() => setPhase("hide"), INTRO_HOLD_MS));
		timers.push(
			setTimeout(() => setPhase("morph"), INTRO_HOLD_MS + HIDE_MS),
		);
		// morph → reveal driven by overlay's onAnimationComplete.
		// reveal → ready triggered after REVEAL_MS below.
		return () => timers.forEach(clearTimeout);
	}, []);

	useEffect(() => {
		if (phase !== "reveal") return;
		const t = setTimeout(() => {
			setPhase("ready");
			splashShownThisLaunch = true;
		}, REVEAL_MS);
		return () => clearTimeout(t);
	}, [phase]);

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin-fast" />
			</div>
		);
	}

	if (user?.onboarding_completed) {
		return <Navigate to="/" />;
	}

	const steps = ONBOARDING_STEPS;
	const currentPath = location.pathname;
	const currentStepIndex = steps.findIndex((s) =>
		currentPath.startsWith(s.path),
	);

	const isSplashing = phase !== "ready";
	const showCenteredBrand = phase === "intro" || phase === "hide";
	const isOverlayFullScreen = phase === "intro" || phase === "hide";
	// Content (brand, steps, outlet) starts fading in during reveal.
	const showContent = phase === "reveal" || phase === "ready";

	return (
		<div className="h-screen flex relative overflow-hidden bg-background">
			<div
				data-tauri-drag-region
				className="absolute inset-x-0 top-0 h-8 cursor-default z-50"
			/>

			{/* REAL panel — always at natural width. Never animates layout. */}
			<div
				ref={panelRef}
				className="md:w-[280px] lg:w-[320px] bg-pk-primary relative overflow-hidden shrink-0 flex flex-col justify-between p-6 lg:p-8 z-10"
			>
				{/* Decorative blobs */}
				<div className="absolute -top-24 -right-24 w-72 h-72 bg-white/8 rounded-full blur-2xl pointer-events-none" />
				<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
				<div className="absolute top-1/3 right-0 w-48 h-48 bg-white/6 rounded-full blur-2xl pointer-events-none" />

				{/* Brand header */}
				<motion.div
					initial={false}
					animate={{ opacity: showContent ? 1 : 0 }}
					transition={{ duration: REVEAL_MS / 1000, ease: SMOOTH }}
					className="relative z-10"
				>
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
				</motion.div>

				{/* Step progress list */}
				<motion.div
					initial={false}
					animate={{ opacity: showContent ? 1 : 0 }}
					transition={{
						duration: REVEAL_MS / 1000,
						ease: SMOOTH,
						delay: showContent ? 0.05 : 0,
					}}
					className="relative z-10"
				>
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
												text-sm font-medium block
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
										<span
											className={`text-xs mt-0.5 block ${
												isActive ? "text-white/60" : "text-transparent"
											}`}
										>
											{step.description}
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</motion.div>
			</div>

			{/* RIGHT side — Outlet. Always rendered, opacity gated by phase. */}
			<div className="flex-1 bg-background relative overflow-x-hidden overflow-y-auto">
				<DoodleBackground opacity={0.06} />

				{currentPath.startsWith("/local-setup") && (
					<motion.div
						initial={false}
						animate={{ opacity: showContent ? 1 : 0 }}
						transition={{
							duration: REVEAL_MS / 1000,
							ease: SMOOTH,
							delay: showContent ? 0.1 : 0,
						}}
						className="absolute top-6 left-6 lg:top-10 lg:left-10 z-20"
					>
						<BackButton />
					</motion.div>
				)}

				<motion.div
					initial={false}
					animate={{ opacity: showContent ? 1 : 0 }}
					transition={{
						duration: REVEAL_MS / 1000,
						ease: SMOOTH,
						delay: showContent ? 0.1 : 0,
					}}
					className="min-h-full flex items-center justify-center p-6 lg:p-10"
				>
					<div className="w-full max-w-md relative z-10 py-8">
						<Outlet />
					</div>
				</motion.div>
			</div>

			{/* SPLASH OVERLAY — covers everything during intro/hide, retracts to
			    panel width during morph, fades out during reveal. The real panel
			    underneath never changes size, so there's nothing to flicker. */}
			{isSplashing && (
				<motion.div
					initial={false}
					animate={{
						width: isOverlayFullScreen ? "100vw" : panelPx,
						opacity: phase === "reveal" ? 0 : 1,
					}}
					transition={{
						width: { duration: MORPH_MS / 1000, ease: SMOOTH },
						opacity: { duration: REVEAL_MS / 1000, ease: SMOOTH },
					}}
					onAnimationComplete={(latest) => {
						// width animation finishing → enter reveal (overlay starts fading).
						if (
							phase === "morph" &&
							typeof latest === "object" &&
							"width" in latest
						) {
							setPhase("reveal");
						}
					}}
					className="absolute inset-y-0 left-0 bg-pk-primary overflow-hidden z-30 pointer-events-none"
				>
					{/* Decorative blobs — match the real panel so the handoff is
					    visually identical when the overlay reaches panel width. */}
					<div className="absolute -top-24 -right-24 w-72 h-72 bg-white/8 rounded-full blur-2xl" />
					<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
					<div className="absolute top-1/3 right-0 w-48 h-48 bg-white/6 rounded-full blur-2xl" />

					{/* Centered intro brand */}
					<AnimatePresence>
						{showCenteredBrand && (
							<motion.div
								key="intro-brand"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{
									opacity: 0,
									transition: { duration: HIDE_MS / 1000, ease: SMOOTH },
								}}
								transition={{ duration: 0.4, ease: SMOOTH }}
								className="absolute inset-0 flex flex-col items-center justify-center"
							>
								<motion.div
									initial={{ opacity: 0, y: 18, scale: 0.92 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									transition={{ duration: 0.6, ease: SMOOTH, delay: 0.1 }}
									className="w-24 h-24 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-black/10 border border-white/10"
								>
									<img
										src="/parrot-transparent.png"
										alt="Parrot"
										className="w-16 h-16 drop-shadow-lg"
									/>
								</motion.div>
								<motion.h1
									initial={{ opacity: 0, y: 18 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.6, ease: SMOOTH, delay: 0.32 }}
									className="text-5xl font-bold text-white tracking-tight mt-6 whitespace-nowrap"
								>
									Parrot
								</motion.h1>
								<motion.p
									initial={{ opacity: 0, y: 14 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.6, ease: SMOOTH, delay: 0.7 }}
									className="text-white/70 text-base font-medium mt-3 tracking-wide whitespace-nowrap"
								>
									Private voice dictation. Runs entirely on your Mac.
								</motion.p>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			)}
		</div>
	);
}
