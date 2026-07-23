import { Link } from "@tanstack/react-router";
import { getCompetitor } from "@/lib/competitors";
import { PARROT_FACTS } from "@/lib/parrot-facts";

const wispr = getCompetitor("wispr-flow")!;
const superwhisper = getCompetitor("superwhisper")!;
const macwhisper = getCompetitor("macwhisper")!;

export default function WisprFlowAlternatives() {
	return (
		<>
			<p>
				<strong>The best Wispr Flow alternative in 2026 is Parrot</strong> if
				you want the same fast, AI-cleaned dictation experience with fully local
				processing — {PARROT_FACTS.price}, no weekly word cap, and no cloud
				upload. Wispr Flow Pro is {wispr.pricing.theirPaid} (checked{" "}
				{wispr.pricesCheckedOn}). Below, we compare the five strongest
				alternatives across price, privacy, accuracy, and platform support.
			</p>
			<p>
				<strong>Best for Parrot:</strong> Mac users who want free, private,
				offline dictation with cleanup. <strong>Not for:</strong> Windows or
				multi-device cloud sync — stay on Wispr Flow for those.
			</p>

			<h2>Why people look for a Wispr Flow alternative</h2>
			<p>
				Wispr Flow is a polished voice dictation app, but the most common
				reasons people start shopping around are:
			</p>
			<ul>
				<li>
					<strong>Pricing</strong> - the Pro tier is a recurring subscription,
					and the free tier caps your weekly word count.
				</li>
				<li>
					<strong>Cloud-only transcription</strong> - audio is processed on
					remote servers, which is a non-starter for some industries.
				</li>
				<li>
					<strong>No fully offline path</strong> - daily dictation still depends
					on a network connection.
				</li>
				<li>
					<strong>Limited customization</strong> - vocabulary and writing style
					controls are shallower than power users want.
				</li>
			</ul>

			<h2>Quick comparison</h2>
			<table>
				<thead>
					<tr>
						<th>App</th>
						<th>Price</th>
						<th>Local option</th>
						<th>AI cleanup</th>
						<th>Custom vocabulary</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<strong>Parrot</strong>
						</td>
						<td>{PARROT_FACTS.price}</td>
						<td>Yes</td>
						<td>Yes</td>
						<td>Yes</td>
					</tr>
					<tr>
						<td>Wispr Flow</td>
						<td>Free tier / {wispr.pricing.theirPaid}</td>
						<td>No</td>
						<td>Yes</td>
						<td>Limited</td>
					</tr>
					<tr>
						<td>Superwhisper</td>
						<td>{superwhisper.pricing.theirPaid}</td>
						<td>Yes</td>
						<td>Pro only</td>
						<td>Yes</td>
					</tr>
					<tr>
						<td>MacWhisper</td>
						<td>{macwhisper.pricing.theirPaid}</td>
						<td>Yes</td>
						<td>Pro only</td>
						<td>Limited</td>
					</tr>
					<tr>
						<td>macOS Dictation</td>
						<td>Free</td>
						<td>Yes</td>
						<td>No</td>
						<td>No</td>
					</tr>
				</tbody>
			</table>
			<p>
				Prices checked {wispr.pricesCheckedOn} — see{" "}
				<a
					href="https://wisprflow.ai/pricing"
					rel="noopener noreferrer"
					target="_blank"
				>
					Wispr Flow
				</a>
				,{" "}
				<a
					href="https://superwhisper.com/"
					rel="noopener noreferrer"
					target="_blank"
				>
					Superwhisper
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

			<h2>1. Parrot - the closest match, without the subscription</h2>
			<p>
				<Link to="/">{PARROT_FACTS.name}</Link> is the most direct Wispr Flow
				alternative if you want the same workflow — global hotkey, transcribe,
				AI cleanup, paste into any app — without paying monthly. It&apos;s{" "}
				{PARROT_FACTS.price}, runs as a native menu-bar app on{" "}
				{PARROT_FACTS.osRequirement}, and keeps audio on-device so nothing
				leaves your Mac.
			</p>
			<p>
				<strong>Where Parrot wins:</strong>
			</p>
			<ul>
				<li>
					<strong>No word caps.</strong> Wispr Flow's free tier limits weekly
					words. Parrot doesn't.
				</li>
				<li>
					<strong>Free for life.</strong> Full local dictation with AI cleanup
					included — no subscription and no API bills.
				</li>
				<li>
					<strong>Local-first.</strong> Transcription and cleanup run entirely
					on-device with no internet required after setup.
				</li>
				<li>
					<strong>Deeper customization.</strong> Custom vocabulary, writing
					style, and context that actually move the needle on accuracy.
				</li>
			</ul>
			<p>
				<strong>Where Wispr Flow still wins:</strong> cross-platform support
				(Wispr ships on Windows; Parrot is Mac-only today). Full side-by-side:{" "}
				<Link
					to="/compare/$competitor"
					params={{ competitor: "wispr-flow" }}
				>
					Parrot vs Wispr Flow
				</Link>
				. Also see{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "superwhisper-alternatives" }}
				>
					Superwhisper alternatives
				</Link>
				,{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "free-voice-dictation-apps-2026" }}
				>
					free dictation apps
				</Link>
				, and{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "local-voice-dictation-mac" }}
				>
					local setup
				</Link>
				.
			</p>

			<h2>2. Superwhisper - if you don't mind the subscription</h2>
			<p>
				Superwhisper is another Mac-native dictation app with a similar shape:
				hotkey, dictate, paste. It supports local Whisper models out of the box
				and has a clean UI. Pro is {superwhisper.pricing.theirPaid}.
			</p>
			<p>
				<strong>Trade-offs:</strong> the Pro plan is required for AI cleanup and
				unlocks better models, so the free experience is meaningfully thinner.
				If you&apos;d rather pay once or not at all, look at Parrot or
				MacWhisper instead.
			</p>
			<p>
				<strong>Best for Superwhisper:</strong> power users who want voice
				commands and don&apos;t mind a subscription. <strong>Not for:</strong>{" "}
				free-forever daily dictation with cleanup included.
			</p>

			<h2>3. MacWhisper - one-time payment, transcription-first</h2>
			<p>
				MacWhisper is a popular choice for people who want to run Whisper
				locally with a real GUI. It's transcription-first (files, meetings,
				subtitles) and has since added system-wide dictation and grammar
				cleanup. The license costs {macwhisper.pricing.theirPaid}.
			</p>
			<p>
				<strong>The catch:</strong> the best dictation features - high-quality
				dictation models, automatic grammar cleanup, AI prompts - sit behind the
				Pro license. If you mostly transcribe audio files, the free tier is
				fine. For daily dictation with cleanup included, Parrot covers it
				without a license.
			</p>

			<h2>4. macOS Dictation - free, but bare-bones</h2>
			<p>
				Apple's built-in dictation runs on-device on Apple Silicon and is
				genuinely usable for casual notes. It's the cheapest possible baseline.
			</p>
			<p>
				<strong>The catch:</strong> no cleanup, no custom vocabulary, no
				provider choice, and accuracy on technical terms or proper nouns is
				rough. Most people who try Wispr Flow have already outgrown macOS
				Dictation - going back is rarely the answer.
			</p>

			<h2>5. Whisper Flow (open source) - for terminal users</h2>
			<p>
				Worth disambiguating: <em>Whisper Flow</em> (open source CLI) and{" "}
				<em>Wispr Flow</em> (the commercial app) are different products. Whisper
				Flow is a free, open-source CLI wrapper around OpenAI's Whisper model.
				According to{" "}
				<a
					href="https://arxiv.org/abs/2212.04356"
					rel="noopener noreferrer"
					target="_blank"
				>
					the original Whisper paper
				</a>
				, the large-v2 model was trained on 680,000 hours of multilingual audio
				and reaches roughly 5-10% word error rate on standard English benchmarks
				- good enough that local-only options are viable for daily dictation. If
				you're comfortable in the terminal and want zero cost, zero cloud, and
				full control, it's a real option - but you'll be wiring up your own
				hotkey and clipboard plumbing.
			</p>

			<h2>How to choose</h2>
			<ul>
				<li>
					<strong>
						Want the Wispr Flow workflow without the subscription?
					</strong>{" "}
					<Link to="/">Parrot</Link>.
				</li>
				<li>
					<strong>Need Windows support?</strong> Stay on Wispr Flow for now.
				</li>
				<li>
					<strong>Just want to transcribe audio files locally?</strong>{" "}
					MacWhisper.
				</li>
				<li>
					<strong>Only dictate occasionally?</strong> macOS Dictation is fine.
				</li>
			</ul>

			<h2>The bottom line</h2>
			<p>
				Wispr Flow proved that AI-cleaned dictation is a workflow worth paying
				for. The good news: you don't actually have to pay monthly to get it.{" "}
				<Link to="/">Parrot</Link> delivers the same core experience - hotkey,
				dictate, AI cleanup, paste - fully on-device with no word caps,
				for free.
			</p>
			<p>
				<Link to="/download">Download Parrot</Link> and see how it compares on
				your own workflow.
			</p>
		</>
	);
}
