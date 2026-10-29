import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { AppIcon } from "@/components/app-icon";
import { TrafficLights } from "@/components/panel";
import { cn } from "@/lib/utils";

// A mock Mac desktop: pick an app, press fn, and watch Parrot dictate into it.
// The indicator mirrors apps/desktop/src/components/hud-orb.tsx: an idle parrot
// orb, then a green chip for recording → "Transcribing…" → "Cleaning up…" → idle.

type AppId = "slack" | "mail" | "vscode" | "notes";
type Phase = "idle" | "recording" | "transcribing" | "cleaning";

// In `said`, [brackets] mark filler and self-corrections that cleanup removes.
const DEMOS: Record<
	AppId,
	{ label: string; menu: string; title: string; said: string; clean: string }
> = {
	slack: {
		label: "Slack",
		menu: "Slack",
		title: "launch · Northwind",
		said: "[Um,] the build is green. Can we ship it [on Thursday, no wait,] Friday? And loop in Priya.",
		clean: "The build is green. Can we ship it Friday? And loop in Priya.",
	},
	mail: {
		label: "Mail",
		menu: "Mail",
		title: "Re: Renewal contract",
		said: "Hi Dana, thanks for sending the contract over. I read through it and [uh,] the renewal terms look good. I have one question about section four.",
		clean:
			"Hi Dana, thanks for sending the contract over. I read through it and the renewal terms look good. I have one question about section four.",
	},
	vscode: {
		label: "VS Code",
		menu: "Code",
		title: "useAuth.ts — northwind-web",
		said: "Refactor the use auth hook so it [uh,] retries the token refresh once before logging the user out.",
		clean:
			"Refactor the useAuth hook so it retries the token refresh once before logging the user out.",
	},
	notes: {
		label: "Notes",
		menu: "Notes",
		title: "Notes",
		said: "[Um,] talked about the Q3 roadmap. Sam wants the onboarding redesign first, [uh,] then the billing page.",
		clean:
			"Talked about the Q3 roadmap. Sam wants the onboarding redesign first, then the billing page.",
	},
};
const ORDER: AppId[] = ["slack", "mail", "vscode", "notes"];

type Word = { w: string; fill: boolean };
function tokenize(said: string): Word[] {
	const out: Word[] = [];
	for (const m of said.matchAll(/\[([^\]]+)\]|(\S+)/g)) {
		if (m[1]) for (const w of m[1].split(/\s+/)) out.push({ w, fill: true });
		else out.push({ w: m[2], fill: false });
	}
	return out;
}
const WORDS = Object.fromEntries(
	ORDER.map((id) => [id, tokenize(DEMOS[id].said)]),
) as Record<AppId, Word[]>;

const RESTING = Object.fromEntries(
	ORDER.map((id) => [id, DEMOS[id].clean]),
) as Record<AppId, string>;

class Superseded extends Error {}

