import { Button } from "@/components/ui/button";
import { DeleteConfirmPopover } from "@/components/delete-confirm-popover";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { writeText } from "@tauri-apps/plugin-clipboard-manager";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import {
	Check,
	ChevronRight,
	Copy,
	FileAudio,
	Loader2,
	Mic,
	Sparkles,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface DictationDetail {
	id: string;
	raw_text: string;
	cleaned_text: string;
	provider: string;
	duration_ms: number;
	created_at: string;
	audio_path?: string | null;
	transcription_ms?: number | null;
	cleanup_ms?: number | null;
	paste_ms?: number | null;
	engine?: string | null;
	model?: string | null;
}

export const Route = createFileRoute("/history/$id")({
	component: TranscriptionDetailPage,
});

function attachmentFilename(path: string): string {
	return path.split(/[/\\]/).pop() || "Audio file";
}

function formatDuration(ms: number): string {
	const secs = Math.round(ms / 1000);
	if (secs < 60) return `${secs}s`;
	return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function formatDateTime(iso: string): string {
	const d = new Date(iso + "Z");
	return d.toLocaleString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

function providerLabel(provider: string): string {
	if (provider === "local-file") return "File transcription";
	return "Live dictation";
}

function TranscriptionDetailPage() {
	const { id } = Route.useParams();
	const navigate = useNavigate();
	const [entry, setEntry] = useState<DictationDetail | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deletingAudio, setDeletingAudio] = useState(false);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await invoke<DictationDetail | null>("get_dictation", {
				id,
			});
			if (!result) {
				setError("Transcription not found");
				setEntry(null);
			} else {
				setEntry(result);
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : String(e));
			setEntry(null);
		} finally {
			setLoading(false);
		}
	}, [id]);

	useEffect(() => {
		void load();
	}, [load]);

	async function copyText() {
		if (!entry) return;
		const text = entry.cleaned_text || entry.raw_text;
		try {
			await writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (e) {
			console.error("Failed to copy:", e);
		}
	}

	async function deleteEntry() {
		if (!entry) return;
		setDeleting(true);
		try {
			await invoke("delete_dictation", { id: entry.id });
			void navigate({ to: "/" });
		} catch (e) {
			console.error("Failed to delete:", e);
			setDeleting(false);
		}
	}

	async function deleteAudio() {
		if (!entry) return;
		setDeletingAudio(true);
		try {
			await invoke("delete_dictation_audio", { id: entry.id });
			setEntry((prev) => (prev ? { ...prev, audio_path: null } : prev));
		} catch (e) {
			console.error("Failed to delete audio:", e);
		} finally {
			setDeletingAudio(false);
		}
	}

	async function revealAttachment(path: string) {
		try {
			await revealItemInDir(path);
		} catch (e) {
			console.error("Failed to reveal file:", e);
		}
	}

	const preview = entry
		? (entry.cleaned_text || entry.raw_text).trim()
		: "";
	const crumbLabel = preview
		? preview.slice(0, 48) + (preview.length > 48 ? "…" : "")
		: "Transcription";

	const hasCleaned =
		Boolean(entry?.cleaned_text) &&
		entry != null &&
		entry.cleaned_text !== entry.raw_text;

	return (
		<div className="flex flex-col flex-1 min-h-0 pt-6 lg:pt-8">
			<header className="shrink-0 pb-4 mb-0 border-b border-border/40">
				<nav
					aria-label="Breadcrumb"
					className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0 mb-3"
				>
					<Link
						to="/"
						className="hover:text-foreground transition-colors shrink-0 no-underline"
					>
						History
					</Link>
					<ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
					<span className="text-foreground font-medium truncate">
						{loading ? "Loading…" : crumbLabel}
					</span>
				</nav>

				{entry && !loading && !error && (
					<div className="flex items-start justify-between gap-4">
						<div className="min-w-0">
							<div className="flex items-center gap-2 flex-wrap">
								<h1 className="text-2xl font-bold text-foreground tracking-tight">
									Transcription
								</h1>
								{hasCleaned && (
									<span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
										<Sparkles className="w-3 h-3" />
										Cleaned
									</span>
								)}
							</div>
							<p className="text-sm text-muted-foreground mt-1">
								{formatDateTime(entry.created_at)} ·{" "}
								{formatDuration(entry.duration_ms)}
							</p>
						</div>
						<div className="flex items-center gap-1.5 shrink-0">
							<Button
								variant="outline"
								size="sm"
								onClick={() => void copyText()}
								className={copied ? "text-green-600" : undefined}
							>
								{copied ? (
									<Check className="w-4 h-4 mr-1.5" />
								) : (
									<Copy className="w-4 h-4 mr-1.5" />
								)}
								{copied ? "Copied" : "Copy"}
							</Button>
							<DeleteConfirmPopover
								message="Delete this transcription?"
								onConfirm={() => void deleteEntry()}
								isDeleting={deleting}
							>
								<Button
									variant="ghost"
									size="sm"
									className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
								>
									<Trash2 className="w-4 h-4" />
								</Button>
							</DeleteConfirmPopover>
						</div>
					</div>
				)}
			</header>

			{loading ? (
				<div className="flex-1 flex items-center justify-center">
					<Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
				</div>
			) : error || !entry ? (
				<div className="flex-1 flex flex-col items-center justify-center text-center px-4">
					<div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
						<Mic className="w-8 h-8 text-muted-foreground/50" />
					</div>
					<h3 className="text-lg font-semibold text-foreground mb-1">
						{error || "Transcription not found"}
					</h3>
					<p className="text-sm text-muted-foreground mb-4">
						It may have been deleted.
					</p>
					<Button variant="outline" size="sm" asChild>
						<Link to="/">Back to History</Link>
					</Button>
				</div>
			) : (
				<DetailContent
					entry={entry}
					deletingAudio={deletingAudio}
					onDeleteAudio={() => void deleteAudio()}
					onRevealAttachment={(path) => void revealAttachment(path)}
				/>
			)}
		</div>
	);
}

