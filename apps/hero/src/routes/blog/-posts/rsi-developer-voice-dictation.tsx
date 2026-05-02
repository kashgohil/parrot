import { Link } from "@tanstack/react-router";

export default function RsiDeveloperVoiceDictation() {
	return (
		<>
			<p>
				<strong>
					Voice dictation can reduce a developer's keyboard usage by 30-50% for
					non-code tasks
				</strong>{" "}
				like documentation, Slack messages, emails, and code comments - tasks
				that account for roughly half of a developer's work, according to
				JetBrains' 2023 Developer Ecosystem Survey. For developers managing RSI
				(repetitive strain injury), this reduction can be the difference between
				continuing to work and being forced to stop.
			</p>

			<h2>RSI is more common than people admit</h2>
			<p>
				Developers don't talk about RSI much. There's an implicit assumption
				that if you can't type, you can't code, and if you can't code, you're
				not useful. This isn't true, but it keeps people quiet about their
				symptoms until they're severe.
			</p>
			<p>
				Common signs: pain or tingling in your fingers after long typing
				sessions, aching wrists at the end of the day, difficulty gripping
				objects in the morning. If any of this sounds familiar, you're not alone
				- and there are ways to manage it without abandoning your career.
			</p>

			<h2>Where voice dictation fits</h2>
			<p>
				Voice dictation won't replace typing for writing code. You're not going
				to dictate a React component or a SQL query. But a surprising amount of
				a developer's day is
				<strong> not code</strong>:
			</p>
			<ul>
				<li>Slack messages and team communication</li>
				<li>Code review comments</li>
				<li>Documentation and README files</li>
				<li>Commit messages and PR descriptions</li>
				<li>Email and calendar responses</li>
				<li>Jira tickets and issue descriptions</li>
				<li>Design docs and RFCs</li>
			</ul>
			<p>
				For many developers, this non-code text accounts for 30–50% of their
				daily typing. Offloading that to voice dictation meaningfully reduces
				the strain on your hands.
			</p>

			<h2>A practical setup</h2>
			<p>
				Here's what works for developers managing RSI with{" "}
				<Link to="/">Parrot</Link>:
			</p>
			<ul>
				<li>
					<strong>Code in short bursts</strong>. Type your code, but take
					breaks. Use a timer if you need to.
				</li>
				<li>
					<strong>Dictate everything else</strong>. Slack messages, PR
					descriptions, docs - anything that's natural language goes through
					voice.
				</li>
				<li>
					<strong>Add technical terms to custom vocabulary</strong>.
					"Kubernetes," "PostgreSQL," "middleware," your project names, your
					teammates' names. This prevents constant corrections. See our{" "}
					<Link
						to="/blog/$slug"
						params={{ slug: "custom-vocabulary-voice-dictation" }}
					>
						guide on custom vocabulary
					</Link>
					.
				</li>
				<li>
					<strong>Use the global hotkey</strong>. Press fn to start
					recording from any app. You don't have to switch to a separate
					dictation window.
				</li>
			</ul>

			<h2>What the AI cleanup does for technical writing</h2>
			<p>
				When you dictate a code review comment, you tend to speak casually:
				"this function should probably handle the null case, also the variable
				name is confusing, maybe rename it to something like user settings." The
				AI cleanup turns that into clean, professional text.
			</p>
			<p>
				It also applies your writing style. If you prefer direct, terse feedback
				in code reviews, the cleanup will match that tone. If you write more
				diplomatically, it preserves that too.
			</p>

			<h2>Other things that help</h2>
			<p>
				Voice dictation isn't the only tool for managing RSI. A few other things
				that developers find helpful:
			</p>
			<ul>
				<li>
					<strong>Split keyboards</strong> (like Kinesis Advantage or Ergodox)
					reduce wrist pronation.
				</li>
				<li>
					<strong>Vertical mice</strong> put your hand in a natural position.
				</li>
				<li>
					<strong>Frequent breaks</strong> - the 20-20-20 rule or similar.
				</li>
				<li>
					<strong>Stretching</strong> - wrist extensions and flexion exercises.
				</li>
				<li>
					<strong>Professional help</strong> - see a hand specialist or
					occupational therapist if symptoms persist.
				</li>
			</ul>

			<h2>It's not all or nothing</h2>
			<p>
				You don't have to dictate everything or type everything. The goal is to
				reduce total keystrokes enough that your hands can recover. Even
				offloading 30% of your typing to voice makes a measurable difference.
			</p>

			<h2>Getting started</h2>
			<p>
				<Link to="/download">Download Parrot</Link> and try local mode for
				free — everything runs on-device, no account or API keys needed. Set
				up the hotkey, add your technical vocabulary, and start with just
				Slack messages. See if it helps. Managed cloud mode is coming soon
				for higher accuracy when you want it.
			</p>
		</>
	);
}
