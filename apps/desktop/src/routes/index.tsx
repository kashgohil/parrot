import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useCallback, useEffect, useMemo, useState } from "react";

interface DictationEntry {
	id: string;
	raw_text: string;
	cleaned_text: string;
	provider: string;
	duration_ms: number;
	created_at: string;
}

export const Route = createFileRoute("/")({
	component: HomePage,
});

const tips = [
	"Press your hotkey to start recording — release it or press again to stop.",
	"Add custom vocabulary in the Vocabulary tab so Parrot nails tricky names and jargon.",
	"Set your writing style in Settings to get cleaner, more consistent transcriptions.",
	"Your transcriptions are automatically copied to your clipboard after processing.",
	"Use your own API keys in Settings if you want full control over providers.",
	"Parrot cleans up your dictations with AI — grammar, punctuation, and style, all handled.",
];

function getTipOfTheDay() {
	const dayIndex = Math.floor(Date.now() / 86400000) % tips.length;
	return tips[dayIndex];
}

function HomePage() {
	const [entries, setEntries] = useState<DictationEntry[]>([]);
	const [search, setSearch] = useState("");
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const tip = useMemo(() => getTipOfTheDay(), []);

	const loadHistory = useCallback(async () => {
		try {
			if (search.trim()) {
				setEntries(
					await invoke<DictationEntry[]>("search_history", { query: search }),
				);
			} else {
				setEntries(await invoke<DictationEntry[]>("get_history"));
			}
		} catch (e) {
			console.error("Failed to load history:", e);
		}
	}, [search]);

	useEffect(() => {
		loadHistory();
	}, [loadHistory]);

	useEffect(() => {
		const unsub = listen("dictation-complete", () => {
			loadHistory();
		});
		return () => {
			unsub.then((f) => f());
		};
	}, [loadHistory]);

	async function copyEntry(entry: DictationEntry) {
		const text = entry.cleaned_text || entry.raw_text;
		try {
			await writeText(text);
			setCopiedId(entry.id);
			setTimeout(() => setCopiedId(null), 2000);
		} catch (e) {
			console.error("Failed to copy:", e);
		}
	}

	function formatDuration(ms: number): string {
		const secs = Math.round(ms / 1000);
		if (secs < 60) return `${secs}s`;
		return `${Math.floor(secs / 60)}m ${secs % 60}s`;
	}

	function formatTime(iso: string): string {
		const d = new Date(iso + "Z");
		const now = new Date();
		const diff = now.getTime() - d.getTime();
		if (diff < 60000) return "just now";
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
	}

	function dateLabel(iso: string): string {
		const d = new Date(iso + "Z");
		const now = new Date();
		const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const entry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
		const diff = today.getTime() - entry.getTime();
		if (diff === 0) return "Today";
		if (diff === 86400000) return "Yesterday";
		return d.toLocaleDateString(undefined, {
			weekday: "long",
			month: "short",
			day: "numeric",
		});
	}

	// Group entries by date
	const grouped = useMemo(() => {
		const groups: { label: string; entries: DictationEntry[] }[] = [];
		let currentLabel = "";
		for (const entry of entries) {
			const label = dateLabel(entry.created_at);
			if (label !== currentLabel) {
				currentLabel = label;
				groups.push({ label, entries: [entry] });
			} else {
				groups[groups.length - 1].entries.push(entry);
			}
		}
		return groups;
	}, [entries]);

	return (
		<div>
			{/* Tip of the day */}
			<div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 mb-6">
				<p className="text-xs font-semibold text-primary mb-1">Tip of the day</p>
				<p className="text-sm text-foreground">{tip}</p>
			</div>

			{/* Search */}
			<Input
				className="mb-5"
				type="text"
				placeholder="Search dictations..."
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>

			{/* Timeline */}
			{entries.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					{search
						? "No results found."
						: "No dictations yet. Press your hotkey to start recording."}
				</p>
			) : (
				<div className="flex flex-col gap-6">
					{grouped.map((group) => (
						<div key={group.label}>
							<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
								{group.label}
							</h3>
							<div className="relative pl-4 border-l-2 border-border flex flex-col gap-2">
								{group.entries.map((entry) => {
									const display = entry.cleaned_text || entry.raw_text;
									const isExpanded = expandedId === entry.id;
									const hasCleaned =
										entry.cleaned_text && entry.cleaned_text !== entry.raw_text;

									return (
										<div key={entry.id} className="relative">
											{/* Timeline dot */}
											<div className="absolute -left-[21px] top-3.5 w-2.5 h-2.5 rounded-full bg-primary/40 border-2 border-background" />
											<Card
												className={`cursor-pointer transition-colors ${isExpanded ? "border-primary" : "hover:border-muted-foreground"}`}
												onClick={() =>
													setExpandedId(isExpanded ? null : entry.id)
												}
											>
												<CardContent className="px-3.5 py-3">
													<div className="flex justify-between items-center mb-1.5">
														<div className="flex gap-2.5 text-xs text-muted-foreground">
															<span>{formatTime(entry.created_at)}</span>
															<span className="capitalize">
																{entry.provider}
															</span>
															<span>
																{formatDuration(entry.duration_ms)}
															</span>
														</div>
														<Button
															variant="outline"
															size="sm"
															onClick={(e) => {
																e.stopPropagation();
																copyEntry(entry);
															}}
														>
															{copiedId === entry.id ? "Copied!" : "Copy"}
														</Button>
													</div>
													<p
														className={`text-sm leading-relaxed text-foreground ${isExpanded ? "" : "line-clamp-3"}`}
													>
														{display}
													</p>
													{isExpanded && hasCleaned && (
														<div className="mt-2.5 pt-2.5 border-t border-border">
															<span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block mb-1">
																Raw transcription:
															</span>
															<p className="text-[13px] leading-relaxed text-muted-foreground">
																{entry.raw_text}
															</p>
														</div>
													)}
												</CardContent>
											</Card>
										</div>
									);
								})}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