export function DictationDemo() {
	const [app, setApp] = useState<AppId>("slack");
	const [phase, setPhase] = useState<Phase>("idle");
	const [shown, setShown] = useState(0);
	const [struck, setStruck] = useState(false);
	const [captionOn, setCaptionOn] = useState(false);
	// Every app starts with its finished text, so the first frame is never empty.
	const [texts, setTexts] = useState(RESTING);
	const [landed, setLanded] = useState(0);
	const [elapsed, setElapsed] = useState(0);
	const [pressed, setPressed] = useState(false);

	const run = useRef(0);
	const auto = useRef(true);
	const reduced = useRef(false);

	const play = useCallback(async (id: AppId) => {
		const token = ++run.current;
		const wait = (ms: number) =>
			new Promise<void>((resolve, reject) =>
				setTimeout(
					() => (token === run.current ? resolve() : reject(new Superseded())),
					ms,
				),
			);
		setApp(id);
		try {
			setTexts((t) => ({ ...t, [id]: "" }));
			setShown(0);
			setStruck(false);
			setCaptionOn(true);
			setPhase("recording");
			const started = Date.now();
			setElapsed(0);
			const tick = setInterval(
				() => setElapsed(Math.floor((Date.now() - started) / 1000)),
				250,
			);
			try {
				await wait(350);
				for (let i = 1; i <= WORDS[id].length; i++) {
					setShown(i);
					await wait(reduced.current ? 0 : 150 + Math.random() * 90);
				}
				await wait(300);
			} finally {
				clearInterval(tick);
			}
			setPhase("transcribing");
			await wait(550);
			setPhase("cleaning");
			setStruck(true);
			await wait(850);
			// Parrot pastes, so the text arrives all at once.
			setTexts((t) => ({ ...t, [id]: DEMOS[id].clean }));
			setLanded((n) => n + 1);
			setCaptionOn(false);
			setPhase("idle");
			if (auto.current) {
				await wait(3200);
				play(ORDER[(ORDER.indexOf(id) + 1) % ORDER.length]);
			}
		} catch (e) {
			if (!(e instanceof Superseded)) throw e;
		}
	}, []);

	useEffect(() => {
		reduced.current = window.matchMedia(
			"(prefers-reduced-motion: reduce)",
		).matches;
		auto.current = !reduced.current;
		const start = auto.current ? setTimeout(() => play("slack"), 900) : 0;
		return () => {
			clearTimeout(start);
			run.current++; // cancels any run in flight
		};
	}, [play]);

	const choose = (id: AppId) => {
		auto.current = false;
		play(id);
	};

	const demo = DEMOS[app];

	return (
		// biome-ignore lint/correctness/useUniqueElementIds: #demo is a link target and the demo renders once
		<div id="demo" className="mt-[clamp(40px,6vw,64px)] scroll-mt-24">
			<div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
				<div
					role="tablist"
					aria-label="Try it in"
					className="inline-flex flex-wrap gap-0.5 rounded-full border border-border bg-muted p-1"
				>
					{ORDER.map((id) => (
						<button
							key={id}
							type="button"
							role="tab"
							aria-selected={app === id}
							onClick={() => choose(id)}
							className={cn(
								"inline-flex items-center gap-[7px] rounded-full px-3.5 py-[7px] text-sm font-medium transition-colors",
								app === id
									? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.08),0_0_0_1px_var(--border)]"
									: "text-ink-2 hover:text-foreground",
							)}
						>
							<AppIcon app={id} />
							{DEMOS[id].label}
						</button>
					))}
				</div>
				<div className="inline-flex items-center gap-2.5 text-sm text-muted-foreground">
					<button
						type="button"
						aria-label="Press fn to dictate"
						onClick={() => choose(app)}
						onPointerDown={() => setPressed(true)}
						onPointerUp={() => setPressed(false)}
						onPointerLeave={() => setPressed(false)}
						className={cn(
							"grid h-[42px] w-[46px] place-items-center rounded-[9px] border border-border bg-card font-mono text-sm text-foreground transition-[transform,border-bottom-width] duration-100",
							pressed ? "translate-y-0.5 border-b" : "border-b-[3px]",
						)}
					>
						fn
					</button>
					<span>Press to dictate</span>
				</div>
			</div>

			<div className="demo-wallpaper relative overflow-hidden rounded-[22px] px-[clamp(12px,4vw,56px)] pt-[clamp(18px,4vw,48px)] pb-28">
				<MenuBar app={demo.menu} />

				<div className="relative mx-auto mt-[18px] max-w-[920px] overflow-hidden rounded-xl border border-black/10 bg-card text-sm text-card-foreground shadow-[0_30px_60px_-20px_rgba(16,37,26,0.35),0_12px_24px_-12px_rgba(16,37,26,0.25)]">
					<div className="flex h-[38px] items-center gap-2 border-b border-border bg-sunk px-3.5">
						<TrafficLights />
						<span className="mr-[50px] flex-1 text-center text-[12.5px] font-medium text-muted-foreground">
							{demo.title}
						</span>
					</div>
					{app === "slack" && (
						<SlackApp>
							<Target
								text={texts.slack}
								landed={landed}
								placeholder="Message #launch"
							/>
						</SlackApp>
					)}
					{app === "mail" && (
						<MailApp>
							<Target text={texts.mail} landed={landed} />
						</MailApp>
					)}
					{app === "vscode" && (
						<CodeApp>
							<Target
								text={texts.vscode}
								landed={landed}
								placeholder="Describe a change"
							/>
						</CodeApp>
					)}
					{app === "notes" && (
						<NotesApp>
							<Target text={texts.notes} landed={landed} />
						</NotesApp>
					)}
				</div>

				<div className="pointer-events-none absolute inset-x-0 bottom-[22px] grid justify-items-center gap-3">
					<p
						aria-hidden="true"
						className={cn(
							"m-0 max-w-[min(560px,calc(100%-32px))] rounded-[14px] bg-[rgba(12,22,15,0.78)] px-4 py-2.5 text-[15px] leading-snug text-[#f1f6ee] backdrop-blur-md transition-[opacity,transform] duration-250",
							captionOn ? "opacity-100" : "translate-y-1.5 opacity-0",
						)}
					>
						<span className="mb-0.5 block font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#f1f6ee]/55">
							You said
						</span>
						{WORDS[app].slice(0, shown).map((word, i) => (
							<span
								// Words repeat ("the"), so position is the identity here.
								// biome-ignore lint/suspicious/noArrayIndexKey: fixed, ordered token list
								key={i}
								className={cn(
									"transition-colors duration-300",
									word.fill && "text-[#f1f6ee]/50",
									word.fill &&
										struck &&
										"text-[#f1f6ee]/35 line-through decoration-[#f26a52]",
								)}
							>
								{word.w}{" "}
							</span>
						))}
					</p>
					<Indicator phase={phase} elapsed={elapsed} />
				</div>
			</div>
		</div>
	);
}

