import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { useCallback, useEffect, useState } from "react";

interface DictationEntry {
	id: string;
	raw_text: string;
	cleaned_text: string;
	provider: string;
	duration_ms: number;
	created_at: string;
}

export const Route = createFileRoute("/")({
	component: HistoryPage,
});

function HistoryPage() {
	const [entries, setEntries] = useState<DictationEntry[]>([]);
	const [search, setSearch] = useState("");
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);

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

	return (
		<div>
			<h2 className="text-[22px] font-semibold mb-4">History</h2>

			<Input
				className="max-w-[480px] mb-4"
				type="text"
				placeholder="Search dictations..."
				value={search}
				onChange={(e) => setSearch(e.target.value)}
			/>

			{entries.length === 0 ? (
				<p className="text-muted-foreground text-sm">
					{search
						? "No results found."
						: "No dictations yet. Press your hotkey to start recording."}
				</p>
			) : (
				<div className="flex flex-col gap-2">
					{entries.map((entry) => {
						const display = entry.cleaned_text || entry.raw_text;
						const isExpanded = expandedId === entry.id;
						const hasCleaned =
							entry.cleaned_text && entry.cleaned_text !== entry.raw_text;

						return (
							<Card
								key={entry.id}
								className={`cursor-pointer transition-colors ${isExpanded ? "border-primary" : "hover:border-muted-foreground"}`}
								onClick={() => setExpandedId(isExpanded ? null : entry.id)}
							>
								<CardContent className="px-3.5 py-3">
									<div className="flex justify-between items-center mb-1.5">
										<div className="flex gap-2.5 text-xs text-muted-foreground">
											<span>{formatTime(entry.created_at)}</span>
											<span className="capitalize">{entry.provider}</span>
											<span>{formatDuration(entry.duration_ms)}</span>
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
						);
					})}
				</div>
			)}
		</div>
	);
}
