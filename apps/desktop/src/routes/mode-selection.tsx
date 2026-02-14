import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import {
	ArrowRight,
	Check,
	Cloud,
	HardDrive,
	Shield,
	WifiOff,
	Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export const Route = createFileRoute("/mode-selection")({
	component: ModeSelectionPage,
});

const PARROT_GREEN = "#7cb342";

const MODES = [
	{
		id: "local" as const,
		name: "Local Mode",
		headline: "Your Mac. Your Keys. Zero Cloud.",
		description:
			"Process everything locally on your machine. No account, no subscriptions, no data ever leaves your device.",
		icon: HardDrive,
		badge: "Free Forever",
		features: [
			{ icon: WifiOff, text: "Works 100% offline" },
			{ icon: Shield, text: "Maximum privacy" },
			{ icon: Zap, text: "No subscription fees" },
		],
		setupTime: "2 min setup",
	},
	{
		id: "cloud" as const,
		name: "Cloud Mode",
		headline: "Sync Everywhere. Effortless.",
		description:
			"Access your dictation history across all devices. Higher accuracy models. Managed for you.",
		icon: Cloud,
		badge: "From $5/mo",
		features: [
			{ icon: Cloud, text: "Sync across devices" },
			{ icon: Zap, text: "Higher accuracy" },
			{ icon: Shield, text: "Cloud backup" },
		],
		setupTime: "See pricing →",
	},
] as const;

type ModeId = (typeof MODES)[number]["id"];

function ModeSelectionPage() {
	const navigate = useNavigate();
	const { refreshUser } = useAuth();
	const [selected, setSelected] = useState<ModeId | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isHovering, setIsHovering] = useState<ModeId | null>(null);

	const handleContinue = async () => {
		if (!selected) {
			console.log("No mode selected");
			return;
		}

		console.log("Continue clicked, selected mode:", selected);
		setIsSubmitting(true);
		
		try {
			// Save the mode preference
			console.log("Saving setup_mode setting...");
			await invoke("set_setting", { key: "setup_mode", value: selected });
			console.log("Setting saved successfully");

			// Refresh auth context to update setupMode state
			console.log("Refreshing user state...");
			await refreshUser();
			console.log("User state refreshed");

			if (selected === "local") {
				console.log("Navigating to local-profile...");
				navigate({ to: "/local-profile" });
			} else {
				console.log("Navigating to setup-mode...");
				navigate({ to: "/setup-mode" });
			}
		} catch (err) {
			console.error("Failed to save mode:", err);
			alert("Error: " + (err instanceof Error ? err.message : String(err)));
		} finally {
			setIsSubmitting(false);
		}
	};

	const selectedMode = MODES.find((m) => m.id === selected);

	return (
		<div className="h-screen flex relative overflow-hidden bg-background">
			<div
				data-tauri-drag-region
				className="absolute inset-x-0 top-0 h-8 cursor-default z-10"
			/>

			{/* Left panel — animated gradient */}
			<div
				className="hidden lg:flex lg:w-[320px] xl:w-[380px] flex-col justify-between p-8 xl:p-10 relative overflow-hidden shrink-0"
				style={{ backgroundColor: PARROT_GREEN }}
			>
				{/* Animated background blobs */}
				<motion.div
					className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl"
					animate={{
						x: [0, 30, 0],
						y: [0, -20, 0],
					}}
					transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
				/>
				<motion.div
					className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-white/5 rounded-full blur-3xl"
					animate={{
						x: [0, -20, 0],
						y: [0, 30, 0],
					}}
					transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
				/>
				<motion.div
					className="absolute top-1/2 right-0 w-64 h-64 bg-white/8 rounded-full blur-2xl"
					animate={{
						x: [0, 20, 0],
						scale: [1, 1.1, 1],
					}}
					transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
				/>

				{/* Brand header */}
				<div className="relative z-10">
					<div className="flex items-center gap-4">
						<div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-xl border border-white/10">
							<img
								src="/parrot-transparent.png"
								alt="Parrot"
								className="w-9 h-9 drop-shadow-lg"
							/>
						</div>
						<div>
							<h1 className="text-3xl font-bold text-white tracking-tight">
								Parrot
							</h1>
							<p className="text-white/50 text-sm font-medium">
								Voice dictation, perfected
							</p>
						</div>
					</div>
				</div>

				{/* Dynamic content based on selection */}
				<div className="relative z-10 flex-1 flex flex-col justify-center">
					<AnimatePresence mode="wait">
						{selectedMode ? (
							<motion.div
								key={selectedMode.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: -20 }}
								transition={{ duration: 0.3 }}
								className="space-y-6"
							>
								<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-white/20 text-white border border-white/30">
									<selectedMode.icon className="w-4 h-4" />
									{selectedMode.name} Selected
								</div>
								<h2 className="text-2xl xl:text-3xl font-bold text-white leading-tight">
									{selectedMode.headline}
								</h2>
								<p className="text-white/70 text-base leading-relaxed">
									{selectedMode.description}
								</p>
							</motion.div>
						) : (
							<motion.div
								key="default"
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="space-y-6"
							>
								<div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-white/10 text-white/80 border border-white/10">
									<span className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
									Choose your experience
								</div>
								<h2 className="text-2xl xl:text-3xl font-bold text-white leading-tight">
									How do you want to use Parrot?
								</h2>
								<p className="text-white/60 text-base leading-relaxed">
									Select the mode that fits your workflow. You can always change
									this later in settings.
								</p>
							</motion.div>
						)}
					</AnimatePresence>
				</div>

				{/* Bottom hint */}
				<div className="relative z-10">
					<div className="px-4 py-3 bg-white/10 rounded-2xl border border-white/5">
						<p className="text-white/80 text-sm font-medium">Not sure?</p>
						<p className="text-white/50 text-xs">
							Try Local first, upgrade anytime
						</p>
					</div>
				</div>
			</div>

			{/* Right panel — mode selection cards */}
			<div className="flex-1 bg-background relative overflow-x-hidden overflow-y-auto">
				<div className="min-h-full flex items-center justify-center p-6 lg:p-10">
					<div className="w-full max-w-2xl animate-fade-in-up relative z-10 py-8">
						{/* Mobile branding */}
						<div className="flex flex-col items-center text-center mb-10 lg:hidden">
							<div
								className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg"
								style={{ backgroundColor: PARROT_GREEN }}
							>
								<img
									src="/parrot-transparent.png"
									alt="Parrot"
									className="w-10 h-10"
								/>
							</div>
							<h1 className="text-2xl font-bold text-foreground mb-2">
								Welcome to Parrot
							</h1>
							<p className="text-muted-foreground max-w-sm">
								Choose how you want to use voice dictation
							</p>
						</div>

						<div className="space-y-6">
							{/* Mode cards */}
							<div className="grid md:grid-cols-2 gap-4">
								{MODES.map((mode) => {
									const Icon = mode.icon;
									const isSelected = selected === mode.id;
									const isHovered = isHovering === mode.id;

									return (
										<motion.button
											key={mode.id}
											type="button"
											onClick={() => {
												console.log("Selected mode:", mode.id);
												setSelected(mode.id);
											}}
											onMouseEnter={() => setIsHovering(mode.id)}
											onMouseLeave={() => setIsHovering(null)}
											whileHover={{ scale: 1.02 }}
											whileTap={{ scale: 0.98 }}
											className={`relative text-left rounded-2xl border-2 p-6 transition-all duration-300 ${
												isSelected
													? "border-pk-primary bg-pk-primary/10 shadow-xl shadow-pk-primary/10"
													: "border-border bg-card hover:border-pk-primary/50 hover:shadow-lg"
											}`}
										>
											{/* Selection indicator */}
											<motion.div
												className={`absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center ${
													isSelected
														? "bg-pk-primary"
														: "bg-muted border-2 border-muted-foreground/20"
												}`}
												animate={{
													scale: isSelected ? 1 : isHovered ? 1.1 : 1,
												}}
											>
												{isSelected && (
													<Check
														className="w-3.5 h-3.5 text-white"
														strokeWidth={3}
													/>
												)}
											</motion.div>

											{/* Badge */}
											<div
												className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 bg-pk-primary text-white"
											>
												{mode.badge}
											</div>

											{/* Icon */}
											<div
												className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-colors ${
													isSelected
														? "bg-pk-primary text-white"
														: "bg-pk-primary/15 text-pk-primary"
												}`}
											>
												<Icon className="w-7 h-7" />
											</div>

											{/* Content */}
											<h3 className="text-xl font-bold text-foreground mb-2">
												{mode.name}
											</h3>
											<p className="text-sm text-muted-foreground mb-4 leading-relaxed">
												{mode.description}
											</p>

											{/* Features */}
											<ul className="space-y-2.5">
												{mode.features.map((feature, i) => (
													<li
														key={i}
														className="flex items-center gap-3 text-sm"
													>
														<feature.icon
															className={`w-4 h-4 ${
																isSelected
																	? "text-pk-primary"
																	: "text-muted-foreground"
															}`}
														/>
														<span className="text-foreground/80">
															{feature.text}
														</span>
													</li>
												))}
											</ul>

											{/* Setup time hint */}
											<div
												className={`mt-5 pt-4 border-t text-xs font-medium ${
													isSelected
														? "border-pk-primary/30 text-[#5a8a2e]"
														: "border-border text-muted-foreground"
												}`}
											>
												{mode.setupTime}
											</div>
										</motion.button>
									);
								})}
							</div>

							{/* Continue button */}
							<motion.div
								className="flex justify-center pt-6"
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
							>
								<Button
									size="lg"
									onClick={handleContinue}
									disabled={!selected || isSubmitting}
									className="px-10 h-12 text-base font-semibold transition-all"
									style={{
										backgroundColor: selected ? PARROT_GREEN : undefined,
									}}
									onMouseEnter={(e) => {
										if (selected) {
											e.currentTarget.style.backgroundColor = "#6a9a38";
										}
									}}
									onMouseLeave={(e) => {
										if (selected) {
											e.currentTarget.style.backgroundColor = PARROT_GREEN;
										}
									}}
								>
									{isSubmitting ? (
										<span className="flex items-center gap-2">
											<motion.div
												className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
												animate={{ rotate: 360 }}
												transition={{
													duration: 1,
													repeat: Infinity,
													ease: "linear",
												}}
											/>
											Setting up...
										</span>
									) : (
										<span className="flex items-center gap-2">
											Continue with{" "}
											{selected === "local"
												? "Local"
												: selected === "cloud"
													? "Cloud"
													: ""}
											<ArrowRight className="w-4 h-4" />
										</span>
									)}
								</Button>
							</motion.div>

							<p className="text-center text-xs text-muted-foreground pt-2">
								You can switch modes anytime in Settings
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
