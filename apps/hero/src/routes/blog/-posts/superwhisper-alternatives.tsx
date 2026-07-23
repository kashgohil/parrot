import { Link } from "@tanstack/react-router";
import { getCompetitor } from "@/lib/competitors";
import { PARROT_FACTS } from "@/lib/parrot-facts";

const superwhisper = getCompetitor("superwhisper")!;
const wispr = getCompetitor("wispr-flow")!;
const macwhisper = getCompetitor("macwhisper")!;

export default function SuperwhisperAlternatives() {
	return (
		<>
			<p>
				<strong>The best Superwhisper alternative in 2026 is Parrot</strong> if
				you want local Mac dictation with AI cleanup, custom vocabulary, and no
				monthly subscription — {PARROT_FACTS.price}. Superwhisper Pro is{" "}
				{superwhisper.pricing.theirPaid} (checked {superwhisper.pricesCheckedOn}
				). Below we compare the strongest alternatives on price, privacy,
				cleanup, and day-to-day workflow.
			</p>
			<p>
				<strong>Best for Parrot:</strong> daily hotkey dictation with cleanup
				included, fully on-device. <strong>Not for:</strong> Superwhisper-style
				voice commands or non-Mac platforms.
			</p>

			<h2>Why people look for a Superwhisper alternative</h2>
			<p>
				Superwhisper is a solid Mac-native dictation app, especially for power
				users who like control. People usually start shopping when they hit one
				of these walls:
			</p>
			<ul>
				<li>
					<strong>Subscription pricing</strong> — the features you actually want
					(especially cleanup) often live behind a recurring plan.
				</li>
				<li>
					<strong>Setup complexity</strong> — more knobs means a longer path
					from install to “this just works.”
				</li>
				<li>
					<strong>Workflow fit</strong> — some people want pure live dictation
					into any app, not a heavier power-user surface.
				</li>
				<li>
					<strong>Free forever</strong> — daily dictators tire of word caps and
					trial cliffs.
				</li>
			</ul>

			<h2>Quick comparison</h2>
			<table>
				<thead>
					<tr>
						<th>App</th>
						<th>Price</th>
						<th>Local</th>
						<th>AI cleanup</th>
						<th>Best for</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<strong>Parrot</strong>
						</td>
						<td>{PARROT_FACTS.price}</td>
						<td>Yes</td>
						<td>Yes (included)</td>
						<td>Daily hotkey dictation</td>
					</tr>
					<tr>
						<td>Superwhisper</td>
						<td>Free tier / {superwhisper.pricing.theirPaid}</td>
						<td>Yes</td>
						<td>Pro-gated</td>
						<td>Power users</td>
					</tr>
					<tr>
						<td>Wispr Flow</td>
						<td>Free tier / {wispr.pricing.theirPaid}</td>
						<td>No</td>
						<td>Yes</td>
						<td>Polished cloud UX</td>
					</tr>
					<tr>
						<td>macOS Dictation</td>
						<td>Free</td>
						<td>Yes</td>
						<td>No</td>
						<td>Occasional notes</td>
					</tr>
					<tr>
						<td>MacWhisper</td>
						<td>{macwhisper.pricing.theirPaid}</td>
						<td>Yes</td>
						<td>Pro only</td>
						<td>File transcription</td>
					</tr>
				</tbody>
			</table>
			<p>
				Prices checked {superwhisper.pricesCheckedOn} — see{" "}
				<a
					href="https://superwhisper.com/"
					rel="noopener noreferrer"
					target="_blank"
				>
					Superwhisper
				</a>
				,{" "}
				<a
					href="https://wisprflow.ai/pricing"
					rel="noopener noreferrer"
					target="_blank"
				>
					Wispr Flow
				</a>
				, and{" "}
				<a
					href="https://www.macwhisper.com/"
					rel="noopener noreferrer"
					target="_blank"
				>
					MacWhisper
				</a>{" "}
				for current plans.
			</p>

			<h2>1. Parrot — free local dictation with cleanup included</h2>
			<p>
				<Link to="/">{PARROT_FACTS.name}</Link> matches the Superwhisper job
				people care about most: press a global hotkey, speak, get clean text at
				the cursor. It runs fully on your Mac ({PARROT_FACTS.osRequirement}),
				keeps audio on-device, and includes AI cleanup and custom vocabulary
				without a paid tier — {PARROT_FACTS.price}.
			</p>
			<p>
				<strong>Where Parrot wins:</strong> {PARROT_FACTS.price}, simple daily
				loop, strong first-pass accuracy for names and jargon, optional cleanup
				that removes filler words, and offline use after the one-time download.
			</p>
			<p>
				<strong>Where Superwhisper may still win:</strong> voice commands and a
				more power-user control surface if you want that style of app.
			</p>
			<p>
				See also our full{" "}
				<Link to="/compare/$competitor" params={{ competitor: "superwhisper" }}>
					Parrot vs Superwhisper
				</Link>{" "}
				page.
			</p>

			<h2>2. Wispr Flow — polished, cloud-first</h2>
			<p>
				Wispr Flow is often the “feels premium” pick: strong cleanup, modern UX,
				cross-platform ambitions. The tradeoff is cloud processing, a weekly
				word cap on free, and a subscription if you dictate all day.
			</p>
			<p>
				Choose Wispr if you want a cloud product and don’t mind uploading audio.
				Choose Parrot if privacy and price matter more. We cover that matchup in{" "}
				<Link to="/blog/$slug" params={{ slug: "wispr-flow-alternatives" }}>
					Wispr Flow alternatives
				</Link>
				.
			</p>

			<h2>3. macOS Dictation — free, limited</h2>
			<p>
				Built-in dictation is fine for short replies. It struggles on long
				sessions, custom vocabulary, cleanup, and consistent paste-into-any-app
				workflows. If you’ve outgrown it, a dedicated app is the next step — not
				a bigger monitor.
			</p>

			<h2>4. MacWhisper — transcription-first, dictation costs extra</h2>
			<p>
				MacWhisper shines when you drop in interviews or recordings, and it now
				offers system-wide dictation too — but the high-quality dictation models
				and grammar cleanup sit behind the {macwhisper.pricing.theirPaid} Pro
				license. If you want dictation with cleanup included at no cost, Parrot
				is the simpler path.
			</p>

			<h2>How to choose</h2>
			<ul>
				<li>
					<strong>Want free + local + cleanup?</strong> Start with Parrot.
				</li>
				<li>
					<strong>Want cloud polish and multi-platform?</strong> Look at Wispr
					Flow.
				</li>
				<li>
					<strong>Want maximum power-user knobs?</strong> Superwhisper may still
					be your home.
				</li>
				<li>
					<strong>Mostly batch files?</strong> MacWhisper remains strong.
				</li>
			</ul>

			<h2>Try the free path</h2>
			<p>
				If you wanted Superwhisper’s local privacy without the subscription,{" "}
				<Link to="/download">download Parrot</Link> for Mac (
				{PARROT_FACTS.osRequirement}). Press{" "}
				<strong>{PARROT_FACTS.defaultHotkey}</strong>, talk, and see whether
				the daily loop is enough — for most people, it is. Related:{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "free-voice-dictation-apps-2026" }}
				>
					free dictation apps
				</Link>{" "}
				and{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "local-voice-dictation-mac" }}
				>
					local setup
				</Link>
				.
			</p>
		</>
	);
}
