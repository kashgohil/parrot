import { useId } from "react";
import { SLACK_PATH, VSCODE_PATH } from "@/components/app-icons";

// macOS-style app tiles for product mocks. Logo paths come from app-icons.tsx;
// Mail, Notes and Safari are simple drawn glyphs, not traced logos.

export type AppIconName = "slack" | "mail" | "vscode" | "notes" | "safari";

const SLACK_COLORS = ["#E01E5A", "#36C5F0", "#2EB67D", "#ECB22E"];
// The Slack path is four subpaths (one per color), each starting with an absolute M.
const SLACK_PARTS = SLACK_PATH.split("M")
	.slice(1)
	.map((d) => `M${d}`);

function Tile() {
	return (
		<>
			<rect x="1" y="1" width="30" height="30" rx="7.5" fill="#fff" />
			<rect
				x="1.25"
				y="1.25"
				width="29.5"
				height="29.5"
				rx="7.25"
				fill="none"
				stroke="#000"
				strokeOpacity=".12"
				strokeWidth=".5"
			/>
		</>
	);
}

export function AppIcon({
	app,
	className = "size-4",
	title,
}: {
	app: AppIconName;
	className?: string;
	title?: string;
}) {
	const id = useId();
	return (
		<svg
			className={className}
			viewBox="0 0 32 32"
			role={title ? "img" : undefined}
			aria-hidden={title ? undefined : true}
		>
			{title && <title>{title}</title>}
			{app === "slack" && (
				<>
					<Tile />
					<g transform="translate(7 7) scale(.75)">
						{SLACK_PARTS.map((d, i) => (
							<path key={SLACK_COLORS[i]} fill={SLACK_COLORS[i]} d={d} />
						))}
					</g>
				</>
			)}
			{app === "mail" && (
				<>
					<defs>
						<linearGradient id={`${id}m`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stopColor="#43B4FF" />
							<stop offset="1" stopColor="#1366EE" />
						</linearGradient>
					</defs>
					<rect
						x="1"
						y="1"
						width="30"
						height="30"
						rx="7.5"
						fill={`url(#${id}m)`}
					/>
					<rect x="6.5" y="9.5" width="19" height="13.5" rx="2" fill="#fff" />
					<path
						d="M7.4 10.6 16 17.1l8.6-6.5"
						fill="none"
						stroke="#1C78F2"
						strokeWidth="1.5"
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				</>
			)}
			{app === "vscode" && (
				<>
					<Tile />
					<g transform="translate(7.5 7.5) scale(.71)">
						<path fill="#0A7ACC" d={VSCODE_PATH} />
					</g>
				</>
			)}
			{app === "notes" && (
				<>
					<defs>
						<linearGradient id={`${id}n`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stopColor="#FFD84D" />
							<stop offset="1" stopColor="#F7C21F" />
						</linearGradient>
					</defs>
					<Tile />
					<path
						d="M1 8.5A7.5 7.5 0 0 1 8.5 1h15A7.5 7.5 0 0 1 31 8.5V11H1z"
						fill={`url(#${id}n)`}
					/>
					<path
						d="M4 12.6h24"
						stroke="#C9A227"
						strokeWidth=".9"
						strokeDasharray="1 1.4"
					/>
					<path
						d="M6 17h20M6 21h20M6 25h13"
						stroke="#D5D5D5"
						strokeWidth="1.1"
					/>
				</>
			)}
			{app === "safari" && (
				<>
					<defs>
						<linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
							<stop offset="0" stopColor="#5FCBFF" />
							<stop offset="1" stopColor="#1A6FE6" />
						</linearGradient>
					</defs>
					<Tile />
					<circle cx="16" cy="16" r="11.5" fill={`url(#${id}s)`} />
					<path d="M16 16l5.2-5.2-3.4 7z" fill="#FF3B30" />
					<path d="M16 16l-5.2 5.2 3.4-7z" fill="#fff" />
				</>
			)}
		</svg>
	);
}
