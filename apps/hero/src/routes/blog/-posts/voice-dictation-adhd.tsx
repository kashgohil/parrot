import { Link } from "@tanstack/react-router";

export default function VoiceDictationAdhd() {
	return (
		<>
			<p>
				<strong>
					Voice dictation can help ADHD brains start writing faster — by
					lowering the friction between “I know what I mean” and a blank
					cursor.
				</strong>{" "}
				This isn&apos;t medical advice. It&apos;s a practical guide to using
				speech-to-text as a focus tool: capture thoughts before they vanish,
				then edit when your attention is steadier.
			</p>

			<h2>Why dictation clicks for many ADHD workflows</h2>
			<ul>
				<li>
					<strong>Lower activation energy</strong> — speaking is closer to
					thinking than typing a perfect first sentence.
				</li>
				<li>
					<strong>Momentum</strong> — once you&apos;re talking, stopping feels
					harder than continuing.
				</li>
				<li>
					<strong>Body freedom</strong> — pace, stand, stim with your hands
					while words still land.
				</li>
				<li>
					<strong>Externalize working memory</strong> — get the list out of
					your head before it evaporates.
				</li>
			</ul>
			<p>
				It&apos;s not magic. If the tool is laggy, cloud-capped, or accuracy is
				awful, you&apos;ll abandon it. Friction is the enemy.
			</p>

			<h2>A low-friction setup</h2>
			<ol>
				<li>
					One global hotkey (same muscle memory every app).
				</li>
				<li>
					Fast time-to-text — waiting kills the spark.
				</li>
				<li>
					Optional cleanup so the page isn&apos;t full of “um.”
				</li>
				<li>
					Works offline so a flaky network isn&apos;t another blocker.
				</li>
			</ol>
			<p>
				<Link to="/">Parrot</Link> is built for that loop on Mac: free, local,
				hotkey-first. Install once, then stop thinking about the stack.
			</p>

			<h2>Workflows that help</h2>
			<h3>1. Voice brain dump → typed structure</h3>
			<p>
				Set a 5-minute timer. Dictate everything about the task with zero
				order. Stop. Only then drag bullets into sequence. Capture and organize
				are different modes — don&apos;t mix them.
			</p>
			<h3>2. Email sprints</h3>
			<p>
				Batch 10 replies by voice. See{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "voice-dictation-for-email" }}
				>
					dictation for email
				</Link>
				. Short messages are ideal when sustained typing feels heavy.
			</p>
			<h3>3. Body-double with a mic</h3>
			<p>
				On a call or coworking session, narrate the next action into your notes
				app. The “I&apos;m saying it out loud” effect + a visible transcript
				anchors attention.
			</p>
			<h3>4. Transition notes</h3>
			<p>
				Before switching tasks, dictate a 20-second “what&apos;s left” note.
				Future-you can restart without re-deriving context.
			</p>

			<h2>What to avoid</h2>
			<ul>
				<li>
					<strong>Perfection mid-sentence</strong> — edit later; dictation is
					for throughput.
				</li>
				<li>
					<strong>Huge monologues</strong> — 2–4 minute bursts beat 40-minute
					streams you&apos;ll never revise.
				</li>
				<li>
					<strong>Tools with word caps</strong> — hitting a limit mid-flow is
					uniquely demoralizing.
				</li>
				<li>
					<strong>Hunting settings</strong> — configure once on a high-energy
					day.
				</li>
			</ul>

			<h2>Pair with writing habits</h2>
			<table>
				<thead>
					<tr>
						<th>Habit</th>
						<th>Why it helps</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Outline 3 bullets first</td>
						<td>Gives the dump a landing pad</td>
					</tr>
					<tr>
						<td>Same hotkey everywhere</td>
						<td>Removes app-switching friction</td>
					</tr>
					<tr>
						<td>Vocabulary for names</td>
						<td>Fewer rage-edits on proper nouns</td>
					</tr>
					<tr>
						<td>Visible timer</td>
						<td>Contains hyperfocus rabbit holes</td>
					</tr>
				</tbody>
			</table>
			<p>
				Writers and students hit similar patterns — see{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "voice-dictation-for-writers" }}
				>
					dictation for writers
				</Link>{" "}
				and{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "voice-dictation-for-students" }}
				>
					dictation for students
				</Link>
				.
			</p>

			<h2>Privacy and overwhelm</h2>
			<p>
				Fewer accounts and fewer dashboards help. A local app that doesn&apos;t
				demand login removes one more tab from your brain. Private by default is
				also calmer when notes include personal health or work stress.
			</p>

			<h2>Try a five-minute dump</h2>
			<p>
				Open a blank note. Dictate for five minutes about the task you&apos;ve
				been avoiding. Don&apos;t edit. If the page is fuller than it was, the
				tool earned another day.
			</p>
		</>
	);
}
