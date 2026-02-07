import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/subscription";
import { createFileRoute } from "@tanstack/react-router";
import { User, Mail, Crown, Zap, ExternalLink, Shield, Check } from "lucide-react";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const { user } = useAuth();
	const { subscription } = useSubscription();

	const tierColors: Record<string, string> = {
		free: "bg-slate-500",
		starter: "bg-blue-500",
		pro: "bg-purple-500",
		enterprise: "bg-amber-500",
	};

	const tierNames: Record<string, string> = {
		free: "Free",
		starter: "Starter",
		pro: "Pro",
		enterprise: "Enterprise",
	};

	return (
		<div className="space-y-8">
			{/* Page header */}
			<div>
				<h1 className="text-2xl font-bold text-foreground tracking-tight">
					Profile
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Your account details and subscription
				</p>
			</div>

			{/* Account Info Card */}
			<section className="bg-card rounded-2xl border border-border p-5">
				<div className="flex items-start gap-4 mb-5">
					<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
						<User className="w-5 h-5 text-primary" />
					</div>
					<div>
						<h2 className="text-base font-semibold text-foreground">Account</h2>
						<p className="text-sm text-muted-foreground">
							Your personal information
						</p>
					</div>
				</div>

				<div className="space-y-4">
					<div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
						<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<User className="w-5 h-5 text-primary" />
						</div>
						<div className="flex-1">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</p>
							<p className="text-base font-medium text-foreground">{user?.name || "—"}</p>
						</div>
					</div>

					<div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
						<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<Mail className="w-5 h-5 text-primary" />
						</div>
						<div className="flex-1">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</p>
							<p className="text-base font-medium text-foreground">{user?.email || "—"}</p>
						</div>
					</div>
				</div>
			</section>

			{/* Subscription Card */}
			<section className="bg-card rounded-2xl border border-border p-5">
				<div className="flex items-start gap-4 mb-5">
					<div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
						<Crown className="w-5 h-5 text-amber-500" />
					</div>
					<div className="flex-1">
						<h2 className="text-base font-semibold text-foreground">Subscription</h2>
						<p className="text-sm text-muted-foreground">
							Your current plan and usage
						</p>
					</div>
					{subscription && (
						<a
							href="https://polar.sh/settings/subscriptions"
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
						>
							Manage
							<ExternalLink className="w-3 h-3" />
						</a>
					)}
				</div>

				{subscription ? (
					<div className="space-y-5">
						{/* Plan badge */}
						<div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
							<div className="flex items-center gap-3">
								<div className={`w-10 h-10 rounded-full ${tierColors[subscription.tier] || "bg-slate-500"} flex items-center justify-center shrink-0`}>
									<Zap className="w-5 h-5 text-white" />
								</div>
								<div>
									<div className="flex items-center gap-2">
										<span className="text-base font-bold text-foreground">
											{tierNames[subscription.tier] || subscription.tier}
										</span>
										<span className={`
											inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide
											${subscription.status === "active" 
												? "bg-green-500/10 text-green-600" 
												: "bg-amber-500/10 text-amber-600"
											}
										`}>
											<span className={`
												w-1.5 h-1.5 rounded-full
												${subscription.status === "active" ? "bg-green-500" : "bg-amber-500"}
											`} />
											{subscription.status === "active" ? "Active" : subscription.status}
										</span>
									</div>
									<p className="text-xs text-muted-foreground mt-0.5">
										{subscription.usage.month && `Resets ${subscription.usage.month}`}
									</p>
								</div>
							</div>
						</div>

						{/* Usage bars */}
						{subscription.limits.transcriptionMinutes != null && (
							<div className="space-y-2">
								<div className="flex items-baseline justify-between">
									<div className="flex items-center gap-2">
										<Zap className="w-3.5 h-3.5 text-muted-foreground" />
										<span className="text-sm font-medium text-foreground">Transcription</span>
									</div>
									<span className="text-sm tabular-nums text-muted-foreground">
										<span className="text-foreground font-semibold">
											{subscription.usage.transcriptionMinutes}
										</span>
										{" / "}
										{subscription.limits.transcriptionMinutes} min
									</span>
								</div>
								<div className="h-2.5 rounded-full bg-border overflow-hidden">
									<div
										className={`h-full rounded-full transition-all duration-500 ${
											subscription.usage.transcriptionMinutes >=
											subscription.limits.transcriptionMinutes * 0.9
												? "bg-red-500"
												: subscription.usage.transcriptionMinutes >=
												  subscription.limits.transcriptionMinutes * 0.7
												? "bg-amber-500"
												: "bg-primary"
										}`}
										style={{
											width: `${Math.min(
												100,
												(subscription.usage.transcriptionMinutes /
													subscription.limits.transcriptionMinutes) *
													100,
											)}%`,
										}}
									/>
								</div>
							</div>
						)}

						{subscription.limits.cleanupRequests != null && (
							<div className="space-y-2">
								<div className="flex items-baseline justify-between">
									<div className="flex items-center gap-2">
										<Crown className="w-3.5 h-3.5 text-muted-foreground" />
										<span className="text-sm font-medium text-foreground">AI Cleanup</span>
									</div>
									<span className="text-sm tabular-nums text-muted-foreground">
										<span className="text-foreground font-semibold">
											{subscription.usage.cleanupRequests}
										</span>
										{" / "}
										{subscription.limits.cleanupRequests} requests
									</span>
								</div>
								<div className="h-2.5 rounded-full bg-border overflow-hidden">
									<div
										className={`h-full rounded-full transition-all duration-500 ${
											subscription.usage.cleanupRequests >=
											subscription.limits.cleanupRequests * 0.9
												? "bg-red-500"
												: subscription.usage.cleanupRequests >=
												  subscription.limits.cleanupRequests * 0.7
												? "bg-amber-500"
												: "bg-purple-500"
										}`}
										style={{
											width: `${Math.min(
												100,
												(subscription.usage.cleanupRequests /
													subscription.limits.cleanupRequests) *
													100,
											)}%`,
										}}
									/>
								</div>
							</div>
						)}
					</div>
				) : (
					<div className="p-6 rounded-xl bg-muted/50 text-center">
						<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
							<Crown className="w-6 h-6 text-muted-foreground" />
						</div>
						<p className="text-sm text-muted-foreground">
							No active subscription
						</p>
					</div>
				)}
			</section>

			{/* Privacy Section */}
			<section className="bg-card rounded-2xl border border-border p-5">
				<div className="flex items-start gap-4 mb-5">
					<div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
						<Shield className="w-5 h-5 text-emerald-500" />
					</div>
					<div>
						<h2 className="text-base font-semibold text-foreground">Privacy</h2>
						<p className="text-sm text-muted-foreground">
							Your data and privacy settings
						</p>
					</div>
				</div>

				<div className="p-4 rounded-xl bg-muted/50">
					<div className="flex items-start gap-3">
						<div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
							<Check className="w-3.5 h-3.5 text-emerald-500" />
						</div>
						<div>
							<p className="text-sm font-medium text-foreground">Local-first privacy</p>
							<p className="text-xs text-muted-foreground mt-1">
								Your transcriptions are stored locally on your device. Audio is processed and discarded unless you choose to save it.
							</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
