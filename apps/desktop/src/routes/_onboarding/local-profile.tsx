import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { ArrowRight, User, Mail } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_onboarding/local-profile")({
	component: LocalProfilePage,
});

function LocalProfilePage() {
	const navigate = useNavigate();
	const { refreshUser } = useAuth();
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleContinue = async () => {
		if (!name.trim()) {
			setError("Please enter your name");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			// Persist setup_mode first — refreshUser keys off this to load the
			// local user; without it auth context would clear `user` to null.
			await invoke("set_setting", { key: "setup_mode", value: "local" });

			// Save local user profile
			await invoke("set_local_user", {
				name: name.trim(),
				email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@local.user`,
			});

			// Pull the freshly-created local user into auth context so
			// subsequent steps (local-setup, tour) see user.isLocal=true.
			await refreshUser();

			// Navigate to local setup (installation)
			navigate({ to: "/local-setup" });
		} catch (err) {
			console.error("Failed to save profile:", err);
			setError(err instanceof Error ? err.message : "Failed to save profile");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="text-center space-y-2">
				<div className="w-16 h-16 bg-pk-primary/15 rounded-full flex items-center justify-center mx-auto mb-4">
					<User className="w-8 h-8 text-pk-primary" />
				</div>
				<h2 className="text-2xl font-bold text-foreground">Welcome to Parrot</h2>
				<p className="text-muted-foreground">
					Enter your details to personalize your experience
				</p>
			</div>

			{/* Form */}
			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="name" className="flex items-center gap-2">
						<User className="w-4 h-4" />
						Your Name *
					</Label>
					<Input
						id="name"
						placeholder="e.g., John Doe"
						value={name}
						onChange={(e) => setName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !isSubmitting) {
								handleContinue();
							}
						}}
						className="h-11"
						autoFocus
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="email" className="flex items-center gap-2">
						<Mail className="w-4 h-4" />
						Email (optional)
					</Label>
					<Input
						id="email"
						type="email"
						placeholder="e.g., john@example.com"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !isSubmitting) {
								handleContinue();
							}
						}}
						className="h-11"
					/>
					<p className="text-xs text-muted-foreground">
						Email is optional and only used for reference in your local database
					</p>
				</div>

				{error && (
					<div className="p-3 bg-red-50 border border-red-200 rounded-lg">
						<p className="text-sm text-red-600">{error}</p>
					</div>
				)}
			</div>

			{/* Continue Button */}
			<div className="pt-4">
				<Button
					onClick={handleContinue}
					disabled={isSubmitting || !name.trim()}
					size="lg"
					className="w-full"
				>
					{isSubmitting ? (
						"Saving..."
					) : (
					<>
						Continue
						<ArrowRight className="w-4 h-4 ml-2" />
					</>
					)}
				</Button>
			</div>

			<p className="text-center text-xs text-muted-foreground">
				Your data stays on your device. You can change these details later in Settings.
			</p>
		</div>
	);
}
