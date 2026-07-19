import { Link } from "@tanstack/react-router";

export default function MacosDictationVsApps() {
	return (
		<>
			<p>
				<strong>
					macOS Dictation is free and fine for short notes — dedicated voice
					dictation apps win for all-day writing.
				</strong>{" "}
				If you’re deciding whether Apple’s built-in tool is “good enough,” this
				guide compares it to modern Mac dictation apps on accuracy, cleanup,
				vocabulary, privacy, and workflow.
			</p>

			<h2>What macOS Dictation does well</h2>
			<ul>
				<li>
					<strong>Zero install</strong> — already on your Mac.
				</li>
				<li>
					<strong>No subscription</strong> — free with the OS.
				</li>
				<li>
					<strong>On-device option</strong> — Apple has invested heavily in
					local recognition for privacy-conscious users.
				</li>
				<li>
					<strong>Good enough for short blurbs</strong> — quick replies, search
					bars, one-line reminders.
				</li>
			</ul>
			<p>
				For many people, that’s the entire job. If you only dictate a sentence
				twice a day, stay with Apple.
			</p>

			<h2>Where built-in dictation falls short</h2>
			<ul>
				<li>
					<strong>Long sessions feel brittle</strong> — stamina and consistency
					drop when you’re drafting paragraphs, not captions.
				</li>
				<li>
					<strong>No real AI cleanup</strong> — filler words, false starts, and
					messy grammar stay in the text.
				</li>
				<li>
					<strong>Weak custom vocabulary</strong> — coworker names, product
					names, and domain jargon still get mangled.
				</li>
				<li>
					<strong>Workflow friction</strong> — dedicated apps optimize the
					hotkey → speak → paste loop across every app you use.
				</li>
				<li>
					<strong>No dictation history</strong> — hard to re-copy something you
					said an hour ago.
				</li>
			</ul>

			<h2>macOS Dictation vs dedicated apps</h2>
			<table>
				<thead>
					<tr>
						<th>Capability</th>
						<th>macOS Dictation</th>
						<th>Dedicated app (e.g. Parrot)</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Price</td>
						<td>Free</td>
						<td>Free to subscription</td>
					</tr>
					<tr>
						<td>AI cleanup</td>
						<td>No</td>
						<td>Often yes</td>
					</tr>
					<tr>
						<td>Custom vocabulary</td>
						<td>Limited / none</td>
						<td>Yes</td>
					</tr>
					<tr>
						<td>Works offline</td>
						<td>Yes (on-device mode)</td>
						<td>Yes for local apps</td>
					</tr>
					<tr>
						<td>Global hotkey paste</td>
						<td>Basic</td>
						<td>Core workflow</td>
					</tr>
					<tr>
						<td>History &amp; search</td>
						<td>No</td>
						<td>Common</td>
					</tr>
					<tr>
						<td>Best for</td>
						<td>Occasional use</td>
						<td>Daily writing</td>
					</tr>
				</tbody>
			</table>

			<h2>When to stick with Apple</h2>
			<p>Stay on macOS Dictation if you:</p>
			<ul>
				<li>Dictate only short messages a few times a week</li>
				<li>Don’t care about filler-word cleanup</li>
				<li>Don’t want another app in the menu bar</li>
			</ul>

			<h2>When to upgrade to a dictation app</h2>
			<p>Switch when you:</p>
			<ul>
				<li>Draft emails, docs, or tickets by voice every day</li>
				<li>Waste time fixing names and jargon</li>
				<li>Want text that reads like writing, not raw speech</li>
				<li>Need privacy <em>and</em> modern accuracy together</li>
			</ul>
			<p>
				That’s the gap products like <Link to="/">Parrot</Link> are built for:
				local transcription, optional cleanup, custom vocabulary, and paste at
				the cursor — free for life on Mac.
			</p>

			<h2>A practical upgrade path</h2>
			<ol>
				<li>
					Keep using macOS Dictation for a day and note every correction you
					make.
				</li>
				<li>
					Install a dedicated app and dictate the same kinds of messages.
				</li>
				<li>
					Compare time-to-send and frustration, not demo accuracy scores.
				</li>
				<li>
					Add 15 vocabulary terms (people + products). Re-test.
				</li>
			</ol>
			<p>
				Most people decide within a week. The winner is the tool that disappears
				into the work — not the one with the longest settings page.
			</p>

			<h2>Bottom line</h2>
			<p>
				macOS Dictation is a great starter tool. Dedicated apps are for people
				who write with their voice — not just dabble. If that’s you, graduate
				before you blame your microphone.
			</p>
		</>
	);
}
