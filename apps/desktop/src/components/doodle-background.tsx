import type { LucideIcon } from "lucide-react";
import {
	AudioLines,
	ClipboardList,
	Clock,
	Feather,
	Keyboard,
	MessageSquareText,
	Mic,
	Music,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const iconList: { key: string; Icon: LucideIcon }[] = [
	{ key: "mic", Icon: Mic },
	{ key: "waves", Icon: AudioLines },
	{ key: "clipboard", Icon: ClipboardList },
	{ key: "feather", Icon: Feather },
	{ key: "bubble", Icon: MessageSquareText },
	{ key: "keyboard", Icon: Keyboard },
	{ key: "music", Icon: Music },
	{ key: "clock", Icon: Clock },
];

// Seeded random for consistent positions
function seededRandom(seed: number) {
	const x = Math.sin(seed) * 10000;
	return x - Math.floor(x);
}

type Doodle = {
	id: number;
	top: number; // pixels
	left: number; // percentage
	iconIndex: number;
	rotation: number;
	size: number;
};

// Fixed spacing - same pixel density across all screen sizes
const COL_WIDTH = 120; // pixels between columns
const ROW_HEIGHT = 120; // pixels between rows

function generateDoodles(
	containerWidth: number,
	containerHeight: number,
): Doodle[] {
	const doodles: Doodle[] = [];
	let id = 0;

	const cols = Math.max(3, Math.ceil(containerWidth / COL_WIDTH));
	const rows = Math.ceil(containerHeight / ROW_HEIGHT);
	const cellWidth = 100 / cols;

	for (let row = 0; row < rows; row++) {
		for (let col = 0; col < cols; col++) {
			const seed = row * 100 + col;

			const top =
				row * ROW_HEIGHT +
				seededRandom(seed) * ROW_HEIGHT * 0.6 +
				ROW_HEIGHT * 0.2;
			const left =
				col * cellWidth +
				seededRandom(seed + 1) * cellWidth * 0.6 +
				cellWidth * 0.2;

			const iconIndex = Math.floor(seededRandom(seed + 2) * iconList.length);
			const rotation = (seededRandom(seed + 3) - 0.5) * 30;
			const size = 32 + seededRandom(seed + 4) * 10;

			doodles.push({ id: id++, top, left, iconIndex, rotation, size });
		}
	}

	return doodles;
}

export function DoodleBackground({ opacity = 0.1 }: { opacity?: number }) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [doodles, setDoodles] = useState<Doodle[]>([]);

	useEffect(() => {
		function updateDoodles() {
			if (!containerRef.current) return;
			const width = containerRef.current.offsetWidth;
			const height = containerRef.current.offsetHeight;
			if (width > 0 && height > 0) {
				setDoodles(generateDoodles(width, height));
			}
		}

		// Use ResizeObserver to detect container size changes
		const resizeObserver = new ResizeObserver(updateDoodles);
		if (containerRef.current) {
			resizeObserver.observe(containerRef.current);
		}

		// Initial generation
		updateDoodles();

		return () => {
			resizeObserver.disconnect();
		};
	}, []);

	return (
		<div
			ref={containerRef}
			className="absolute inset-0 pointer-events-none overflow-hidden"
		>
			{doodles.map((doodle) => {
				const { Icon } = iconList[doodle.iconIndex];
				return (
					<Icon
						key={doodle.id}
						className="absolute text-primary"
						style={{
							top: `${doodle.top}px`,
							left: `${doodle.left}%`,
							width: `${doodle.size}px`,
							height: `${doodle.size}px`,
							transform: `rotate(${doodle.rotation}deg)`,
							opacity,
						}}
						strokeWidth={1.3}
					/>
				);
			})}
		</div>
	);
}
