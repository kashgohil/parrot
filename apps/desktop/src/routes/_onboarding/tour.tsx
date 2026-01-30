import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	ChevronLeft,
	ChevronRight,
	Clipboard,
	History,
	Mic,
	User,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_onboarding/tour")({
	component: TourPage,
});

const SLIDES = [
	{
		icon: Mic,
		title: "Start Recording",
		description:
			"Press Cmd+Shift+Space (or your custom hotkey) to start dictating. Press again to stop. Parrot captures your voice in high quality.",
		color: "bg-primary",
	},
	{
		icon: Clipboard,
		title: "Auto-Paste",
		description:
			"Your transcription is automatically cleaned up using AI and pasted where your cursor is. No manual copy-paste needed.",
		color: "bg-blue-500",
	},
	{
		icon: History,
		title: "View History",
		description:
			"All your dictations are saved. Search through past transcriptions and copy them anytime from the History tab.",
		color: "bg-purple-500",
	},
	{
		icon: User,
		title: "Personalize",
		description:
			"Add custom vocabulary (names, technical terms) and describe your writing style in the Profile tab for better results.",
		color: "bg-orange-500",
	},
];

function TourPage() {
	const navigate = useNavigate();
	const { updateOnboarding } = useAuth();
	const [currentSlide, setCurrentSlide] = useState(0);
	const [completing, setCompleting] = useState(false);

	const isLastSlide = currentSlide === SLIDES.length - 1;
	const slide = SLIDES[currentSlide];
	const Icon = slide.icon;

	const handleNext = () => {
		if (isLastSlide) {
			completeOnboarding();
		} else {
			setCurrentSlide((prev) => prev + 1);
		}
	};

	const handlePrev = () => {
		if (currentSlide > 0) {
			setCurrentSlide((prev) => prev - 1);
		}
	};

	const completeOnboarding = async () => {
		setCompleting(true);
		try {
			await updateOnboarding(true);
			navigate({ to: "/" });
		} catch (err) {
			console.error("Failed to complete onboarding:", err);
		} finally {
			setCompleting(false);
		}
	};

	return (
		<div className="space-y-8">
			<div className="text-center">
				<h2 className="text-2xl font-bold text-foreground mb-2">Quick Tour</h2>
				<p className="text-muted-foreground">
					Learn how to use Parrot in 4 simple steps
				</p>
			</div>

			<Card className="overflow-hidden">
				<CardContent className="p-8">
					<div className="flex flex-col items-center text-center space-y-6">
						<div
							className={`w-20 h-20 rounded-2xl ${slide.color} flex items-center justify-center`}
						>
							<Icon className="w-10 h-10 text-white" />
						</div>

						<div className="space-y-3 max-w-md">
							<h3 className="text-xl font-semibold text-foreground">
								{slide.title}
							</h3>
							<p className="text-muted-foreground leading-relaxed">
								{slide.description}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Dot indicators */}
			<div className="flex justify-center gap-2">
				{SLIDES.map((_, index) => (
					<button
						key={index}
						onClick={() => setCurrentSlide(index)}
						className={`w-2.5 h-2.5 rounded-full transition-colors ${
							index === currentSlide ? "bg-primary" : "bg-border"
						}`}
					/>
				))}
			</div>

			{/* Navigation */}
			<div className="flex justify-between items-center pt-4">
				<Button
					variant="outline"
					onClick={handlePrev}
					disabled={currentSlide === 0}
				>
					<ChevronLeft className="w-4 h-4 mr-1" />
					Back
				</Button>

				<Button
					onClick={handleNext}
					disabled={completing}
					size="lg"
					className="px-6"
				>
					{completing ? (
						"Finishing..."
					) : isLastSlide ? (
						"Get Started"
					) : (
						<>
							Next
							<ChevronRight className="w-4 h-4 ml-1" />
						</>
					)}
				</Button>
			</div>

			{/* Skip option */}
			{!isLastSlide && (
				<div className="text-center">
					<Button
						variant="link"
						onClick={completeOnboarding}
						disabled={completing}
						className="text-muted-foreground"
					>
						Skip tour
					</Button>
				</div>
			)}
		</div>
	);
}
