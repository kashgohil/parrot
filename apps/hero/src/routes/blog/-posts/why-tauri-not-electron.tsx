import { Link } from "@tanstack/react-router";

export default function WhyTauriNotElectron() {
	return (
		<>
			<p>
				When we started building Parrot, the first decision was the desktop framework. Electron
				is the obvious choice — it's mature, well-documented, and most cross-platform desktop
				apps use it. We went with Tauri instead. Here's why.
			</p>

			<h2>Binary size matters for a utility app</h2>
			<p>
				Parrot is a utility. You press a hotkey, dictate, and it pastes text. It should feel
				like a system tool, not a web browser. Electron bundles Chromium, which means your
				"simple" app ships as a 150–200 MB download.
			</p>
			<p>
				Tauri uses the system's native webview (WebKit on macOS). The Parrot binary is under
				15 MB. That's a 10x difference. For a utility app that lives in your menu bar, this
				matters — both for download time and for disk space.
			</p>

			<h2>Memory usage</h2>
			<p>
				Electron apps are notorious for memory consumption. Each Electron app runs its own
				Chromium instance, typically using 100–300 MB of RAM. When you already have Slack,
				VS Code, and a browser open (all Electron), adding another 200 MB feels wasteful.
			</p>
			<p>
				Parrot in Tauri idles at about 30–50 MB. The Rust backend is extremely efficient, and
				the native webview shares resources with the OS instead of duplicating them. For an app
				that runs all day in the background, this is a significant advantage.
			</p>

			<h2>Rust gives us native system access</h2>
			<p>
				Parrot needs to do things that web technologies can't:
			</p>
			<ul>
				<li><strong>Audio capture</strong> — we use cpal for low-latency microphone access. This is a Rust library that talks directly to Core Audio on macOS.</li>
				<li><strong>Global hotkey</strong> — registering Cmd+Shift+Space system-wide requires native APIs. Tauri's Rust backend handles this directly.</li>
				<li><strong>Clipboard + auto-paste</strong> — after transcription, we write to the clipboard and simulate a paste keystroke using enigo. This needs OS-level access.</li>
				<li><strong>SQLite</strong> — local history, settings, and vocabulary are stored in rusqlite. No Node.js bindings or WASM needed.</li>
			</ul>
			<p>
				In Electron, each of these would require a native Node.js addon or a complex IPC bridge.
				In Tauri, they're just Rust code running in the same process. Simpler architecture,
				fewer points of failure.
			</p>

			<h2>The frontend is still React</h2>
			<p>
				Tauri doesn't mean abandoning the web stack. Parrot's UI is React 19 with TanStack
				Router, Tailwind CSS, and Vite. The developer experience for the frontend is
				identical to any React app — hot module replacement, component libraries, the whole
				ecosystem.
			</p>
			<p>
				The difference is that instead of Chromium rendering the UI, macOS WebKit does. For
				our use case, this has no practical downside — we don't need Chrome-specific APIs or
				bleeding-edge CSS features.
			</p>

			<h2>The tradeoff: ecosystem maturity</h2>
			<p>
				Electron's ecosystem is larger. There are more tutorials, more plugins, more Stack
				Overflow answers. Tauri's community is growing fast, but it's younger. We've
				occasionally had to dig through Rust compiler errors that would have been a simple npm
				install in Electron-land.
			</p>
			<p>
				For our team, the tradeoffs were worth it. The performance characteristics of Tauri
				are exactly what a utility app needs: small, fast, invisible. Parrot should feel like
				part of the OS, not like another web browser tab.
			</p>

			<h2>Would we choose Tauri again?</h2>
			<p>
				Yes. For a Mac-first utility app that needs native system access, Tauri is the right
				choice. The smaller binary, lower memory footprint, and direct Rust access to system
				APIs have been meaningful advantages in practice, not just on paper.
			</p>
			<p>
				If we were building a cross-platform app with complex UI requirements (think Figma or
				Notion), Electron would make more sense. But for what Parrot does — capture audio,
				transcribe, paste — Tauri is a better fit.
			</p>
			<p>
				Want to see the result? <Link to="/waitlist">Join the waitlist</Link> to try Parrot
				when it launches and see how a 15 MB native app compares to the Electron apps on
				your dock.
			</p>
		</>
	);
}
