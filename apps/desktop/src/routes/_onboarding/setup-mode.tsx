import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Cloud, Monitor, X } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_onboarding/setup-mode")({
	component: SetupModePage,
});

function SetupModePage() {
	const navigate = useNavigate();
	const { updateOnboarding } = useAuth();
	const [selected, setSelected] = useState<"local" | "cloud" | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleContinue = async () => {
		if (!selected) return;

		setIsSubmitting(true);
		try {
			await updateOnboarding(false, selected);
			if (selected === "local") {
				navigate({ to: "/local-setup" });
			} else {
				navigate({ to: "/cloud-setup" });
			}
		} catch (err) {
			console.error("Failed to save setup mode:", err);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-6">
			<div className="text-center">
				<h2 className="text-2xl font-bold text-foreground mb-2">
					Choose Your Setup
				</h2>
				<p className="text-muted-foreground">
					How would you like Parrot to process your voice recordings?
				</p>
			</div>

			<div className="grid md:grid-cols-2 gap-4">
				<SetupOption
					icon={Monitor}
					title="Local Processing"
					description="Process everything on your device"
					selected={selected === "local"}
					onClick={() => setSelected("local")}
					pros={[
						"Complete privacy - data never leaves your device",
						"No API costs or subscriptions",
						"Works offline",
					]}
					cons={[
						"Requires ~4GB disk space",
						"Slower on older machines",
						"One-time model download",
					]}
				/>

				<SetupOption
					icon={Cloud}
					title="Cloud Processing"
					description="Use cloud APIs for transcription"
					selected={selected === "cloud"}
					onClick={() => setSelected("cloud")}
					pros={[
						"Instant setup, no downloads",
						"Faster processing",
						"Minimal disk usage",
					]}
					cons={[
						"Requires API keys",
						"Pay-per-use costs",
						"Needs internet connection",
					]}
				/>
			</div>

			<div className="flex justify-center pt-4">
				<Button
					size="lg"
					onClick={handleContinue}
					disabled={!selected || isSubmitting}
					className="px-8"
				>
					{isSubmitting ? "Saving..." : "Continue"}
				</Button>
			</div>
		</div>
	);
}

interface SetupOptionProps {
	icon: typeof Monitor;
	title: string;
	description: string;
	selected: boolean;
	onClick: () => void;
	pros: string[];
	cons: string[];
}

function SetupOption({
	icon: Icon,
	title,
	description,
	selected,
	onClick,
	pros,
	cons,
}: SetupOptionProps) {
	return (
		<Card
			className={`cursor-pointer transition-all ${
				selected
					? "ring-2 ring-primary border-primary"
					: "hover:border-primary/50"
			}`}
			onClick={onClick}
		>
			<CardHeader className="pb-3">
				<div className="flex items-center gap-3">
					<div
						className={`w-10 h-10 rounded-lg flex items-center justify-center ${
							selected ? "bg-primary text-primary-foreground" : "bg-secondary"
						}`}
					>
						<Icon className="w-5 h-5" />
					</div>
					<div>
						<CardTitle className="text-lg">{title}</CardTitle>
						<CardDescription>{description}</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				<div>
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
						Advantages
					</p>
					<ul className="space-y-1">
						{pros.map((pro, i) => (
							<li key={i} className="flex items-start gap-2 text-sm">
								<Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
								<span>{pro}</span>
							</li>
						))}
					</ul>
				</div>
				<div>
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
						Considerations
					</p>
					<ul className="space-y-1">
						{cons.map((con, i) => (
							<li
								key={i}
								className="flex items-start gap-2 text-sm text-muted-foreground"
							>
								<X className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
								<span>{con}</span>
							</li>
						))}
					</ul>
				</div>
			</CardContent>
		</Card>
	);
}
