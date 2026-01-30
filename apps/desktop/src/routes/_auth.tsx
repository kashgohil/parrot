import { DoodleBackground } from "@/components/doodle-background";
import { useAuth } from "@/lib/auth";
import { Mic, SquarePen, CircleCheck, Lock } from "lucide-react";
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

			{/* Left panel — branding & features */}
			<div className="hidden md:flex w-1/2 bg-primary flex-col justify-between p-10 relative overflow-hidden">
				{/* Background decoration */}
				<div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
				<div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/5 rounded-full" />
				<div className="absolute top-1/2 right-10 w-40 h-40 bg-white/5 rounded-full" />

				<div className="relative z-10 flex items-center gap-3">
					<img
						src="/parrot-transparent.png"
						alt="Parrot"
						className="w-12 h-12 drop-shadow-lg"
					/>
					<div className="flex flex-col">
						<h1 className="text-3xl font-bold text-primary-foreground">
							Parrot
						</h1>
						<p className="text-primary-foreground/60 text-sm">
							Voice dictation made simple
						</p>
					</div>
				</div>

				<div className="relative z-10 space-y-8">
					<FeatureItem
						icon={<Mic className="w-5 h-5" />}
						title="Speak, don't type"
						description="Press a hotkey and dictate. Your words are transcribed and pasted instantly."
					/>
					<FeatureItem
						icon={<SquarePen className="w-5 h-5" />}
						title="Smart cleanup"
						description="AI polishes grammar, punctuation, and formatting so your text reads naturally."
					/>
					<FeatureItem
						icon={<CircleCheck className="w-5 h-5" />}
						title="Works everywhere"
						description="Parrot pastes directly into any app -- emails, docs, chat, code editors."
					/>
					<FeatureItem
						icon={<Lock className="w-5 h-5" />}
						title="Private by default"
						description="Your audio is processed and discarded. Transcriptions stay on your machine."
					/>
				</div>

				<p className="relative z-10 text-primary-foreground/40 text-xs">
					Cmd+Shift+Space to start dictating
				</p>
			</div>

			{/* Right panel — auth form */}
			<div className="flex-1 flex items-center justify-center bg-background p-8 relative overflow-hidden">
				{/* Doodle decorations */}
				<DoodleBackground opacity={0.14} />

				<div className="w-full max-w-sm animate-fade-in-up relative z-10">
					{/* Show branding on small screens where left panel is hidden */}
					<div className="flex flex-col items-center text-center mb-8 md:hidden">
						<img
							src="/parrot-transparent.png"
							alt="Parrot"
							className="w-16 h-16 mx-auto mb-4 drop-shadow-lg"
						/>
						<h1 className="text-2xl font-bold text-foreground mb-1">Parrot</h1>
						<p className="text-muted-foreground text-sm">
							Voice dictation made simple
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
			<div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0 text-primary-foreground">
				{icon}
			</div>
			<div>
				<h3 className="text-sm font-semibold text-primary-foreground mb-0.5">
					{title}
				</h3>
				<p className="text-sm text-primary-foreground/60 leading-relaxed">
					{description}
				</p>
			</div>
		</div>
	);
}
