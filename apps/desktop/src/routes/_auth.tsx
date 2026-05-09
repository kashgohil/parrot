import { DoodleBackground } from "@/components/doodle-background";
import { useAuth } from "@/lib/auth";
import { Mic, Sparkles, Zap, Shield } from "lucide-react";
import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
});

function AuthLayout() {
	const { isAuthenticated, isLoading } = useAuth();

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-background">
				<div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin-fast" />
			</div>
		);
	}

	if (isAuthenticated) {
		return <Navigate to="/" />;
	}

	return (
		<div className="min-h-screen flex relative">
			<div
				data-tauri-drag-region
				className="absolute inset-x-0 top-0 h-8 cursor-default z-10"
			/>

			{/* Left panel - branding & features */}
			<div className="hidden md:flex w-[45%] bg-[#7cb342] flex-col justify-between p-8 lg:p-10 relative overflow-hidden">
				{/* Background decoration */}
				<div className="absolute -top-32 -right-32 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
				<div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
				<div className="absolute top-1/3 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl" />

				{/* Brand header */}
				<div className="relative z-10">
					<div className="flex items-center gap-3">
						<div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center shadow-lg">
							<img
								src="/parrot-transparent.png"
								alt="Parrot"
								className="w-10 h-10 drop-shadow-md"
							/>
						</div>
						<div>
							<h1 className="text-3xl font-bold text-white tracking-tight">
								Parrot
							</h1>
							<p className="text-white/60 text-sm font-medium">Voice dictation that just works</p>
						</div>
					</div>
				</div>

				{/* Features */}
				<div className="relative z-10 space-y-6">
				<FeatureItem
					icon={<Mic className="w-5 h-5" />}
					title="Your voice, their inbox"
					description="Press a hotkey and dictate. Parrot transcribes what you say and pastes it where your cursor is."
				/>
				<FeatureItem
					icon={<Sparkles className="w-5 h-5" />}
					title="AI cleanup"
					description="Removes filler words, fixes grammar, and applies your custom vocabulary and writing style."
				/>
				<FeatureItem
					icon={<Zap className="w-5 h-5" />}
					title="3x faster than typing"
					description="Works in any app — emails, docs, chat, code editors. Everything runs on your Mac."
				/>
				<FeatureItem
					icon={<Shield className="w-5 h-5" />}
					title="Local-first privacy"
					description="Your audio never leaves your device. Full privacy, no compromise."
				/>
				</div>

				{/* Hotkey hint */}
				<div className="relative z-10">
					<div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/10">
						<kbd className="text-xs font-bold text-white/80">⌘</kbd>
						<kbd className="text-xs font-bold text-white/80">⇧</kbd>
						<kbd className="text-xs font-bold text-white/80">Space</kbd>
						<span className="text-xs text-white/60 ml-1">to start dictating</span>
					</div>
				</div>
			</div>

			{/* Right panel - auth form */}
			<div className="flex-1 flex items-center justify-center bg-background p-6 lg:p-10 relative overflow-hidden">
				<DoodleBackground opacity={0.08} />

				<div className="w-full max-w-sm animate-fade-in-up relative z-10">
					{/* Mobile branding */}
					<div className="flex flex-col items-center text-center mb-8 md:hidden">
						<div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
							<img
								src="/parrot-transparent.png"
								alt="Parrot"
								className="w-10 h-10"
							/>
						</div>
						<h1 className="text-2xl font-bold text-foreground mb-1">Parrot</h1>
						<p className="text-muted-foreground text-sm">
							Voice dictation that just works
						</p>
					</div>
					
					<Outlet />
				</div>
			</div>
		</div>
	);
}

function FeatureItem({
	icon,
	title,
	description,
}: {
	icon: React.ReactNode;
	title: string;
	description: string;
}) {
	return (
		<div className="flex gap-4 items-start">
			<div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 text-white">
				{icon}
			</div>
			<div>
				<h3 className="text-sm font-semibold text-white mb-0.5">
					{title}
				</h3>
				<p className="text-sm text-white/60 leading-relaxed">
					{description}
				</p>
			</div>
		</div>
	);
}