function Indicator({ phase, elapsed }: { phase: Phase; elapsed: number }) {
	if (phase === "idle") {
		return (
			<img
				src="/parrot-192.png"
				alt=""
				width={28}
				height={28}
				className="size-7 opacity-45"
			/>
		);
	}
	return (
		<span className="flex h-7 items-center gap-2 rounded-full bg-primary px-3 text-[11px] font-semibold text-primary-foreground shadow-[0_8px_24px_rgba(0,0,0,0.35)] ring-1 ring-white/35">
			{phase === "recording" ? (
				<>
					<span className="size-2 animate-caret rounded-full bg-current" />
					<span className="flex h-3 items-center gap-[2px]">
						{[0, 1, 2, 3, 4].map((i) => (
							<span
								key={i}
								className="h-1.5 w-[2px] animate-hud-bar rounded-sm bg-current"
								style={{ animationDelay: `${i * 0.12}s` }}
							/>
						))}
					</span>
					<span className="tabular-nums opacity-90">
						{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
					</span>
				</>
			) : (
				<>
					<span className="size-2.5 animate-spin rounded-full border-2 border-current/40 border-t-current" />
					{phase === "transcribing" ? "Transcribing…" : "Cleaning up…"}
				</>
			)}
		</span>
	);
}

function MenuBar({ app }: { app: string }) {
	return (
		<div
			aria-hidden="true"
			className="absolute inset-x-0 top-0 flex h-[26px] items-center gap-4 bg-[rgba(10,25,15,0.22)] px-3.5 text-xs text-white/90 backdrop-blur-md"
		>
			<b className="font-semibold">{app}</b>
			<span className="max-sm:hidden">File</span>
			<span className="max-sm:hidden">Edit</span>
			<span className="max-sm:hidden">View</span>
			<span className="max-sm:hidden">Window</span>
			<span className="flex-1" />
			<span className="inline-flex items-center gap-1.5 font-mono text-[11px]">
				<img
					src="/parrot-192.png"
					alt=""
					width={14}
					height={14}
					className="size-3.5"
				/>
				Parrot
			</span>
			<span className="font-mono text-[11px]">Thu 10:46</span>
		</div>
	);
}

function Target({
	text,
	landed,
	placeholder = "",
}: {
	text: string;
	landed: number;
	placeholder?: string;
}) {
	return (
		<div
			key={text ? landed : "empty"}
			className={cn(
				"min-h-[1.5em] whitespace-pre-line",
				text && landed > 0 && "animate-land",
			)}
		>
			{text || <span className="text-muted-foreground">{placeholder}</span>}
			<span
				aria-hidden="true"
				className="ml-px inline-block h-[1.1em] w-0.5 animate-caret bg-leaf align-[-0.2em]"
			/>
		</div>
	);
}

const SIDE = "max-[680px]:hidden";

function SlackApp({ children }: { children: ReactNode }) {
	return (
		<div className="grid min-h-[300px] grid-cols-[190px_minmax(0,1fr)] max-[680px]:grid-cols-1 md:min-h-[330px]">
			<div
				className={cn(
					"grid content-start gap-0.5 bg-[var(--demo-slack)] px-2.5 py-3.5 text-[13.5px] text-white/70",
					SIDE,
				)}
			>
				<div className="px-2.5 pt-0.5 pb-2.5 text-[14.5px] font-bold text-white">
					Northwind
				</div>
				<SideLabel>Channels</SideLabel>
				<SideRow># general</SideRow>
				<SideRow on dark>
					# launch
				</SideRow>
				<SideRow># design-review</SideRow>
				<SideRow># support</SideRow>
				<SideLabel>Direct messages</SideLabel>
				<SideRow>Priya Raman</SideRow>
				<SideRow>Marcus Lee</SideRow>
			</div>
			<div className="grid min-w-0 grid-rows-[auto_1fr_auto]">
				<div className="flex items-baseline gap-2.5 border-b border-border px-[18px] py-3 font-semibold">
					# launch
					<small className="text-[12.5px] font-normal text-muted-foreground">
						8 members
					</small>
				</div>
				<div className="grid content-start gap-3.5 px-[18px] py-4">
					<Message who="Marcus Lee" initials="ML" time="10:42" color="#7A5AF8">
						QA signed off on 2.4. Anything still blocking the release?
					</Message>
					<Message who="Priya Raman" initials="PR" time="10:44" color="#D9822B">
						Changelog is ready. I just need a date.
					</Message>
				</div>
				<div className="mx-[18px] mb-[18px] min-h-14 rounded-[10px] border border-border px-3.5 py-3">
					{children}
				</div>
			</div>
		</div>
	);
}

function MailApp({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-[300px] md:min-h-[330px]">
			<div className="border-b border-border text-[13.5px]">
				<div className="flex gap-2.5 border-b border-border px-5 py-[9px]">
					<span className="w-[60px] flex-none text-muted-foreground">To:</span>
					Dana Whitfield
				</div>
				<div className="flex gap-2.5 px-5 py-[9px]">
					<span className="w-[60px] flex-none text-muted-foreground">
						Subject:
					</span>
					Re: Renewal contract
				</div>
			</div>
			<div className="px-5 py-[18px] leading-relaxed">
				{children}
				<div className="mt-[18px] border-l-2 border-border pl-3 text-[13px] text-muted-foreground">
					On Wed, Dana Whitfield wrote:
					<br />
					Attached is the renewal for next year. Let me know if you have
					questions.
				</div>
			</div>
		</div>
	);
}

const CODE: ReactNode[] = [
	<>
		<K>export function</K> <F>useAuth</F>() {"{"}
	</>,
	<>
		{"  "}
		<K>const</K> [session, setSession] = <F>useState</F>&lt;Session |{" "}
		<K>null</K>&gt;(<K>null</K>);
	</>,
	"",
	<>
		{"  "}
		<K>async function</K> <F>refresh</F>() {"{"}
	</>,
	<>
		{"    "}
		<K>const</K> res = <K>await</K> <F>fetch</F>(<S>"/api/token/refresh"</S>);
	</>,
	<>
		{"    "}
		<K>if</K> (!res.ok) <K>return</K> <F>signOut</F>();
	</>,
	<>
		{"    "}
		<F>setSession</F>(<K>await</K> res.<F>json</F>());
	</>,
	"  }",
	"",
	<>
		{"  "}
		<K>return</K> {"{ session, refresh };"}
	</>,
	"}",
];

function CodeApp({ children }: { children: ReactNode }) {
	return (
		<div className="grid min-h-[300px] grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] max-[680px]:grid-cols-1 md:min-h-[330px]">
			<div
				aria-hidden="true"
				className={cn(
					"overflow-hidden border-r border-border bg-sunk py-3.5 font-mono text-[12.5px] leading-[1.75]",
					SIDE,
				)}
			>
				{CODE.map((line, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static source listing
					<div key={i} className="grid grid-cols-[36px_1fr] whitespace-pre">
						<span className="pr-3.5 text-right text-muted-foreground/60">
							{i + 1}
						</span>
						<span>{line}</span>
					</div>
				))}
			</div>
			<div className="grid min-w-0 grid-rows-[auto_1fr_auto]">
				<div className="flex items-baseline gap-2.5 border-b border-border px-[18px] py-3 font-semibold">
					Chat
					<small className="text-[12.5px] font-normal text-muted-foreground">
						useAuth.ts
					</small>
				</div>
				<div className="mx-4 mt-3.5 self-start rounded-[10px] bg-sunk px-3 py-2.5 text-[13px] text-muted-foreground">
					Ask about this file or describe a change.
				</div>
				<div className="mx-[18px] mb-[18px] min-h-14 rounded-[10px] border border-border px-3.5 py-3">
					{children}
				</div>
			</div>
		</div>
	);
}

function NotesApp({ children }: { children: ReactNode }) {
	return (
		<div className="grid min-h-[300px] grid-cols-[210px_minmax(0,1fr)] max-[680px]:grid-cols-1 md:min-h-[330px]">
			<div
				className={cn(
					"grid content-start gap-0.5 border-r border-border bg-sunk px-2.5 py-3.5 text-[13.5px] text-muted-foreground",
					SIDE,
				)}
			>
				<NoteRow on title="1:1 with Sam" meta="10:46 · Q3 roadmap" />
				<NoteRow title="Grocery" meta="Yesterday · oat milk, sourdough" />
				<NoteRow title="Book notes" meta="Monday · Chapter 4" />
			</div>
			<div className="grid content-start gap-2 px-[26px] py-[22px]">
				<div className="text-center text-xs text-muted-foreground">
					October 29, 2026 at 10:46
				</div>
				<div className="text-[22px] font-bold tracking-[-0.02em]">
					1:1 with Sam
				</div>
				{children}
			</div>
		</div>
	);
}

function SideLabel({ children }: { children: ReactNode }) {
	return (
		<div className="px-2.5 pt-2.5 pb-1 text-[11px] uppercase tracking-[0.06em]">
			{children}
		</div>
	);
}

function SideRow({
	children,
	on,
	dark,
}: {
	children: ReactNode;
	on?: boolean;
	dark?: boolean;
}) {
	return (
		<div
			className={cn(
				"truncate rounded-md px-2.5 py-[5px]",
				on && dark && "bg-white/15 font-semibold text-white",
			)}
		>
			{children}
		</div>
	);
}

function NoteRow({
	title,
	meta,
	on,
}: {
	title: string;
	meta: string;
	on?: boolean;
}) {
	return (
		<div
			className={cn(
				"grid gap-px truncate rounded-md px-2.5 py-2",
				on && "bg-leaf/15 font-semibold text-foreground",
			)}
		>
			{title}
			<small className="truncate text-[11.5px] font-normal text-muted-foreground">
				{meta}
			</small>
		</div>
	);
}

function Message({
	who,
	initials,
	time,
	color,
	children,
}: {
	who: string;
	initials: string;
	time: string;
	color: string;
	children: ReactNode;
}) {
	return (
		<div className="grid grid-cols-[34px_minmax(0,1fr)] gap-2.5">
			<div
				className="grid size-[34px] place-items-center rounded-lg text-[13px] font-bold text-white"
				style={{ background: color }}
			>
				{initials}
			</div>
			<div>
				<div className="text-sm font-bold">
					{who}
					<small className="ml-1.5 text-[11.5px] font-normal text-muted-foreground">
						{time}
					</small>
				</div>
				{children}
			</div>
		</div>
	);
}

// Hoisted: CODE uses these at module load.
function K({ children }: { children: ReactNode }) {
	return <span className="text-[var(--tok-k)]">{children}</span>;
}
// Hoisted: CODE uses these at module load.
function S({ children }: { children: ReactNode }) {
	return <span className="text-[var(--tok-s)]">{children}</span>;
}
// Hoisted: CODE uses these at module load.
function F({ children }: { children: ReactNode }) {
	return <span className="text-[var(--tok-f)]">{children}</span>;
}
