import { Link } from "@tanstack/react-router";

export default function VoiceDictationForStudents() {
	return (
		<>
			<p>
				<strong>
					Voice dictation helps students write essays, notes, and emails faster
					— without another subscription if you pick the right tool.
				</strong>{" "}
				Here&apos;s how to use speech-to-text for schoolwork on Mac, what to
				avoid, and a free setup that works offline in the library.
			</p>

			<h2>Where dictation helps in student life</h2>
			<ul>
				<li>
					<strong>First drafts of essays</strong> — get ideas out before
					perfectionism freezes you
				</li>
				<li>
					<strong>Lecture follow-ups</strong> — expand messy notes into
					readable study guides
				</li>
				<li>
					<strong>Email to professors / TAs</strong> — clear the queue between
					classes
				</li>
				<li>
					<strong>Group project docs</strong> — contribute when your wrists (or
					brain) are fried
				</li>
				<li>
					<strong>Accessibility</strong> — reduce typing load with RSI, fatigue,
					or motor limits
				</li>
			</ul>

			<h2>What students should optimize for</h2>
			<table>
				<thead>
					<tr>
						<th>Priority</th>
						<th>Why</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Free or cheap</td>
						<td>Tuition already hurts; word caps mid-essay hurt more</td>
					</tr>
					<tr>
						<td>Works offline</td>
						<td>Dorm Wi‑Fi and lecture halls are unreliable</td>
					</tr>
					<tr>
						<td>Any app paste</td>
						<td>Google Docs, Word, Notion, Canvas text boxes</td>
					</tr>
					<tr>
						<td>Vocabulary</td>
						<td>Course terms, author names, theory labels</td>
					</tr>
					<tr>
						<td>Privacy</td>
						<td>Unpublished work and peer feedback shouldn&apos;t train a
						random cloud model by default</td>
					</tr>
				</tbody>
			</table>

			<h2>Recommended free Mac workflow</h2>
			<ol>
				<li>
					Install a local dictation app —{" "}
					<Link to="/">Parrot</Link> is free for life on Apple Silicon.
				</li>
				<li>
					Grant Microphone + Accessibility so text pastes into Docs and browsers.
				</li>
				<li>
					Add 15 vocabulary terms: professor names, course codes, theory
					keywords.
				</li>
				<li>
					Outline with bullets first, then dictate section by section.
				</li>
				<li>
					Edit with your hands — citations and structure still need eyes.
				</li>
			</ol>
			<p>
				Full install walkthrough:{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "local-voice-dictation-mac" }}
				>
					local voice dictation on Mac
				</Link>
				.
			</p>

			<h2>Essay workflow that actually works</h2>
			<ol>
				<li>
					<strong>Speak the thesis</strong> in one take — ugly is fine.
				</li>
				<li>
					<strong>Dictate body sections</strong> from your outline (2–4 minutes
					each).
				</li>
				<li>
					<strong>Cleanup pass</strong> for filler words if your app offers it.
				</li>
				<li>
					<strong>Type the hard parts</strong> — quotes, footnotes, precise
					claims.
				</li>
				<li>
					<strong>Read aloud</strong> once more for flow before submit.
				</li>
			</ol>
			<p>
				Dictation multiplies draft speed; it doesn&apos;t replace thinking. For
				speed numbers, see{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "voice-dictation-vs-typing" }}
				>
					dictation vs typing
				</Link>
				.
			</p>

			<h2>Tools comparison for students</h2>
			<ul>
				<li>
					<strong>Parrot</strong> — free, local, cleanup, offline → best daily
					driver on Mac
				</li>
				<li>
					<strong>macOS Dictation</strong> — free, limited for long essays
				</li>
				<li>
					<strong>Google Docs voice typing</strong> — free in Docs only; needs
					Chrome + network
				</li>
				<li>
					<strong>Cloud paid apps</strong> — polished, but caps and privacy
					tradeoffs
				</li>
			</ul>
			<p>
				More on free tiers:{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "free-voice-dictation-apps-2026" }}
				>
					what&apos;s actually free in 2026
				</Link>
				.
			</p>

			<h2>Academic integrity note</h2>
			<p>
				Dictation is a writing input method — like a keyboard. Using it is not
				plagiarism. Pasting AI-generated arguments without disclosure may violate
				your school&apos;s policy. Know the difference: speech-to-text captures{" "}
				<em>your</em> words; generative AI invents content.
			</p>

			<h2>FAQ</h2>
			<h3>Is free dictation good enough for college papers?</h3>
			<p>
				For drafts, yes. Expect to edit. Local apps with cleanup (like Parrot)
				get you closer to readable prose than bare built-in dictation.
			</p>
			<h3>Can I dictate in Google Docs on Mac?</h3>
			<p>
				Yes — put the cursor in Docs and use a global-hotkey app that pastes
				system-wide. You&apos;re not limited to Docs&apos; built-in voice typing.
			</p>
			<h3>What if I don&apos;t have Apple Silicon?</h3>
			<p>
				Parrot currently targets Apple Silicon. Use macOS Dictation or Docs voice
				typing as interim options, or another tool that supports your hardware.
			</p>

			<h2>Start with one assignment</h2>
			<p>
				Pick the next short essay or discussion post. Dictate the first draft in
				one sitting. If you finish faster, keep the habit.{" "}
				<Link to="/download">Download Parrot free</Link> and write out loud.
			</p>
		</>
	);
}
