import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useSubscription } from "@/lib/subscription";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const { user } = useAuth();
	const { subscription } = useSubscription();

	return (
		<div>
			<div className="flex flex-col gap-8">
				{/* User Details */}
				<section>
					<h3 className="text-lg font-medium mb-1">Account</h3>
					<p className="text-sm text-muted-foreground mb-4">
						Your account details.
					</p>
					<div className="flex flex-col gap-3">
						<div className="flex flex-col gap-1">
							<Label className="text-muted-foreground text-xs">Name</Label>
							<p className="text-[15px] font-medium">{user?.name || "—"}</p>
						</div>
						<div className="flex flex-col gap-1">
							<Label className="text-muted-foreground text-xs">Email</Label>
							<p className="text-[15px] font-medium">{user?.email || "—"}</p>
						</div>
					</div>
				</section>

				<hr className="border-border" />

				{/* Subscription */}
				<section>
					<h3 className="text-lg font-medium mb-4">Subscription</h3>
					{subscription ? (
						<div className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-4">
							{/* Tier + status row */}
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary uppercase tracking-wide">
										{subscription.tier}
									</span>
									{subscription.status && (
										<span
											className={`inline-flex items-center gap-1 text-xs font-medium ${
												subscription.status === "active"
													? "text-emerald-600"
													: "text-amber-600"
											}`}
										>
											<span
												className={`w-1.5 h-1.5 rounded-full ${
													subscription.status === "active"
														? "bg-emerald-500"
														: "bg-amber-500"
												}`}
											/>
											{subscription.status === "active" ? "Active" : subscription.status}
										</span>
									)}
								</div>
								<a
									href="https://polar.sh/settings/subscriptions"
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
								>
									Manage &rarr;
								</a>
							</div>

							{/* Transcription usage */}
							{subscription.limits.transcriptionMinutes != null && (
								<div className="flex flex-col gap-1.5">
									<div className="flex items-baseline justify-between">
										<span className="text-xs text-muted-foreground">Transcription</span>
										<span className="text-xs tabular-nums text-muted-foreground">
											<span className="text-foreground font-medium">
												{subscription.usage.transcriptionMinutes}
											</span>
											{" / "}
											{subscription.limits.transcriptionMinutes} min
										</span>
									</div>
									<div className="h-1.5 rounded-full bg-border overflow-hidden">
										<div
											className={`h-full rounded-full transition-all ${
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

							{/* Cleanup usage */}
							{subscription.limits.cleanupRequests != null && (
								<div className="flex flex-col gap-1.5">
									<div className="flex items-baseline justify-between">
										<span className="text-xs text-muted-foreground">AI cleanup</span>
										<span className="text-xs tabular-nums text-muted-foreground">
											<span className="text-foreground font-medium">
												{subscription.usage.cleanupRequests}
											</span>
											{" / "}
											{subscription.limits.cleanupRequests} requests
										</span>
									</div>
									<div className="h-1.5 rounded-full bg-border overflow-hidden">
										<div
											className={`h-full rounded-full transition-all ${
												subscription.usage.cleanupRequests >=
												subscription.limits.cleanupRequests * 0.9
													? "bg-red-500"
													: subscription.usage.cleanupRequests >=
														  subscription.limits.cleanupRequests * 0.7
														? "bg-amber-500"
														: "bg-primary"
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

							{/* Period label */}
							{subscription.usage.month && (
								<p className="text-[11px] text-muted-foreground/60">
									Usage resets monthly &middot; {subscription.usage.month}
								</p>
							)}
						</div>
					) : (
						<div className="rounded-xl border border-border bg-muted/30 p-4">
							<p className="text-sm text-muted-foreground">
								No active subscription.
							</p>
						</div>
					)}
				</section>

				<hr className="border-border" />

				{/* Privacy */}
				<section>
					<h3 className="text-lg font-medium mb-1">Privacy</h3>
					<p className="text-sm text-muted-foreground">
						Coming soon — data retention and analytics preferences will appear here.
					</p>
				</section>
			</div>
		</div>
	);
}
