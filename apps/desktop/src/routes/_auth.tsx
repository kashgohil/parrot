import { useAuth } from "@/lib/auth";
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
			<div data-tauri-drag-region className="absolute inset-x-0 top-0 h-8 cursor-default z-10" />

			{/* Left panel — branding & features */}
			<div className="hidden md:flex w-1/2 bg-primary flex-col justify-between p-10 relative overflow-hidden">
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
					<p className="text-primary-foreground/60 text-sm">
						Voice dictation made simple
					</p>
				</div>

				<div className="relative z-10 space-y-8">
					<FeatureItem
						icon={
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
								<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
								<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
								<line x1="12" x2="12" y1="19" y2="22" />
							</svg>
						}
						title="Speak, don't type"
						description="Press a hotkey and dictate. Your words are transcribed and pasted instantly."
					/>
					<FeatureItem
						icon={
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
								<path d="M12 20h9" />
								<path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
							</svg>
						}
						title="Smart cleanup"
						description="AI polishes grammar, punctuation, and formatting so your text reads naturally."
					/>
					<FeatureItem
						icon={
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
								<circle cx="12" cy="12" r="10" />
								<path d="m9 12 2 2 4-4" />
							</svg>
						}
						title="Works everywhere"
						description="Parrot pastes directly into any app -- emails, docs, chat, code editors."
					/>
					<FeatureItem
						icon={
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
								<rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
								<path d="M7 11V7a5 5 0 0 1 10 0v4" />
							</svg>
						}
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
				<AuthDoodles />

				<div className="w-full max-w-sm animate-fade-in-up relative z-10">
					{/* Show branding on small screens where left panel is hidden */}
					<div className="flex flex-col items-center text-center mb-8 md:hidden">
						<img
							src="/parrot-transparent.png"
							alt="Parrot"
							className="w-16 h-16 mx-auto mb-4 drop-shadow-lg"
						/>
						<h1 className="text-2xl font-bold text-foreground mb-1">
							Parrot
						</h1>
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

const doodleIcons = {
	mic: (
		<>
			<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
			<path d="M19 10v2a7 7 0 0 1-14 0v-2" />
			<line x1="12" x2="12" y1="19" y2="22" />
		</>
	),
	waves: (
		<>
			<path d="M2 12h2" /><path d="M6 8v8" /><path d="M10 4v16" /><path d="M14 6v12" /><path d="M18 9v6" /><path d="M22 12h-2" />
		</>
	),
	bubble: (
		<>
			<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
			<path d="M8 10h8" /><path d="M8 13h5" />
		</>
	),
	feather: (
		<>
			<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
			<line x1="16" x2="2" y1="8" y2="22" />
		</>
	),
	clipboard: (
		<>
			<rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
			<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
			<path d="M9 14h6" /><path d="M9 18h6" />
		</>
	),
	keyboard: (
		<>
			<rect x="2" y="4" width="20" height="16" rx="2" />
			<path d="M6 8h.01" /><path d="M10 8h.01" /><path d="M14 8h.01" /><path d="M18 8h.01" />
			<path d="M6 12h.01" /><path d="M10 12h.01" /><path d="M14 12h.01" /><path d="M18 12h.01" />
			<path d="M8 16h8" />
		</>
	),
	music: (
		<>
			<path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
		</>
	),
};

// [top%, left%, icon, rotation, sizePx]
// Grid: 8 rows x 4 cols with organic offsets for a uniform-but-random feel
const doodlePlacements: [number, number, keyof typeof doodleIcons, number, number][] = [
	// Row 1 (~3%)
	[1, 2, "mic", 14, 42],
	[4, 27, "waves", -7, 38],
	[2, 52, "bubble", 11, 44],
	[5, 78, "feather", -16, 40],
	// Row 2 (~15%)
	[14, 6, "music", 19, 38],
	[16, 32, "clipboard", -4, 42],
	[13, 58, "keyboard", 9, 44],
	[17, 84, "mic", -11, 40],
	// Row 3 (~27%)
	[26, 1, "bubble", -9, 42],
	[29, 26, "feather", 17, 38],
	[25, 53, "waves", 6, 40],
	[28, 79, "music", -7, 38],
	// Row 4 (~39%)
	[38, 5, "keyboard", 13, 40],
	[41, 30, "mic", -5, 38],
	[37, 57, "clipboard", 16, 42],
	[40, 83, "bubble", -13, 44],
	// Row 5 (~51%)
	[50, 2, "feather", -17, 40],
	[53, 28, "waves", 8, 42],
	[49, 54, "music", -6, 38],
	[52, 80, "keyboard", 10, 40],
	// Row 6 (~63%)
	[62, 4, "mic", 7, 40],
	[65, 26, "bubble", -14, 44],
	[61, 52, "feather", 12, 40],
	[64, 78, "clipboard", -5, 38],
	// Row 7 (~75%)
	[74, 1, "waves", -11, 40],
	[77, 30, "keyboard", 14, 38],
	[73, 56, "mic", -9, 42],
	[76, 82, "music", 11, 40],
	// Row 8 (~87%)
	[86, 5, "bubble", 8, 38],
	[89, 28, "feather", -13, 42],
	[85, 54, "waves", 10, 40],
	[88, 80, "clipboard", -8, 38],
];

const parrotPlacements: [number, number, number, number][] = [
	[8, 46, 12, 40],
	[34, 10, -14, 38],
	[52, 88, 18, 40],
	[68, 42, -9, 38],
	[88, 62, 15, 40],
];

function AuthDoodles() {
	return (
		<div className="absolute inset-0 pointer-events-none overflow-hidden">
			{doodlePlacements.map(([top, left, icon, rot, size], i) => (
				<svg
					key={i}
					className="absolute text-primary"
					style={{
						top: `${top}%`,
						left: `${left}%`,
						width: `${size}px`,
						height: `${size}px`,
						transform: `rotate(${rot}deg)`,
						opacity: 0.14,
					}}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="1.3"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					{doodleIcons[icon]}
				</svg>
			))}
			{parrotPlacements.map(([top, left, rot, size], i) => (
				<svg
					key={`parrot-${i}`}
					className="absolute text-primary"
					style={{
						top: `${top}%`,
						left: `${left}%`,
						width: `${size}px`,
						height: `${size}px`,
						transform: `rotate(${rot}deg)`,
						opacity: 0.14,
					}}
					viewBox="0 0 64 64"
					fill="currentColor"
				>
					<ellipse cx="32" cy="34" rx="14" ry="16" />
					<ellipse cx="32" cy="28" rx="10" ry="11" />
					<path d="M34 27 L42 25 L36 29Z" />
					<path d="M20 34 C14 28 12 38 18 40" />
					<path d="M44 34 C50 28 52 38 46 40" />
				</svg>
			))}
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
