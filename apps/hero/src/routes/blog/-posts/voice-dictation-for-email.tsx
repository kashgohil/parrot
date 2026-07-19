import { Link } from "@tanstack/react-router";

export default function VoiceDictationForEmail() {
	return (
		<>
			<p>
				<strong>
					Voice dictation is one of the highest-ROI upgrades for email —
					if the text lands in Gmail, Outlook, or Superhuman without a fight.
				</strong>{" "}
				This guide shows a fast Mac workflow for inbox zero: hotkey, speak,
				cleanup, send — with templates and habits that keep messages professional.
			</p>

			<h2>Why email is perfect for dictation</h2>
			<ul>
				<li>Most emails are short (50–150 words)</li>
				<li>Tone is conversational — close to how you speak</li>
				<li>Speed compounds: 20 messages/day adds up</li>
				<li>You can walk or stretch while clearing the queue</li>
			</ul>
			<p>
				Typing wins for dense tables and careful legal wording. Dictation wins
				for the mountain of “quick replies.”
			</p>

			<h2>The 30-second email loop</h2>
			<ol>
				<li>Open the thread and click the reply box.</li>
				<li>
					Hold your dictation hotkey (Parrot defaults to <strong>fn</strong>).
				</li>
				<li>
					Speak the reply in one breath: greeting → point → ask → sign-off.
				</li>
				<li>Release. Read once. Fix one thing if needed. Send.</li>
			</ol>
			<p>
				With <Link to="/">Parrot</Link>, cleanup removes filler (“um,” “like”)
				and light grammar issues so the paste already looks sendable.
			</p>

			<h2>What to say (formulas that work)</h2>
			<h3>Status update</h3>
			<p>
				<em>
					“Hi Maya — shipping the draft Thursday morning. Blockers are the legal
					review. I&apos;ll ping you if that slips. Thanks.”
				</em>
			</p>
			<h3>Ask for something</h3>
			<p>
				<em>
					“Hi Jordan — can you send the Q3 numbers by end of day Wednesday? I
					need them for the board deck. Appreciate it.”
				</em>
			</p>
			<h3>Decline politely</h3>
			<p>
				<em>
					“Thanks for the invite — I can&apos;t make Friday. Happy to review
					async notes or join next time.”
				</em>
			</p>
			<p>
				Speak punctuation only when needed. Good cleanup infers periods and
				commas from your pacing.
			</p>

			<h2>Setup for Gmail, Outlook, and Superhuman</h2>
			<table>
				<thead>
					<tr>
						<th>Client</th>
						<th>Tip</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Gmail (browser)</td>
						<td>Cursor in compose → global hotkey → paste at cursor</td>
					</tr>
					<tr>
						<td>Outlook Mac</td>
						<td>Same loop; grant Accessibility if paste fails</td>
					</tr>
					<tr>
						<td>Apple Mail</td>
						<td>Works like any text field</td>
					</tr>
					<tr>
						<td>Superhuman / Front</td>
						<td>Focus the reply field first; don&apos;t dictate into the list
						view</td>
					</tr>
				</tbody>
			</table>
			<p>
				You don&apos;t need a separate integration per client. System-wide
				dictation is the point — see also{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "dictate-in-any-mac-app" }}
				>
					how to dictate in any Mac app
				</Link>
				.
			</p>

			<h2>Accuracy tricks for names</h2>
			<ul>
				<li>
					Add frequent recipients and company names to{" "}
					<Link
						to="/blog/$slug"
						params={{ slug: "custom-vocabulary-voice-dictation" }}
					>
						custom vocabulary
					</Link>
					.
				</li>
				<li>Spell unusual names once the first time you save them.</li>
				<li>Glance at the To: field before send — classic failure mode.</li>
			</ul>

			<h2>Privacy for work email</h2>
			<p>
				If you discuss customers, deals, or HR topics, prefer on-device
				dictation so audio isn&apos;t uploaded by default. Local tools like
				Parrot keep the mic path on your Mac. Background:{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "private-voice-dictation-apps" }}
				>
					private voice dictation apps
				</Link>
				.
			</p>

			<h2>Common mistakes</h2>
			<ul>
				<li>Dictating before the cursor is in the compose box</li>
				<li>Rambling without a point — outline one sentence first</li>
				<li>Sending without a 3-second read (auto-correct of the ears)</li>
				<li>
					Using a free cloud tier that caps you mid-inbox-zero session
				</li>
			</ul>

			<h2>Clear ten emails today</h2>
			<p>
				Don&apos;t overhaul your whole system. Dictate the next ten replies.
				Keep the tool if your shoulders drop and the queue shrinks.{" "}
				<Link to="/download">Get Parrot free</Link>.
			</p>
		</>
	);
}
