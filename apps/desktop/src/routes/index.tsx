import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSubscription } from "@/lib/subscription";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { Search, Copy, Check, Clock, Mic, Sparkles, AlertTriangle, Lightbulb } from "lucide-react";
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
	const { subscription, isApproachingLimit } = useSubscription();

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
		<div className="space-y-6">
			{/* Page header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-foreground tracking-tight">
						Dictation History
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Review and copy your past transcriptions
					</p>
				</div>
				{entries.length > 0 && (
					<div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-xs text-muted-foreground">
						<Mic className="w-3.5 h-3.5" />
						<span>{entries.length} entries</span>
					</div>
				)}
			</div>

			{/* Usage warning */}
			{isApproachingLimit() && subscription && (
				<div className="rounded-xl border border-amber-500/30 bg-amber-50/50 px-4 py-3.5 flex items-start gap-3">
					<AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
					<div>
						<p className="text-sm font-semibold text-amber-700">
							Approaching usage limit
						</p>
						<p className="text-sm text-amber-600 mt-0.5">
							You've used {subscription.usage.transcriptionMinutes} of{" "}
							{subscription.limits.transcriptionMinutes} transcription minutes this month.
						</p>
					</div>
				</div>
			)}

			{/* Tip card */}
			<div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5 flex items-start gap-3">
				<Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
				<div>
					<p className="text-xs font-semibold text-primary uppercase tracking-wide">
						Tip of the day
					</p>
					<p className="text-sm text-foreground mt-1">{tip}</p>
				</div>
			</div>

			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
				<Input
					className="pl-10 h-11 bg-background"
					type="text"
					placeholder="Search dictations..."
					value={search}
					onChange={(e) => setSearch(e.target.value)}
				/>
			</div>

			{/* Timeline */}
			{entries.length === 0 ? (
				<div className="text-center py-16 px-4">
					<div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
						<Mic className="w-8 h-8 text-muted-foreground/50" />
					</div>
					<h3 className="text-lg font-semibold text-foreground mb-1">
						{search ? "No results found" : "No dictations yet"}
					</h3>
					<p className="text-sm text-muted-foreground max-w-xs mx-auto">
						{search
							? "Try a different search term"
							: "Press your hotkey to start recording your first dictation"}
					</p>
				</div>
			) : (
				<div className="space-y-8">
					{grouped.map((group) => (
						<div key={group.label}>
							<h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
								<span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
								{group.label}
							</h3>
							<div className="space-y-3">
								{group.entries.map((entry) => {
									const display = entry.cleaned_text || entry.raw_text;
									const isExpanded = expandedId === entry.id;
									const hasCleaned =
										entry.cleaned_text && entry.cleaned_text !== entry.raw_text;
									const isCopied = copiedId === entry.id;

									return (
										<div
											key={entry.id}
											className={`
												group bg-card rounded-2xl border transition-all duration-200 overflow-hidden
												${isExpanded ? "border-primary/50 shadow-lg shadow-primary/5" : "border-border hover:border-primary/30 hover:shadow-md"}
											`}
										>
											{/* Card header */}
											<div className="px-4 py-3 border-b border-border/50 flex items-center justify-between gap-3">
												<div className="flex items-center gap-3 text-xs text-muted-foreground">
													<span className="flex items-center gap-1">
														<Clock className="w-3 h-3" />
														{formatTime(entry.created_at)}
													</span>
													<span className="capitalize px-2 py-0.5 rounded-full bg-muted text-[10px] font-medium">
														{entry.provider}
													</span>
													<span className="flex items-center gap-1">
														<Mic className="w-3 h-3" />
														{formatDuration(entry.duration_ms)}
													</span>
													{hasCleaned && (
														<span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium">
															<Sparkles className="w-3 h-3" />
															Cleaned
														</span>
													)}
												</div>
												<Button
													variant="ghost"
													size="sm"
													onClick={(e) => {
														e.stopPropagation();
														copyEntry(entry);
													}}
													className={`
														h-8 px-3 text-xs font-medium transition-all
														${isCopied ? "bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700" : "hover:bg-primary/10 hover:text-primary"}
													`}
												>
													{isCopied ? (
														<>
															<Check className="w-3.5 h-3.5 mr-1" />
															Copied
														</>
													) : (
														<>
															<Copy className="w-3.5 h-3.5 mr-1" />
															Copy
														</>
													)}
												</Button>
											</div>

											{/* Card content */}
											<div 
												className="p-4 cursor-pointer"
												onClick={() => setExpandedId(isExpanded ? null : entry.id)}
											>
												<p className={`text-[15px] leading-relaxed text-foreground ${isExpanded ? "" : "line-clamp-3"}`}>
													{display}
												</p>
											</div>

											{/* Expanded raw view */}
											{isExpanded && hasCleaned && (
												<div className="px-4 pb-4">
													<div className="pt-3 border-t border-border/50">
														<p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
															<span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
															Raw transcription
														</p>
														<p className="text-sm text-muted-foreground italic leading-relaxed">
															"{entry.raw_text}"
														</p>
													</div>
												</div>
											)}
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
