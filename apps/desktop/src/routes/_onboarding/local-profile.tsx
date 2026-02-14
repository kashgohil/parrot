import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { ArrowRight, User, Mail, HardDrive } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_onboarding/local-profile")({
	component: LocalProfilePage,
});

function LocalProfilePage() {
	const navigate = useNavigate();
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
			// Save local user profile
			await invoke("set_local_user", {
				name: name.trim(),
				email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@local.user`,
			});

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
					<HardDrive className="w-8 h-8 text-pk-primary" />
				</div>
				<h2 className="text-2xl font-bold text-foreground">
					Set Up Your Local Profile
				</h2>
				<p className="text-muted-foreground">
					Enter your details to personalize your local Parrot experience
				</p>
			</div>

			{/* Info Card */}
			<div className="p-4 bg-pk-primary/10 border border-pk-primary/30 rounded-lg">
				<div className="flex items-start gap-3">
					<div className="w-8 h-8 rounded-full bg-[#7cb342]/100/10 flex items-center justify-center shrink-0">
						<HardDrive className="w-4 h-4 text-pk-primary" />
					</div>
					<div>
						<h3 className="font-medium text-[#5a8a2e]">Local Mode</h3>
						<p className="text-sm text-pk-primary mt-1">
							Your data stays on your device. No account required, no cloud sync.
						</p>
					</div>
				</div>
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
							Continue to Installation
							<ArrowRight className="w-4 h-4 ml-2" />
						</>
					)}
				</Button>
			</div>

			<p className="text-center text-xs text-muted-foreground">
				You can change these details later in Settings
			</p>
		</div>
	);
}
