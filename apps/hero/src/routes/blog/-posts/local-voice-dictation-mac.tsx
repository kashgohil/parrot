import { Link } from "@tanstack/react-router";

export default function LocalVoiceDictationMac() {
	return (
		<>
			<p>
				<strong>
					You can run voice dictation entirely on your Mac with zero internet,
					zero API keys, and zero data leaving your device.
				</strong>{" "}
				Parrot's local mode handles transcription and AI cleanup completely
				on-device. Setup takes under 5 minutes through a built-in wizard, and
				once the models (~4 GB) are downloaded, it works fully offline.
			</p>
			<p>
				This guide walks through what local mode does, how to get it running,
				and how to tune it for the best results.
			</p>

			<h2>What &quot;local&quot; actually means</h2>
			<p>When you run Parrot in local mode, two things happen on-device:</p>
			<ul>
				<li>
					<strong>Transcription</strong> — your voice is converted to text
					using a speech-to-text engine that runs natively on Apple Silicon and
					Intel Macs. On Apple Silicon it uses Metal acceleration for
					near-real-time performance.
				</li>
				<li>
					<strong>Cleanup</strong> — an on-device AI engine fixes grammar,
					removes filler words, and applies your writing style — all without an
					internet connection.
				</li>
			</ul>
			<p>
				No audio leaves your machine. No text is sent anywhere. After the
				initial model download, you don't even need an internet connection.
			</p>

			<h2>Step 1: Install Parrot</h2>
			<p>
				<Link to="/download">Download Parrot</Link> for Mac to get started. On
				first launch, it'll ask for microphone permission — that's the only
				system permission it needs.
			</p>
			<p>
				If macOS shows a "cannot be opened because the developer cannot be
				verified" warning, go to{" "}
				<strong>System Settings → Privacy & Security</strong> and click{" "}
				<strong>Open Anyway</strong>.
			</p>

			<h2>Step 2: Run the setup wizard</h2>
			<p>
				When you first open Parrot, the onboarding wizard walks you through
				local mode setup. It checks your system, requests the macOS permissions
				it needs, and downloads the dictation and cleanup engines for you. No
				Terminal, no package managers, no manual model downloads.
			</p>
			<p>
				You'll pick a quality tier for each engine — Lite, Standard, or Precise
				for dictation; Standard, Technical, or Code for cleanup. Standard is
				the recommended default and works well on most Macs.
			</p>

			<h2>Step 3: Start dictating</h2>
			<p>
				Press <strong>Cmd+Shift+Space</strong> (or your custom hotkey) to start
				recording. Press it again to stop. Your transcription appears where
				your cursor is — no copy-paste needed.
			</p>
			<p>
				The first transcription may take a few extra seconds while the engines
				warm up. Subsequent transcriptions will be faster.
			</p>

			<h2>Step 4: Customize your setup</h2>
			<p>
				Once basic dictation is working, head to Parrot's settings to tune your
				experience:
			</p>
			<ul>
				<li>
					<strong>Custom vocabulary</strong> — add names, technical terms, and
					jargon so Parrot recognises them correctly. See our guide on{" "}
					<Link
						to="/blog/$slug"
						params={{ slug: "custom-vocabulary-voice-dictation" }}
					>
						custom vocabulary
					</Link>
					.
				</li>
				<li>
					<strong>Writing context</strong> — tell the cleanup engine what kind
					of text you typically dictate (emails, code comments, medical notes)
					so it formats output appropriately.
				</li>
				<li>
					<strong>Hotkey</strong> — change the default Cmd+Shift+Space to any
					key combination that fits your workflow.
				</li>
			</ul>

			<h2>Performance expectations</h2>
			<p>
				Local transcription is slightly slower than cloud APIs. Here's what to
				expect by hardware:
			</p>
			<ul>
				<li>
					<strong>Apple Silicon (M1/M2/M3/M4)</strong> — about 1–2 seconds of
					processing per 10 seconds of audio at the Standard tier. Metal GPU
					acceleration makes this feel near-instant for short dictations.
				</li>
				<li>
					<strong>Intel Macs</strong> — roughly 2–4× slower than Apple Silicon.
					Consider using the Lite or Standard dictation tier for faster
					results.
				</li>
				<li>
					<strong>RAM</strong> — the Standard dictation tier needs about 2–3 GB
					of RAM. With cleanup running too, aim for at least 16 GB total system
					memory.
				</li>
			</ul>
			<p>
				Accuracy at the Standard tier is very good for everyday dictation.
				Adding{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "custom-vocabulary-voice-dictation" }}
				>
					custom vocabulary
				</Link>{" "}
				helps significantly with proper nouns and jargon.
			</p>

			<h2>Troubleshooting</h2>
			<ul>
				<li>
					<strong>Setup wizard stuck on download</strong> — check your internet
					connection. Models are downloaded once during setup; after that,
					everything runs offline.
				</li>
				<li>
					<strong>Slow transcription</strong> — switch to the Lite dictation
					tier in settings. Close memory-heavy apps to free up RAM.
				</li>
				<li>
					<strong>Poor accuracy</strong> — switch to the Precise dictation
					tier, or add frequently misheard words to your custom vocabulary in
					Parrot's settings.
				</li>
				<li>
					<strong>Microphone not working</strong> — check System Settings →
					Privacy & Security → Microphone and ensure Parrot has permission.
				</li>
				<li>
					<strong>Hotkey not pasting text</strong> — make sure Parrot has
					Accessibility permission under System Settings → Privacy & Security →
					Accessibility.
				</li>
			</ul>

			<h2>Why go local?</h2>
			<p>Three reasons people choose local mode:</p>
			<ul>
				<li>
					<strong>Privacy</strong> — nothing leaves your Mac. Important for{" "}
					<Link
						to="/blog/$slug"
						params={{ slug: "voice-dictation-medical-hipaa" }}
					>
						medical professionals
					</Link>
					, lawyers, and anyone handling sensitive information.
				</li>
				<li>
					<strong>No API key required</strong> — no external accounts, no
					setup beyond the wizard.
				</li>
				<li>
					<strong>Offline</strong> — works on planes, in areas with bad
					connectivity, or if you just don't want to depend on the internet.
				</li>
			</ul>

			<h2>What about cloud transcription?</h2>
			<p>
				Local mode is what Parrot ships with today, and it's free for life. A
				managed cloud mode is in development for users who want the absolute
				fastest transcription or are on older Intel Macs where local
				processing is slow. When it lands, you'll be able to switch between
				local and cloud anytime in settings — your vocabulary, history, and
				preferences carry over.
			</p>
			<p>
				If you're curious about how the major transcription APIs compare, see
				our{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "transcription-apis-compared" }}
				>
					comparison of transcription APIs
				</Link>
				.
			</p>
		</>
	);
}
