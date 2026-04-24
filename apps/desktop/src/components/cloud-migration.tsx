import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
	Cloud,
	CloudDownload,
	CloudUpload,
	Loader2,
	RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface MigrationStatus {
	tierOk: boolean;
	paid: boolean;
	completed: boolean;
	paidAt: string | null;
	completedAt: string | null;
}

interface MigrationSnapshot {
	status: MigrationStatus;
	total_history: number;
	unmigrated_history: number;
	pending_audio: number;
	setup_mode: string;
}

interface MigrationProgress {
	phase: "preparing" | "history" | "audio" | "done";
	done: number;
	total: number;
}

interface MigrationResult {
	inserted: number;
	skipped: number;
	audio_uploaded: number;
	audio_failed: number;
}

interface AudioRetryResult {
	uploaded: number;
	failed: number;
}

export function CloudMigration() {
	const [snapshot, setSnapshot] = useState<MigrationSnapshot | null>(null);
	const [running, setRunning] = useState(false);
	const [retryingAudio, setRetryingAudio] = useState(false);
	const [progress, setProgress] = useState<MigrationProgress | null>(null);
	const [result, setResult] = useState<MigrationResult | null>(null);
	const [audioRetryResult, setAudioRetryResult] =
		useState<AudioRetryResult | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirmRevert, setConfirmRevert] = useState(false);

	const loadSnapshot = useCallback(async () => {
		try {
			const s = await invoke<MigrationSnapshot>("get_migration_snapshot");
			setSnapshot(s);
		} catch {
			setSnapshot(null);
		}
	}, []);

	useEffect(() => {
		loadSnapshot();
	}, [loadSnapshot]);

	useEffect(() => {
		const unlisten = listen<MigrationProgress>("migration-progress", (e) => {
			setProgress(e.payload);
		});
		return () => {
			unlisten.then((f) => f());
		};
	}, []);

	const startCheckout = useCallback(async () => {
		setError(null);
		try {
			const url = await invoke<string>("get_migration_checkout_url");
			await openUrl(url);
		} catch (e) {
			setError(String(e));
		}
	}, []);

	const startMigration = useCallback(async () => {
		setError(null);
		setResult(null);
		setAudioRetryResult(null);
		setRunning(true);
		setProgress({ phase: "preparing", done: 0, total: 0 });
		try {
			const res = await invoke<MigrationResult>("migrate_local_to_cloud");
			setResult(res);
			await loadSnapshot();
		} catch (e) {
			setError(String(e));
		} finally {
			setRunning(false);
		}
	}, [loadSnapshot]);

	const retryAudio = useCallback(async () => {
		setError(null);
		setAudioRetryResult(null);
		setRetryingAudio(true);
		setProgress({ phase: "audio", done: 0, total: 0 });
		try {
			const res = await invoke<AudioRetryResult>("retry_failed_audio");
			setAudioRetryResult(res);
			await loadSnapshot();
		} catch (e) {
			setError(String(e));
		} finally {
			setRetryingAudio(false);
		}
	}, [loadSnapshot]);

	const revert = useCallback(async () => {
		setError(null);
		try {
			await invoke("revert_to_local");
			setConfirmRevert(false);
			await loadSnapshot();
		} catch (e) {
			setError(String(e));
		}
	}, [loadSnapshot]);

	const status = snapshot?.status;
	const setupMode = snapshot?.setup_mode ?? "local";
	const unmigrated = snapshot?.unmigrated_history ?? 0;
	const total = snapshot?.total_history ?? 0;
	const pendingAudio = snapshot?.pending_audio ?? 0;
	const resuming = unmigrated > 0 && unmigrated < total;

	const progressPct =
		progress && progress.total > 0
			? Math.round((progress.done / progress.total) * 100)
			: 0;

	const busy = running || retryingAudio;

	return (
		<section className="bg-card rounded-2xl border border-border p-5">
			<div className="flex items-start gap-4 mb-4">
				<div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
					<Cloud className="w-5 h-5 text-sky-500" />
				</div>
				<div className="flex-1">
					<h2 className="text-base font-semibold text-foreground">
						Cloud sync
					</h2>
					<p className="text-sm text-muted-foreground">
						Move your local dictation history to your cloud account. One-time, $5.
					</p>
				</div>
				<div className="text-xs text-muted-foreground">
					Mode: <span className="font-medium">{setupMode}</span>
				</div>
			</div>

			{/* Completed state */}
			{status?.completed && (
				<div className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400 space-y-1">
					<p>
						Migration completed
						{status.completedAt
							? ` on ${new Date(status.completedAt).toLocaleDateString()}`
							: ""}
						. One-time migration is used.
					</p>
					{pendingAudio > 0 && (
						<p className="text-xs">
							{pendingAudio} audio file{pendingAudio === 1 ? "" : "s"} still
							pending upload.
						</p>
					)}
				</div>
			)}

			{/* Need cloud upgrade */}
			{!status?.tierOk && !status?.completed && (
				<div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
					Upgrade to a cloud plan to migrate your local data.
				</div>
			)}

			{/* Paywall */}
			{status?.tierOk && !status?.paid && !status?.completed && (
				<div className="space-y-3">
					<p className="text-sm text-muted-foreground">
						Pay the one-time $5 migration fee to unlock syncing your local history to the cloud.
					</p>
					<Button onClick={startCheckout}>
						<CloudUpload className="w-4 h-4 mr-2" />
						Pay $5 & unlock migration
					</Button>
					<p className="text-xs text-muted-foreground">
						After paying, come back here to start the migration.
					</p>
				</div>
			)}

			{/* Paid, ready or resuming */}
			{status?.tierOk && status?.paid && !status?.completed && !busy && !result && (
				<div className="space-y-3">
					<p className="text-sm text-muted-foreground">
						{resuming
							? `Resume migration — ${unmigrated} of ${total} dictations still to sync.`
							: total === 0
								? "No local dictations to migrate."
								: `Ready to migrate ${total} dictation${
										total === 1 ? "" : "s"
									} and your profile. Local data stays on this device.`}
					</p>
					<Button onClick={startMigration} disabled={total === 0}>
						<CloudUpload className="w-4 h-4 mr-2" />
						{resuming ? "Resume migration" : "Start migration"}
					</Button>
				</div>
			)}

			{/* In-progress */}
			{busy && progress && (
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<Loader2 className="w-4 h-4 animate-spin" />
						<span className="capitalize">{progress.phase}</span>
						<span>
							{progress.done} / {progress.total}
						</span>
					</div>
					<div className="h-2 rounded-full bg-muted overflow-hidden">
						<div
							className="h-full bg-sky-500 transition-all"
							style={{ width: `${progressPct}%` }}
						/>
					</div>
				</div>
			)}

			{/* Migration result */}
			{result && !busy && (
				<div className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-700 dark:text-emerald-400 space-y-1">
					<p>Migration complete.</p>
					<p className="text-xs">
						{result.inserted} inserted, {result.skipped} skipped,{" "}
						{result.audio_uploaded} audio uploaded
						{result.audio_failed > 0
							? `, ${result.audio_failed} audio failed`
							: ""}
						.
					</p>
				</div>
			)}

			{/* Audio retry affordance: shown whenever pending audio > 0 and not actively migrating */}
			{pendingAudio > 0 && !running && (
				<div className="mt-3 rounded-xl bg-amber-500/10 p-4 space-y-2">
					<p className="text-sm text-foreground">
						{pendingAudio} audio file{pendingAudio === 1 ? "" : "s"} failed to
						upload.
					</p>
					<Button size="sm" onClick={retryAudio} disabled={retryingAudio}>
						<RefreshCw
							className={`w-4 h-4 mr-2 ${retryingAudio ? "animate-spin" : ""}`}
						/>
						Retry {pendingAudio} audio file{pendingAudio === 1 ? "" : "s"}
					</Button>
					{audioRetryResult && (
						<p className="text-xs text-muted-foreground">
							{audioRetryResult.uploaded} uploaded
							{audioRetryResult.failed > 0
								? `, ${audioRetryResult.failed} still failing`
								: ""}
							.
						</p>
					)}
				</div>
			)}

			{/* Revert */}
			{setupMode === "cloud" && !busy && (
				<div className="mt-4 pt-4 border-t border-border">
					{!confirmRevert ? (
						<button
							type="button"
							onClick={() => setConfirmRevert(true)}
							className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
						>
							<CloudDownload className="w-4 h-4" />
							Switch back to local mode
						</button>
					) : (
						<div className="rounded-xl bg-amber-500/10 p-4 space-y-3">
							<p className="text-sm text-foreground font-medium">
								Switch to local mode?
							</p>
							<ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
								<li>
									Your cloud data stays in the cloud and will not be copied
									back.
								</li>
								<li>New dictations made in local mode won't sync to cloud.</li>
								{unmigrated > 0 && (
									<li>
										{unmigrated} local dictation{unmigrated === 1 ? "" : "s"}{" "}
										{unmigrated === 1 ? "was" : "were"} never synced and{" "}
										{unmigrated === 1 ? "stays" : "stay"} local-only.
									</li>
								)}
							</ul>
							<div className="flex gap-2">
								<Button size="sm" variant="destructive" onClick={revert}>
									Switch to local
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setConfirmRevert(false)}
								>
									Cancel
								</Button>
							</div>
						</div>
					)}
				</div>
			)}

			{error && (
				<div className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
					{error}
				</div>
			)}
		</section>
	);
}
