import { Link } from "@tanstack/react-router";

export default function VoiceDictationForWriters() {
	return (
		<>
			<p>
				<strong>
					Voice dictation helps writers draft faster, stay in flow, and reduce
					hand strain — if the tool doesn’t fight you.
				</strong>{" "}
				This guide covers how authors, bloggers, and content teams use dictation
				for first drafts, what accuracy actually matters, and how to set up a
				Mac workflow that produces editable prose instead of cleanup chores.
			</p>

			<h2>Why writers switch to voice</h2>
			<ul>
				<li>
					<strong>Speed</strong> — speaking is often 2–3× faster than typing
					for first drafts (
					<Link
						to="/blog/$slug"
						params={{ slug: "voice-dictation-vs-typing" }}
					>
						dictation vs typing
					</Link>
					).
				</li>
				<li>
					<strong>Flow</strong> — you stay in the idea longer when your hands
					aren’t hunting for keys.
				</li>
				<li>
					<strong>Ergonomics</strong> — shoulders, wrists, and necks get a
					break during long sessions.
				</li>
				<li>
					<strong>Momentum</strong> — “bad first draft out loud” beats a blank
					page every time.
				</li>
			</ul>

			<h2>What writers need that generic dictation misses</h2>
			<table>
				<thead>
					<tr>
						<th>Need</th>
						<th>Why it matters</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Works in any editor</td>
						<td>Scrivener, Google Docs, Notion, email — same hotkey</td>
					</tr>
					<tr>
						<td>Cleanup without rewriting voice</td>
						<td>Remove “um” without flattening style</td>
					</tr>
					<tr>
						<td>Custom vocabulary</td>
						<td>Character names, brand terms, world-building words</td>
					</tr>
					<tr>
						<td>Low friction start</td>
						<td>If startup takes 30 seconds, you won’t use it</td>
					</tr>
					<tr>
						<td>Privacy (sometimes)</td>
						<td>Unpublished manuscripts shouldn’t train a stranger’s model</td>
					</tr>
				</tbody>
			</table>

			<h2>A writer-friendly workflow</h2>
			<h3>1. Dictate the draft, type the edit</h3>
			<p>
				Don’t aim for publication-ready speech. Aim for a messy, complete draft.
				Then edit with your hands — structure, cuts, and polish still belong to
				typing for most people.
			</p>
			<h3>2. Use short bursts, not monologues</h3>
			<p>
				Two to five minutes per section keeps structure clean. Pause between
				scenes or H2 sections. You’ll thank yourself in revision.
			</p>
			<h3>3. Teach the tool your proper nouns</h3>
			<p>
				Add character names, places, product names, and recurring jargon once.
				That single habit removes the most demoralizing corrections. See{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "custom-vocabulary-voice-dictation" }}
				>
					custom vocabulary
				</Link>
				.
			</p>
			<h3>4. Decide privacy up front</h3>
			<p>
				Drafting a novel or client manuscript in a cloud dictation app means
				audio leaves your machine. Local tools keep chapters on your Mac. If
				that matters, start local —{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "local-first-voice-dictation-explained" }}
				>
					why local-first matters
				</Link>
				.
			</p>

			<h2>Recommended setup for Mac writers</h2>
			<ol>
				<li>
					Install a menu-bar dictation app with a global hotkey (Parrot uses{" "}
					<strong>fn</strong> by default).
				</li>
				<li>Grant Microphone + Accessibility so paste works in any app.</li>
				<li>Add 20 vocabulary terms from your current project.</li>
				<li>
					Turn on AI cleanup for filler and light grammar — keep your voice.
				</li>
				<li>
					Dictate one full scene or post, then revise normally.
				</li>
			</ol>
			<p>
				With <Link to="/">Parrot</Link>, that stack is free, on-device, and
				offline-capable after the first download — useful on writing retreats
				and planes.
			</p>

			<h2>Genre-specific tips</h2>
			<ul>
				<li>
					<strong>Fiction:</strong> vocabulary for names; dictate dialogue
					faster than you can type it; mark beats out loud (“new paragraph”).
				</li>
				<li>
					<strong>Nonfiction / blog:</strong> outline H2s first, dictate under
					each; cleanup shines on explanatory prose.
				</li>
				<li>
					<strong>Newsletters:</strong> speak like you talk to a friend; edit
					for rhythm later.
				</li>
				<li>
					<strong>Technical writing:</strong> load API names and product terms
					into vocabulary before you start.
				</li>
			</ul>

			<h2>Common mistakes</h2>
			<ul>
				<li>Expecting zero edits — dictation multiplies draft speed, not final polish.</li>
				<li>Skipping vocabulary — then blaming the app for “Priya” → “Pria.”</li>
				<li>Dictating in a loud café without a decent mic.</li>
				<li>
					Using a free tier with word caps if you write daily (you’ll hit the
					wall mid-chapter).
				</li>
			</ul>

			<h2>Start with one chapter</h2>
			<p>
				Pick tomorrow’s draft block. Dictate it end-to-end. If you finish faster
				and your wrists hurt less, keep going.{" "}
				<Link to="/download">Download Parrot</Link> and write out loud.
			</p>
		</>
	);
}
