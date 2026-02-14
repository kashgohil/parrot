import { LocalSetupWizard } from "@/components/local-setup-wizard";
import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, HardDrive, Cpu } from "lucide-react";

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
				<h2 className="text-2xl font-bold text-foreground">
					Configure Local AI
				</h2>
				<p className="text-muted-foreground">
					Set up Whisper and Ollama for offline voice dictation
				</p>
			</div>

			{/* Back button */}
			<Button
				variant="ghost"
				size="sm"
				onClick={() => navigate({ to: "/local-profile" })}
				className="-ml-2"
			>
				<ArrowLeft className="w-4 h-4 mr-2" />
				Back to Profile
			</Button>

			{/* Info Card */}
			<div className="p-4 bg-pk-primary/10 border border-pk-primary/30 rounded-lg">
				<div className="flex items-start gap-3">
					<div className="w-8 h-8 rounded-full bg-[#7cb342]/100/10 flex items-center justify-center shrink-0">
						<HardDrive className="w-4 h-4 text-pk-primary" />
					</div>
					<div>
						<h3 className="font-medium text-[#5a8a2e]">Local Processing</h3>
						<p className="text-sm text-pk-primary mt-1">
							We'll install Whisper for transcription and Ollama for text cleanup.
							Everything runs on your device.
						</p>
					</div>
				</div>
			</div>

			{/* Setup Wizard */}
			<LocalSetupWizard onComplete={handleComplete} />
		</div>
	);
}
