import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import {
	Check,
	Copy,
	FileAudio,
	Lightbulb,
	Loader2,
	Mic,
	Search,
	Sparkles,
	Trash2,
	Upload,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";

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
	const [fileBusy, setFileBusy] = useState(false);
	const [fileError, setFileError] = useState<string | null>(null);
	const [fileProgress, setFileProgress] = useState<string | null>(null);
	const [dragOver, setDragOver] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

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

	const SUPPORTED_AUDIO_EXTENSIONS = [
		".wav",
		".mp3",
		".m4a",
		".aac",
		".flac",
		".ogg",
		".oga",
		".aiff",
		".aif",
		".caf",
	];

	async function transcribeFile(file: File) {
		setFileError(null);
		const name = file.name.toLowerCase();
		if (!SUPPORTED_AUDIO_EXTENSIONS.some((ext) => name.endsWith(ext))) {
			setFileError(
				"Unsupported file type. Supported formats: WAV, MP3, M4A, AAC, FLAC, OGG, AIFF, CAF.",
			);
			return;
		}
		setFileBusy(true);
		setFileProgress(`Reading ${file.name}…`);
		try {
			const buf = await file.arrayBuffer();
			const data = Array.from(new Uint8Array(buf));
			setFileProgress("Transcribing…");
			const result = await invoke<{
				raw_text: string;
				cleaned_text: string;
			}>("transcribe_audio_file", {
				data,
				filename: file.name,
			});
			const text = result.cleaned_text || result.raw_text;
			setFileProgress(
				text
					? "Done — copied to clipboard"
					: "No speech detected in that file",
			);
			await loadHistory();
			setTimeout(() => setFileProgress(null), 2500);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setFileError(msg);
			setFileProgress(null);
		} finally {
			setFileBusy(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	}

	function onDrop(e: React.DragEvent) {
		e.preventDefault();
		setDragOver(false);
		const file = e.dataTransfer.files?.[0];
		if (file) void transcribeFile(file);
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
		<div
			className="space-y-6"
			onDragOver={(e) => {
				e.preventDefault();
				setDragOver(true);
			}}
			onDragLeave={() => setDragOver(false)}
			onDrop={onDrop}
		>
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-bold text-foreground tracking-tight">
						Dictation History
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Review and copy your past transcriptions
					</p>
				</div>
				<div className="flex items-center gap-2">
					{entries.length > 0 && (
						<div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-xs text-muted-foreground">
							<Mic className="w-3.5 h-3.5" />
							<span>{entries.length} entries</span>
						</div>
					)}
					<input
						ref={fileInputRef}
						type="file"
						accept=".wav,.mp3,.m4a,.aac,.flac,.ogg,.oga,.aiff,.aif,.caf,audio/*"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) void transcribeFile(f);
						}}
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={fileBusy}
						onClick={() => fileInputRef.current?.click()}
					>
						{fileBusy ? (
							<Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
						) : (
							<FileAudio className="w-4 h-4 mr-1.5" />
						)}
						Transcribe file
					</Button>
				</div>
			</div>

			<div
				className={`rounded-xl border-2 border-dashed px-4 py-6 flex flex-col sm:flex-row items-center justify-center gap-3 transition-colors ${
					dragOver
						? "border-primary bg-primary/10"
						: "border-border bg-muted/20"
				}`}
			>
				<Upload
					className={`w-5 h-5 shrink-0 ${dragOver ? "text-primary" : "text-muted-foreground"}`}
				/>
				<div className="text-center sm:text-left">
					<p className="text-sm font-medium text-foreground">
						{fileBusy
							? fileProgress || "Working…"
							: "Drop an audio file here to transcribe"}
					</p>
					<p className="text-xs text-muted-foreground mt-0.5">
						Runs fully on-device. Result is saved to history and copied to the
						clipboard.
					</p>
				</div>
			</div>
			{fileError && (
				<p className="text-sm text-destructive -mt-3">{fileError}</p>
			)}
			{fileProgress && !fileBusy && (
				<p className="text-sm text-primary -mt-3">{fileProgress}</p>
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
									<tr className="bg-secondary border-t border-border">
										<td
											colSpan={3}
											className="px-4 py-2 text-[11px] font-bold text-foreground uppercase tracking-wider"
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
