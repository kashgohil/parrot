import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	ChevronLeft,
	ChevronRight,
	History,
	Mic,
	User,
	Sparkles,
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
		gradient: "from-primary/20 to-primary/5",
	},
	{
		icon: Sparkles,
		title: "AI Cleanup",
		description:
			"Your transcription is automatically cleaned up using AI — grammar, punctuation, and style. No manual editing needed.",
		color: "bg-blue-500",
		gradient: "from-blue-500/20 to-blue-500/5",
	},
	{
		icon: History,
		title: "View History",
		description:
			"All your dictations are saved. Search through past transcriptions and copy them anytime from the History tab.",
		color: "bg-purple-500",
		gradient: "from-purple-500/20 to-purple-500/5",
	},
	{
		icon: User,
		title: "Personalize",
		description:
			"Add custom vocabulary (names, technical terms) and describe your writing style in the Vocabulary tab for better results.",
		color: "bg-orange-500",
		gradient: "from-orange-500/20 to-orange-500/5",
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
			{/* Header */}
			<div className="text-center">
				<h2 className="text-2xl font-bold text-foreground mb-2">Quick Tour</h2>
				<p className="text-muted-foreground">
					Learn how to use Parrot in 4 simple steps
				</p>
			</div>

			{/* Slide card */}
			<div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm">
				<div className={`p-8 bg-gradient-to-br ${slide.gradient}`}>
					<div className="flex flex-col items-center text-center space-y-6">
						<div
							className={`
								w-24 h-24 rounded-3xl ${slide.color} flex items-center justify-center
								shadow-lg shadow-${slide.color}/25
							`}
						>
							<Icon className="w-12 h-12 text-white" />
						</div>

						<div className="space-y-3 max-w-md">
							<h3 className="text-xl font-bold text-foreground">
								{slide.title}
							</h3>
							<p className="text-muted-foreground leading-relaxed">
								{slide.description}
							</p>
						</div>
					</div>
				</div>
			</div>

			{/* Progress indicators */}
			<div className="flex justify-center gap-2">
				{SLIDES.map((_, idx) => (
					<button
						key={idx}
						onClick={() => setCurrentSlide(idx)}
						className={`
							h-2 rounded-full transition-all duration-300
							${idx === currentSlide ? "w-8 bg-primary" : "w-2 bg-border hover:bg-primary/50"}
						`}
						aria-label={`Go to slide ${idx + 1}`}
					/>
				))}
			</div>

			{/* Navigation */}
			<div className="flex justify-between items-center pt-4">
				<Button
					variant="outline"
					onClick={handlePrev}
					disabled={currentSlide === 0}
					size="lg"
					className="px-6"
				>
					<ChevronLeft className="w-4 h-4 mr-2" />
					Back
				</Button>

				<Button
					onClick={handleNext}
					disabled={completing}
					size="lg"
					className="px-8"
				>
					{completing ? (
						"Getting ready..."
					) : isLastSlide ? (
						<>
							Get Started
							<Sparkles className="w-4 h-4 ml-2" />
						</>
					) : (
						<>
							Next
							<ChevronRight className="w-4 h-4 ml-2" />
						</>
					)}
				</Button>
			</div>

			{/* Skip option */}
			{!isLastSlide && (
				<div className="text-center">
					<Button
						variant="ghost"
						onClick={completeOnboarding}
						disabled={completing}
						className="text-muted-foreground hover:text-foreground"
					>
						Skip tour
					</Button>
				</div>
			)}
		</div>
	);
}