function DetailContent({
	entry,
	deletingAudio,
	onDeleteAudio,
	onRevealAttachment,
}: {
	entry: DictationDetail;
	deletingAudio: boolean;
	onDeleteAudio: () => void;
	onRevealAttachment: (path: string) => void;
}) {
	const display = entry.cleaned_text || entry.raw_text;
	const hasCleaned =
		Boolean(entry.cleaned_text) && entry.cleaned_text !== entry.raw_text;
	const audioPath = entry.audio_path || null;
	const wordCount = display.trim() ? display.trim().split(/\s+/).length : 0;

	const metaItems: { label: string; value: string }[] = [
		{ label: "When", value: formatDateTime(entry.created_at) },
		{ label: "Audio length", value: formatDuration(entry.duration_ms) },
		{ label: "Source", value: providerLabel(entry.provider) },
		{ label: "Words", value: String(wordCount) },
	];

	return (
		<div className="flex flex-col md:flex-row flex-1 min-h-0 gap-8 md:gap-10 pt-6">
			<div className="flex-1 min-w-0 min-h-0 overflow-y-auto space-y-5 pb-8">
				<section className="rounded-xl border border-border bg-card px-5 py-5">
					<p className="text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
						{display}
					</p>
				</section>

				{hasCleaned && (
					<section className="rounded-xl border border-border/60 bg-muted/20 px-5 py-4">
						<p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
							<span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
							Raw transcription
						</p>
						<p className="text-sm text-muted-foreground italic leading-relaxed whitespace-pre-wrap">
							{entry.raw_text}
						</p>
					</section>
				)}
			</div>

			<aside className="w-full md:w-44 shrink-0 md:overflow-y-auto md:pb-8 min-w-0">
				<h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
					Details
				</h2>
				<dl className="space-y-4">
					{metaItems.map((item) => (
						<div key={item.label}>
							<dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
								{item.label}
							</dt>
							<dd className="text-sm text-foreground mt-0.5 leading-snug break-words">
								{item.value}
							</dd>
						</div>
					))}
					{audioPath && (
						<div className="min-w-0">
							<dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
								Attachment
							</dt>
							<dd className="mt-1 min-w-0">
								<div className="flex flex-col items-stretch gap-1 min-w-0">
									<button
										type="button"
										onClick={() => onRevealAttachment(audioPath)}
										className="inline-flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors min-w-0 max-w-full"
										title={attachmentFilename(audioPath)}
									>
										<FileAudio className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
										<span className="truncate min-w-0">
											{attachmentFilename(audioPath)}
										</span>
									</button>
									<DeleteConfirmPopover
										message="Remove this audio attachment?"
										confirmLabel="Remove"
										deletingLabel="Removing…"
										align="start"
										onConfirm={onDeleteAudio}
										isDeleting={deletingAudio}
									>
										<button
											type="button"
											className="text-xs text-muted-foreground hover:text-destructive transition-colors self-start"
										>
											Remove
										</button>
									</DeleteConfirmPopover>
								</div>
							</dd>
						</div>
					)}
				</dl>
			</aside>
		</div>
	);
}
