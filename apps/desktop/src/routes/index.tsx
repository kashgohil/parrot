import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSubscription } from "@/lib/subscription";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
	AlertTriangle,
	Check,
	Copy,
	Lightbulb,
	Mic,
	Search,
	Sparkles,
	Trash2,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

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
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

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

	async function deleteEntry(id: string) {
		setDeletingId(id);
		try {
			await invoke("delete_dictation", { id });
			setEntries((prev) => prev.filter((e) => e.id !== id));
			if (expandedId === id) setExpandedId(null);
		} catch (e) {
			console.error("Failed to delete:", e);
		} finally {
			setDeletingId(null);
			setPendingDeleteId(null);
		}
	}

	function formatDuration(ms: number): string {
		const secs = Math.round(ms / 1000);
		if (secs < 60) return `${secs}s`;
		return `${Math.floor(secs / 60)}m ${secs % 60}s`;
	}

	function formatTime(iso: string): string {
		const d = new Date(iso + "Z");
		return d.toLocaleTimeString(undefined, {
			hour: "numeric",
			minute: "2-digit",
		});
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

			{isApproachingLimit() && subscription && (
				<div className="rounded-xl border border-amber-500/30 bg-amber-50/50 px-4 py-3.5 flex items-start gap-3">
					<AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
					<div>
						<p className="text-sm font-semibold text-amber-700">
							Approaching usage limit
						</p>
						<p className="text-sm text-amber-600 mt-0.5">
							You've used {subscription.usage.transcriptionMinutes} of{" "}
							{subscription.limits.transcriptionMinutes} transcription minutes
							this month.
						</p>
					</div>
				</div>
			)}

			<div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3.5 flex items-start gap-3">
				<Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
				<div>
					<p className="text-xs font-semibold text-primary uppercase tracking-wide">
						Tip of the day
					</p>
					<p className="text-sm text-foreground mt-1">{tip}</p>
				</div>
			</div>

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
				<div className="rounded-xl border border-border overflow-hidden bg-card">
					<table className="w-full text-sm">
						<thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
							<tr>
								<th className="text-left font-semibold px-4 py-2.5">Text</th>
								<th className="text-left font-semibold px-4 py-2.5 w-32">
									Duration
								</th>
								<th className="text-right font-semibold px-4 py-2.5 w-32">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{grouped.map((group) => (
								<Fragment key={group.label}>
									<tr className="bg-muted/20">
										<td
											colSpan={3}
											className="px-4 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider"
										>
											{group.label}
										</td>
									</tr>
									{group.entries.map((entry) => {
										const display = entry.cleaned_text || entry.raw_text;
										const isExpanded = expandedId === entry.id;
										const hasCleaned =
											entry.cleaned_text &&
											entry.cleaned_text !== entry.raw_text;
										const isCopied = copiedId === entry.id;
										const isPendingDelete = pendingDeleteId === entry.id;
										const isDeleting = deletingId === entry.id;

										return (
											<tr
												key={entry.id}
												className="border-t border-border/60 hover:bg-muted/20 transition-colors align-middle"
											>
												<td
													className="px-4 py-3 cursor-pointer"
													onClick={() =>
														setExpandedId(isExpanded ? null : entry.id)
													}
												>
													<div className="flex items-start gap-2">
														<div className="flex-1 min-w-0">
															<p
																className={`text-[14px] leading-relaxed text-foreground ${isExpanded ? "" : "line-clamp-2"}`}
															>
																{display}
															</p>
															{isExpanded && hasCleaned && (
																<div className="mt-3 pt-3 border-t border-border/50">
																	<p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
																		<span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
																		Raw transcription
																	</p>
																	<p className="text-sm text-muted-foreground italic leading-relaxed">
																		"{entry.raw_text}"
																	</p>
																</div>
															)}
														</div>
														{hasCleaned && (
															<Sparkles
																className="w-3.5 h-3.5 text-primary shrink-0 mt-1"
																aria-label="Cleaned"
															/>
														)}
													</div>
												</td>
												<td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
													<div className="flex flex-col leading-tight">
														<span>{formatTime(entry.created_at)}</span>
														<span className="text-[11px] text-muted-foreground/70">
															{formatDuration(entry.duration_ms)}
														</span>
													</div>
												</td>
												<td className="px-4 py-3 text-right whitespace-nowrap">
													{isPendingDelete ? (
														<div className="inline-flex items-center gap-1">
															<Button
																variant="ghost"
																size="sm"
																disabled={isDeleting}
																onClick={() => setPendingDeleteId(null)}
																className="h-8 px-2 text-xs"
															>
																Cancel
															</Button>
															<Button
																variant="ghost"
																size="sm"
																disabled={isDeleting}
																onClick={() => deleteEntry(entry.id)}
																className="h-8 px-2 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
															>
																{isDeleting ? "Deleting…" : "Confirm"}
															</Button>
														</div>
													) : (
														<div className="inline-flex items-center gap-1">
															<Button
																variant="ghost"
																size="sm"
																onClick={() => copyEntry(entry)}
																className={`h-8 px-2 text-xs ${isCopied ? "text-green-600" : "hover:text-primary"}`}
															>
																{isCopied ? (
																	<Check className="w-3.5 h-3.5" />
																) : (
																	<Copy className="w-3.5 h-3.5" />
																)}
															</Button>
															<Button
																variant="ghost"
																size="sm"
																onClick={() => setPendingDeleteId(entry.id)}
																className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
															>
																<Trash2 className="w-3.5 h-3.5" />
															</Button>
														</div>
													)}
												</td>
											</tr>
										);
									})}
								</Fragment>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
