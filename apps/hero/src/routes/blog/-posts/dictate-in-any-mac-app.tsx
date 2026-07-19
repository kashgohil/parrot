import { Link } from "@tanstack/react-router";

export default function DictateInAnyMacApp() {
	return (
		<>
			<p>
				<strong>
					The power of modern voice dictation is simple: one hotkey that works
					in Slack, Notion, VS Code, Gmail, and Terminal-adjacent tools —
					anywhere you can type.
				</strong>{" "}
				This guide shows how system-wide dictation on Mac works, how to set it
				up, and app-specific tips so text lands where your cursor is.
			</p>

			<h2>Why “works in any app” beats built-in voice typing</h2>
			<p>
				Google Docs voice typing only works in Docs. Word Dictate only works in
				Office. Browser extensions die when you switch to a native app.
			</p>
			<p>
				A menu-bar dictation app with a <strong>global hotkey</strong> treats
				your whole OS as the canvas: focus a text field, speak, paste. That&apos;s
				the workflow products like <Link to="/">Parrot</Link> are built around.
			</p>

			<h2>Core setup (once)</h2>
			<ol>
				<li>
					Install a native Mac dictation app (
					<Link to="/download">download Parrot</Link>).
				</li>
				<li>
					<strong>Microphone</strong> permission — so it can hear you.
				</li>
				<li>
					<strong>Accessibility</strong> permission — so it can paste or type
					into other apps.
				</li>
				<li>Pick a hotkey you won&apos;t fight (Parrot defaults to fn).</li>
				<li>
					Test in Notes first, then your real stack.
				</li>
			</ol>
			<p>
				Step-by-step:{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "local-voice-dictation-mac" }}
				>
					local setup on Mac
				</Link>
				.
			</p>

			<h2>App-by-app tips</h2>
			<h3>Slack</h3>
			<ul>
				<li>Click the message box before you hold the hotkey.</li>
				<li>
					Dictate shorter bursts — threads are skimmed, not essays.
				</li>
				<li>
					Vocabulary: channel names, teammate names, product terms.
				</li>
			</ul>

			<h3>Notion</h3>
			<ul>
				<li>
					Focus the block you want. Notion&apos;s nested editors confuse
					unfocused paste.
				</li>
				<li>
					Great for meeting notes and PRDs; mark headings out loud if cleanup
					doesn&apos;t structure them.
				</li>
			</ul>

			<h3>VS Code / Cursor / IDEs</h3>
			<ul>
				<li>
					Ideal for comments, commit messages, README prose — not for
					precise syntax.
				</li>
				<li>
					Dictate the explanation; type the code.
				</li>
				<li>
					Add library names to vocabulary so “PostgreSQL” survives.
				</li>
			</ul>

			<h3>Gmail / Google Docs</h3>
			<ul>
				<li>
					Browser compose fields work like any text box with system-wide
					paste.
				</li>
				<li>
					See{" "}
					<Link
						to="/blog/$slug"
						params={{ slug: "voice-dictation-for-email" }}
					>
						voice dictation for email
					</Link>{" "}
					for reply formulas.
				</li>
			</ul>

			<h3>Linear, Jira, GitHub</h3>
			<ul>
				<li>
					Issue descriptions and PR bodies are perfect dictation targets.
				</li>
				<li>
					Keep tickets scannable: problem → context → ask.
				</li>
			</ul>

			<h3>Notes, Obsidian, Bear</h3>
			<ul>
				<li>
					Long-form capture: dictate first, organize later.
				</li>
				<li>
					Writers:{" "}
					<Link
						to="/blog/$slug"
						params={{ slug: "voice-dictation-for-writers" }}
					>
						dictation for writers
					</Link>
					.
				</li>
			</ul>

			<h2>When paste fails</h2>
			<ul>
				<li>
					Re-check Accessibility permission for the dictation app.
				</li>
				<li>
					Click into a real text field (not a read-only view).
				</li>
				<li>
					Some secure fields block paste — that&apos;s the OS protecting you.
				</li>
				<li>
					Good apps fall back to typing the characters when Cmd+V is unreliable.
				</li>
			</ul>

			<h2>Privacy across apps</h2>
			<p>
				System-wide doesn&apos;t mean cloud-wide. Local dictation still keeps
				audio on your Mac whether you&apos;re in Slack or a medical EHR page.
				That&apos;s the point of on-device tools — compare options in{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "private-voice-dictation-apps" }}
				>
					private voice dictation apps
				</Link>
				.
			</p>

			<h2>Pick three apps and practice</h2>
			<p>
				Today: Slack, email, and your notes app. Tomorrow it feels automatic.
				That&apos;s when dictation sticks.
			</p>
		</>
	);
}
