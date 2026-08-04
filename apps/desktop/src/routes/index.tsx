import { Button } from "@/components/ui/button";
import { DeleteConfirmPopover } from "@/components/delete-confirm-popover";
import { Input } from "@/components/ui/input";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
	Check,
	Copy,
	FileAudio,
	Loader2,
	Mic,
	Search,
	Sparkles,
	Trash2,
	Upload,
} from "lucide-react";
import {
	Fragment,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

interface DictationEntry {
	id: string;
	raw_text: string;
	cleaned_text: string;
	provider: string;
	duration_ms: number;
	created_at: string;
	audio_path?: string | null;
}

interface FileTranscriptionProgress {
	stage: string;
	progress: number;
	filename: string;
}

export const Route = createFileRoute("/")({
	component: HomePage,
});

const STAGE_LABELS: Record<string, string> = {
	decoding: "Decoding audio…",
	transcribing: "Transcribing…",
	saving: "Saving attachment…",
	cleaning: "Cleaning up…",
	done: "Done",
};

function attachmentFilename(path: string): string {
	return path.split(/[/\\]/).pop() || "Audio file";
}

function HomePage() {
	const navigate = useNavigate();
	const [entries, setEntries] = useState<DictationEntry[]>([]);
	const [search, setSearch] = useState("");
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [pendingDeleteAudioId, setPendingDeleteAudioId] = useState<
		string | null
	>(null);
	const [deletingAudioId, setDeletingAudioId] = useState<string | null>(null);
	const [fileBusy, setFileBusy] = useState(false);
	const [fileError, setFileError] = useState<string | null>(null);
	const [fileProgress, setFileProgress] = useState<string | null>(null);
	const [fileProgressPct, setFileProgressPct] = useState(0);
	const [fileName, setFileName] = useState<string | null>(null);
	const [dragOver, setDragOver] = useState(false);
	const fileBusyRef = useRef(false);

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
		fileBusyRef.current = fileBusy;
	}, [fileBusy]);

	useEffect(() => {
		const unsub = listen("dictation-complete", () => {
			loadHistory();
		});
		return () => {
			unsub.then((f) => f());
		};
	}, [loadHistory]);

	useEffect(() => {
		const unsub = listen<FileTranscriptionProgress>(
			"file-transcription-progress",
			(event) => {
				const { stage, progress, filename } = event.payload;
				setFileProgressPct(progress);
				setFileName(filename);
				if (stage === "done") {
					setFileProgress("Done — copied to clipboard");
				} else {
					setFileProgress(STAGE_LABELS[stage] || "Working…");
				}
			},
		);
		return () => {
			unsub.then((f) => f());
		};
	}, []);

	useEffect(() => {
		if (!fileBusy) return;
		const id = window.setInterval(() => {
			setFileProgressPct((prev) => {
				// Creep toward the next stage ceiling so long STT doesn't look frozen.
				if (prev >= 95 || prev < 8) return prev;
				const ceiling =
					prev < 35 ? 34 : prev < 72 ? 70 : prev < 82 ? 81 : 94;
				if (prev >= ceiling) return prev;
				return Math.min(ceiling, prev + 0.4);
			});
		}, 400);
		return () => window.clearInterval(id);
	}, [fileBusy]);

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
		} catch (e) {
			console.error("Failed to delete:", e);
		} finally {
			setDeletingId(null);
		}
	}

	async function deleteAudioAttachment(id: string) {
		setDeletingAudioId(id);
		try {
			await invoke("delete_dictation_audio", { id });
			setEntries((prev) =>
				prev.map((e) => (e.id === id ? { ...e, audio_path: null } : e)),
			);
		} catch (e) {
			console.error("Failed to delete audio:", e);
		} finally {
			setDeletingAudioId(null);
			setPendingDeleteAudioId(null);
		}
	}

	async function revealAttachment(path: string) {
		try {
			await revealItemInDir(path);
		} catch (e) {
			console.error("Failed to reveal file:", e);
		}
	}

	const SUPPORTED_AUDIO_EXTENSIONS = [
		".wav",
		".mp3",
		".m4a",
		".mp4",
		".mov",
		".aac",
		".flac",
		".ogg",
		".oga",
		".aiff",
		".aif",
		".caf",
	];

	async function pickAndTranscribeFile() {
		if (fileBusyRef.current) return;
		setFileError(null);
		try {
			const path = await open({
				multiple: false,
				title: "Choose an audio file to transcribe",
				filters: [
					{
						name: "Audio",
						extensions: [
							"wav",
							"mp3",
							"m4a",
							"mp4",
							"mov",
							"aac",
							"flac",
							"ogg",
							"oga",
							"aiff",
							"aif",
							"caf",
						],
					},
				],
			});
			if (!path) return;
			await transcribeFilePath(path);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setFileError(msg);
		}
	}

	async function transcribeFilePath(filePath: string) {
		if (fileBusyRef.current) return;
		const filename = filePath.split(/[/\\]/).pop() || filePath;
		setFileError(null);
		const name = filename.toLowerCase();
		if (!SUPPORTED_AUDIO_EXTENSIONS.some((ext) => name.endsWith(ext))) {
			setFileError(
				"Unsupported file type. Supported formats: WAV, MP3, M4A, MP4, MOV, AAC, FLAC, OGG, AIFF, CAF.",
			);
			return;
		}
		fileBusyRef.current = true;
		setFileBusy(true);
		setFileName(filename);
		setFileProgressPct(8);
		setFileProgress(`Preparing ${filename}…`);
		try {
			const result = await invoke<{
				raw_text: string;
				cleaned_text: string;
			}>("transcribe_audio_file_path", {
				filePath,
			});
			const text = result.cleaned_text || result.raw_text;
			setFileProgressPct(100);
			setFileProgress(
				text
					? "Done — copied to clipboard"
					: "No speech detected in that file",
			);
			await loadHistory();
			setTimeout(() => {
				setFileProgress(null);
				setFileProgressPct(0);
				setFileName(null);
			}, 2500);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setFileError(msg);
			setFileProgress(null);
			setFileProgressPct(0);
			setFileName(null);
		} finally {
			fileBusyRef.current = false;
			setFileBusy(false);
		}
	}

	useEffect(() => {
		const setupListeners = async () => {
			try {
				await getCurrentWindow().onDragDropEvent((event) => {
					const { type } = event.payload;
					if (type === "enter" || type === "over") {
						if (!fileBusyRef.current) setDragOver(true);
					} else if (type === "drop") {
						setDragOver(false);
						if (fileBusyRef.current) return;
						const path = event.payload.paths?.[0];
						if (path) void transcribeFilePath(path);
					} else if (type === "leave") {
						setDragOver(false);
					}
				});
			} catch (e) {
				console.error("Failed to set up file drop listener:", e);
			}
		};
		setupListeners();
	}, []);

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

	const dropzoneLabel = fileBusy
		? fileProgress || "Working on your file…"
		: dragOver
			? "Drop to transcribe"
			: "Drop an audio file here to transcribe";

	const dropzoneHint = fileBusy
		? fileName
			? `${fileName} · please wait — another file can’t be started yet`
			: "Please wait — another file can’t be started yet"
		: "WAV, MP3, M4A, MP4, MOV, AAC, FLAC, OGG, AIFF, CAF · Runs fully on-device. Result is saved to history and copied to the clipboard.";

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
				<div className="flex items-center gap-2">
					{entries.length > 0 && (
						<div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg text-xs text-muted-foreground">
							<Mic className="w-3.5 h-3.5" />
							<span>{entries.length} entries</span>
						</div>
					)}
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={fileBusy}
						onClick={() => void pickAndTranscribeFile()}
					>
						{fileBusy ? (
							<Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
						) : (
							<FileAudio className="w-4 h-4 mr-1.5" />
						)}
						{fileBusy ? "Transcribing…" : "Transcribe file"}
					</Button>
				</div>
			</div>

			<div
				aria-busy={fileBusy}
				className={`relative overflow-hidden rounded-xl border-2 border-dashed px-4 py-6 flex flex-col sm:flex-row items-center justify-center gap-3 transition-[border-color,background-color,opacity] duration-200 ${
					fileBusy
						? "border-primary/50 bg-primary/5 cursor-wait"
						: dragOver
							? "border-primary bg-primary/10"
							: "border-border bg-muted/20"
				}`}
			>
				{fileBusy && (
					<div
						className="absolute inset-y-0 left-0 bg-primary/15 transition-[width] duration-500 ease-out pointer-events-none"
						style={{ width: `${Math.min(100, Math.max(0, fileProgressPct))}%` }}
					/>
				)}
				{fileBusy ? (
					<Loader2 className="relative z-10 w-5 h-5 shrink-0 text-primary animate-spin" />
				) : (
					<Upload
						className={`relative z-10 w-5 h-5 shrink-0 ${dragOver ? "text-primary" : "text-muted-foreground"}`}
					/>
				)}
				<div className="relative z-10 text-center sm:text-left min-w-0">
					<p className="text-sm font-medium text-foreground">
						{dropzoneLabel}
					</p>
					<p className="text-xs text-muted-foreground mt-0.5">
						{dropzoneHint}
					</p>
				</div>
				{fileBusy && (
					<span className="relative z-10 tabular-nums text-xs font-medium text-primary shrink-0">
						{Math.round(fileProgressPct)}%
					</span>
				)}
			</div>
			{fileError && (
				<p className="text-sm text-destructive -mt-3">{fileError}</p>
			)}
			{fileProgress && !fileBusy && (
				<p className="text-sm text-primary -mt-3">{fileProgress}</p>
			)}

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
								<th className="w-10 px-2 py-2.5" aria-label="Status" />
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
											colSpan={4}
											className="px-4 py-2 text-[11px] font-bold text-foreground uppercase tracking-wider"
										>
											{group.label}
										</td>
									</tr>
									{group.entries.map((entry) => {
										const display = entry.cleaned_text || entry.raw_text;
										const hasCleaned =
											entry.cleaned_text &&
											entry.cleaned_text !== entry.raw_text;
										const isCopied = copiedId === entry.id;
										const isDeleting = deletingId === entry.id;
										const audioPath = entry.audio_path || null;
										const isDeletingAudio = deletingAudioId === entry.id;
										const isPendingDeleteAudio =
											pendingDeleteAudioId === entry.id;

										return (
											<tr
												key={entry.id}
												className="border-t border-border/60 hover:bg-muted/20 transition-colors align-middle cursor-pointer"
												onClick={() =>
													void navigate({
														to: "/history/$id",
														params: { id: entry.id },
													})
												}
											>
												<td className="px-4 py-3">
													<p className="text-[14px] leading-relaxed text-foreground line-clamp-2">
														{display}
													</p>
												</td>
												<td
													className="px-2 py-3 align-middle"
													onClick={(e) => e.stopPropagation()}
												>
													<div className="flex flex-col items-center gap-1.5">
														{hasCleaned && (
															<Sparkles
																className="w-3.5 h-3.5 text-primary shrink-0"
																aria-label="Cleaned"
															/>
														)}
														{audioPath && (
															<DeleteConfirmPopover
																message="Remove this audio attachment?"
																confirmLabel="Remove"
																deletingLabel="Removing…"
																open={isPendingDeleteAudio}
																onOpenChange={(open) => {
																	setPendingDeleteAudioId(
																		open ? entry.id : null,
																	);
																}}
																trigger="manual"
																side="right"
																align="center"
																onConfirm={() =>
																	deleteAudioAttachment(entry.id)
																}
																isDeleting={isDeletingAudio}
															>
																<button
																	type="button"
																	onClick={() =>
																		void revealAttachment(audioPath)
																	}
																	onContextMenu={(e) => {
																		e.preventDefault();
																		setPendingDeleteAudioId(entry.id);
																	}}
																	className="inline-flex text-muted-foreground hover:text-foreground transition-colors"
																	title={attachmentFilename(audioPath)}
																	aria-label={attachmentFilename(audioPath)}
																>
																	<FileAudio className="w-3.5 h-3.5" />
																</button>
															</DeleteConfirmPopover>
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
												<td
													className="px-4 py-3 text-right whitespace-nowrap"
													onClick={(e) => e.stopPropagation()}
												>
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
														<DeleteConfirmPopover
															message="Delete this transcription?"
															onConfirm={() => deleteEntry(entry.id)}
															isDeleting={isDeleting}
														>
															<Button
																variant="ghost"
																size="sm"
																className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
															>
																<Trash2 className="w-3.5 h-3.5" />
															</Button>
														</DeleteConfirmPopover>
													</div>
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
