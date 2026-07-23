import { Link } from "@tanstack/react-router";
import { getCompetitor } from "@/lib/competitors";
import { PARROT_FACTS } from "@/lib/parrot-facts";

const wispr = getCompetitor("wispr-flow")!;

export default function FreeVoiceDictationApps2026() {
	return (
		<>
			<p>
				<strong>
					Most &quot;free&quot; voice dictation apps in 2026 are not actually
					free
				</strong>{" "}
				— they&apos;re freemium teasers with word caps, trials that expire, or
				front-ends that charge per minute via your own API key.{" "}
				{PARROT_FACTS.entity} is one of the few options that is truly free
				forever for personal Mac dictation. This guide separates genuinely free
				tools from the rest.
			</p>
			<p>
				<strong>Best for Parrot:</strong> unlimited local dictation with cleanup
				on Apple Silicon. <strong>Not for:</strong> meeting transcription (use
				Otter) or Windows (use Wispr Flow).
			</p>

			<h2>The four flavors of "free"</h2>
			<p>
				Before the comparison, it helps to know what "free" usually means in
				this category:
			</p>
			<ul>
				<li>
					<strong>Truly free.</strong> Free forever, no caps, no required
					account. Usually means it runs locally on your machine.
				</li>
				<li>
					<strong>Freemium with caps.</strong> Free up to a weekly or monthly
					word/minute limit, then nags you to upgrade.
				</li>
				<li>
					<strong>Free trial.</strong> Full access for 7-30 days, then it stops
					working.
				</li>
				<li>
					<strong>Free app, paid API.</strong> The app is free but only works if
					you bring an API key from OpenAI, Deepgram, etc. - and those charge
					per minute of audio.
				</li>
			</ul>
			<p>
				The good news: all four can be reasonable depending on how often you
				dictate. The bad news: they're rarely labeled clearly on landing pages.
			</p>

			<h2>Quick comparison</h2>
			<table>
				<thead>
					<tr>
						<th>App</th>
						<th>What's free</th>
						<th>The catch</th>
						<th>Offline?</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<strong>Parrot</strong>
						</td>
						<td>Full app — {PARROT_FACTS.price}</td>
						<td>{PARROT_FACTS.osRequirement}; one-time model download</td>
						<td>Yes</td>
					</tr>
					<tr>
						<td>macOS Dictation</td>
						<td>Everything</td>
						<td>No cleanup, no custom vocabulary</td>
						<td>Yes</td>
					</tr>
					<tr>
						<td>Wispr Flow</td>
						<td>{wispr.pricing.theirFree}</td>
						<td>Cap fills fast for daily users</td>
						<td>No</td>
					</tr>
					<tr>
						<td>Otter.ai</td>
						<td>300 min/mo transcription</td>
						<td>Built for meetings, not dictation</td>
						<td>No</td>
					</tr>
					<tr>
						<td>whisper.cpp</td>
						<td>Open source, fully free</td>
						<td>CLI only, no dictation UI</td>
						<td>Yes</td>
					</tr>
				</tbody>
			</table>
			<p>
				Free tiers and prices checked {wispr.pricesCheckedOn} — see{" "}
				<a
					href="https://wisprflow.ai/pricing"
					rel="noopener noreferrer"
					target="_blank"
				>
					Wispr Flow
				</a>{" "}
				and{" "}
				<a
					href="https://otter.ai/pricing"
					rel="noopener noreferrer"
					target="_blank"
				>
					Otter.ai
				</a>{" "}
				for current plans.
			</p>

			<h2>Parrot - free for life, fully local</h2>
			<p>
				<Link to="/">{PARROT_FACTS.name}</Link> is {PARROT_FACTS.price} with no
				word caps. The app doesn&apos;t charge you anything — ever.
				Transcription and AI cleanup run on your Mac after a one-time download.
				No account, no API key, no per-minute bill.
			</p>
			<p>
				That puts it in the rare &quot;truly free&quot; bucket: a real dictation
				UI (global hotkey, paste at cursor, vocabulary, history) without a
				freemium ceiling. The only practical requirements are{" "}
				{PARROT_FACTS.osRequirement} and disk space for models. Setup guide:{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "local-voice-dictation-mac" }}
				>
					local voice dictation on Mac
				</Link>
				. Also compare{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "wispr-flow-alternatives" }}
				>
					Wispr Flow alternatives
				</Link>{" "}
				and the{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "best-voice-dictation-apps-mac-2026" }}
				>
					best Mac dictation apps
				</Link>
				.
			</p>
			<p>
				Other products still use the &quot;free app, paid API&quot; pattern.
				Cloud transcription APIs often land around a fraction of a cent per
				minute — fine for builders, easy to underestimate if you dictate all
				day. If you want $0 forever for personal Mac dictation, stay local.
			</p>

			<h2>macOS Dictation - the most truly-free option</h2>
			<p>
				Apple's built-in dictation is included with macOS, runs on-device, and
				has no caps. Nothing to install, nothing to sign up for.
			</p>
			<p>
				<strong>What you sacrifice:</strong> no AI cleanup, no custom
				vocabulary, no transcription history, no provider choice. It will
				faithfully transcribe every "um" and "you know" into your document.
			</p>
			<p>
				If your dictation needs are genuinely casual - a few sentences here and
				there - macOS Dictation is the right answer and you can stop reading. If
				you dictate full emails, blog posts, or code comments, you'll outgrow it
				within a week.
			</p>

			<h2>Wispr Flow's free tier - watch the word cap</h2>
			<p>
				Wispr Flow's free tier is functional but capped at a weekly word count.
				Light users (a few hundred words a week) can stay on free indefinitely.
				Daily dictators will hit the cap by mid-week and be prompted to upgrade.
			</p>
			<p>
				It's a fair pricing model, but call it what it is: a generous trial, not
				a free product.
			</p>

			<h2>Otter.ai - free for meetings, not dictation</h2>
			<p>
				Otter's free tier gives you 300 minutes of transcription per month; Pro
				runs $16.99/user/mo billed monthly (checked July 2026). That's plenty
				for occasional meeting notes, but Otter isn't optimized for dictation -
				there's no global hotkey, no paste-on-the-fly workflow, and the latency
				is built around recorded audio rather than live typing.
			</p>
			<p>
				Use Otter if your job is "transcribe meetings." Don't pick it for
				dictation just because it's free.
			</p>

			<h2>whisper.cpp - free, open source, terminal-only</h2>
			<p>
				The OpenAI Whisper model has a fast C++ port called{" "}
				<a
					href="https://github.com/ggerganov/whisper.cpp"
					rel="noopener noreferrer"
					target="_blank"
				>
					whisper.cpp
				</a>
				. It's MIT-licensed, runs entirely locally, and is genuinely free
				forever - the same underlying model that powers most "free" cloud tiers
				you'll see advertised. According to{" "}
				<a
					href="https://arxiv.org/abs/2212.04356"
					rel="noopener noreferrer"
					target="_blank"
				>
					the original Whisper paper
				</a>
				, the large-v2 model reaches roughly 5-10% word error rate on standard
				English benchmarks - strong enough for daily dictation.
			</p>
			<p>
				<strong>The catch:</strong> it's a command-line tool. To turn it into a
				real dictation workflow you'd need to script audio capture, a global
				hotkey, clipboard paste, and AI cleanup yourself. Apps like Parrot wrap
				exactly this kind of stack so you don't have to.
			</p>

			<h2>Hidden costs to watch for</h2>
			<ul>
				<li>
					<strong>Required account.</strong> Some "free" apps demand signup,
					then sell or share usage data. Read the privacy policy.
				</li>
				<li>
					<strong>API key fine print.</strong> "Free app, bring your own key"
					can mean $5-20/mo in API charges if you dictate daily.
				</li>
				<li>
					<strong>Time-limited free tiers.</strong> Free for the first month,
					then auto-renews to a paid plan if you forget.
				</li>
				<li>
					<strong>Quality cliffs.</strong> A few apps offer free transcription
					but downgrade to a worse model unless you pay.
				</li>
			</ul>

			<h2>How to pick</h2>
			<ul>
				<li>
					<strong>Want a real dictation app for $0?</strong>{" "}
					<Link to="/">Parrot</Link> — free for life on Mac.
				</li>
				<li>
					<strong>Just need quick notes?</strong> macOS Dictation.
				</li>
				<li>
					<strong>Transcribing meetings?</strong> Otter free tier.
				</li>
				<li>
					<strong>Want to roll your own?</strong> whisper.cpp.
				</li>
			</ul>

			<h2>The bottom line</h2>
			<p>
				The most truly free voice dictation in 2026 is the kind that runs
				locally on your Mac - because there's no per-minute cost to subsidize.{" "}
				<Link to="/">Parrot</Link> gives you that experience with a real UI, AI
				cleanup, and custom vocabulary, without ever asking for a credit card.
			</p>
			<p>
				<Link to="/download">Download Parrot</Link> and start dictating for free
				today.
			</p>
		</>
	);
}
