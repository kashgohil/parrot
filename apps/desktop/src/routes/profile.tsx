import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/profile")({
	component: ProfilePage,
});

function ProfilePage() {
	const { user } = useAuth();

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
					<h3 className="text-lg font-medium mb-1">Subscription</h3>
					<p className="text-sm text-muted-foreground">
						Coming soon — subscription management will appear here.
					</p>
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
