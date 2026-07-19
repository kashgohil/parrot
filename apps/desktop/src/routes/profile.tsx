import { useAuth } from "@/lib/auth";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Mail, Shield, User } from "lucide-react";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const { user } = useAuth();

	return (
		<div className="space-y-8">
			{/* Page header */}
			<div>
				<h1 className="text-2xl font-bold text-foreground tracking-tight">
					Profile
				</h1>
				<p className="text-sm text-muted-foreground mt-1">
					Your local profile on this Mac
				</p>
			</div>

			{/* Profile Info Card */}
			<section className="bg-card rounded-2xl border border-border p-5">
				<div className="flex items-start gap-4 mb-5">
					<div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
						<User className="w-5 h-5 text-primary" />
					</div>
					<div>
						<h2 className="text-base font-semibold text-foreground">Profile</h2>
						<p className="text-sm text-muted-foreground">
							Stored only on this device — no cloud account
						</p>
					</div>
				</div>

				<div className="space-y-4">
					<div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
						<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<User className="w-5 h-5 text-primary" />
						</div>
						<div className="flex-1">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Name
							</p>
							<p className="text-base font-medium text-foreground">
								{user?.name || "—"}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
						<div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
							<Mail className="w-5 h-5 text-primary" />
						</div>
						<div className="flex-1">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
								Email
							</p>
							<p className="text-base font-medium text-foreground">
								{user?.email || "—"}
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Privacy Section */}
			<section className="bg-card rounded-2xl border border-border p-5">
				<div className="flex items-start gap-4 mb-5">
					<div className="w-10 h-10 rounded-xl bg-pk-primary/10 flex items-center justify-center shrink-0">
						<Shield className="w-5 h-5 text-pk-primary" />
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
						<div className="w-6 h-6 rounded-full bg-pk-primary/10 flex items-center justify-center shrink-0 mt-0.5">
							<Check className="w-3.5 h-3.5 text-pk-primary" />
						</div>
						<div>
							<p className="text-sm font-medium text-foreground">
								Local-first privacy
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Your transcriptions are stored locally on your device. Audio is
								processed and discarded unless you choose to save it.
							</p>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
