import { LocalSetupWizard } from "@/components/local-setup-wizard";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Cpu } from "lucide-react";

export const Route = createFileRoute("/_onboarding/local-setup")({
	component: LocalSetupPage,
});

function LocalSetupPage() {
	const navigate = useNavigate();

	const handleComplete = () => {
		// Navigate to the tour step after setup is complete
		navigate({ to: "/tour" });
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="text-center space-y-2">
				<div className="w-16 h-16 bg-pk-primary/15 rounded-full flex items-center justify-center mx-auto mb-4">
					<Cpu className="w-8 h-8 text-pk-primary" />
				</div>
				<h2 className="text-2xl font-bold text-foreground">Tune Parrot</h2>
				<p className="text-muted-foreground">
					Pick the dictation quality that fits your Mac. Everything runs
					on-device.
				</p>
			</div>

			{/* Setup Wizard */}
			<LocalSetupWizard onComplete={handleComplete} />
		</div>
	);
}
