import { LocalSetupWizard } from "@/components/local-setup-wizard";
import { Button } from "@/components/ui/button";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

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
		<div className="min-h-screen flex flex-col">
			{/* Header */}
			<div className="p-6 border-b">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={() => navigate({ to: "/setup-mode" })}
					>
						<ArrowLeft className="w-5 h-5" />
					</Button>
					<div>
						<h1 className="text-xl font-semibold">Local Setup</h1>
						<p className="text-sm text-muted-foreground">
							Configure your local AI for offline voice dictation
						</p>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 p-6">
				<div className="max-w-2xl mx-auto">
					<LocalSetupWizard onComplete={handleComplete} />
				</div>
			</div>
		</div>
	);
}
