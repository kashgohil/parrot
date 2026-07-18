import { Link } from "@tanstack/react-router";

export default function OfflineVoiceDictationSetup() {
	return (
		<>
			<p>
				<strong>
					You can run voice dictation completely offline on a modern Mac in
					under 10 minutes
				</strong>{" "}
				- no internet, no API keys, no cloud services. This guide walks through
				the three real options (built-in macOS, local Whisper via Parrot, and
				CLI Whisper), what each one is good at, and the step-by-step setup so
				your audio never leaves your machine.
			</p>

			<h2>Why offline dictation matters</h2>
			<p>
				Offline (also called "local-first" or "on-device") dictation means your
				microphone audio is transcribed on your own computer instead of being
				uploaded to a server. The benefits compound:
			</p>
			<ul>
				<li>
					<strong>Privacy.</strong> Audio with names, financials, medical
					details, or trade secrets never leaves your device.
				</li>
				<li>
					<strong>Reliability.</strong> Works on planes, in cafes with bad
					Wi-Fi, and during outages.
				</li>
				<li>
					<strong>Latency.</strong> No network round-trip means transcription
					can start the instant you stop talking.
				</li>
				<li>
					<strong>Cost.</strong> No per-minute API charges. Speak as much as you
					want.
				</li>
			</ul>
			<p>
				The shift to on-device speech is recent but real:{" "}
				<a
					href="https://www.apple.com/newsroom/2021/06/apple-unveils-new-privacy-features-at-wwdc21/"
					rel="noopener noreferrer"
					target="_blank"
				>
					Apple moved Siri's speech recognition fully on-device starting iOS 15
					in 2021
				</a>
				, and the open-source Whisper model that ships with most local dictation
				apps was trained on 680,000 hours of multilingual audio. Both make
				today's local-first stack genuinely competitive with cloud APIs.
			</p>

			<h2>What you need</h2>
			<ul>
				<li>A Mac with Apple Silicon (M1 or newer recommended).</li>
				<li>
					~2-5 GB of disk space (depending on which Whisper model you choose).
				</li>
				<li>About 8 GB of free RAM during transcription.</li>
				<li>10 minutes.</li>
			</ul>
			<p>
				Intel Macs work too, but expect slower transcription on the larger
				models.
			</p>

			<h2>Option 1: Parrot (recommended for most people)</h2>
			<p>
				<Link to="/">Parrot</Link> is the fastest path to a fully offline
				dictation workflow with a real UI. You get a global hotkey, on-device
				transcription, custom vocabulary, and AI cleanup — all local after
				setup.
			</p>
			<p>
				<strong>Setup:</strong>
			</p>
			<ol>
				<li>
					<Link to="/download">Download Parrot</Link> and drag it to
					Applications.
				</li>
				<li>
					Open Parrot. Grant microphone and accessibility permissions when
					prompted.
				</li>
				<li>
					Finish onboarding. Parrot downloads what it needs once, then runs
					offline.
				</li>
				<li>Pick a hotkey (default is fn).</li>
				<li>
					Press the hotkey, speak, release. Your transcript pastes wherever your
					cursor is.
				</li>
			</ol>
			<p>
				That's the entire setup. No API keys, no terminal, no Python
				environment. To verify it's truly offline, turn off Wi-Fi and try again
				- it should still work.
			</p>

			<h2>Option 2: macOS built-in Dictation</h2>
			<p>
				On Apple Silicon, macOS Dictation runs on-device by default. It's free,
				already installed, and a reasonable baseline.
			</p>
			<p>
				<strong>Setup:</strong>
			</p>
			<ol>
				<li>
					Open <em>System Settings → Keyboard → Dictation</em>.
				</li>
				<li>Toggle Dictation on.</li>
				<li>
					macOS will download the offline language pack (one-time, ~500 MB).
				</li>
				<li>
					Set a shortcut (default: press Globe key twice, or Fn key twice).
				</li>
				<li>
					Place your cursor in any text field, trigger the shortcut, and speak.
				</li>
			</ol>
			<p>
				<strong>What you give up:</strong> no AI cleanup, no custom vocabulary,
				no transcription history. Filler words and casual speech patterns make
				it through unchanged. Fine for quick notes; frustrating for real work.
			</p>

			<h2>Option 3: Whisper via the command line</h2>
			<p>
				If you're comfortable in the terminal and want maximum control, running
				Whisper directly is an option. The fastest way to do this on Mac is{" "}
				<a
					href="https://github.com/ggerganov/whisper.cpp"
					rel="noopener noreferrer"
					target="_blank"
				>
					whisper.cpp
				</a>
				, a C++ port that runs the same model OpenAI released, with Metal
				acceleration that uses the M-series Neural Engine. You'll trade
				convenience for flexibility.
			</p>
			<p>
				<strong>Setup with whisper.cpp:</strong>
			</p>
			<ol>
				<li>
					Install whisper.cpp — grab a release from the{" "}
					<a
						className="underline"
						href="https://github.com/ggerganov/whisper.cpp/releases"
						rel="noopener noreferrer"
						target="_blank"
					>
						whisper.cpp GitHub releases
					</a>{" "}
					or build from source. If you already have a package manager,{" "}
					<code>brew install whisper-cpp</code> works too.
				</li>
				<li>
					Download a model (small, medium, or large). Larger = more accurate,
					slower.
				</li>
				<li>
					Record audio with any tool (e.g. <code>sox</code> or QuickTime).
				</li>
				<li>
					Run <code>whisper-cli -m model.bin -f recording.wav</code>.
				</li>
			</ol>
			<p>
				<strong>What you give up:</strong> no global hotkey, no clipboard paste,
				no menu-bar UI. To get a real dictation workflow, you'd need to script
				around it - which is exactly what apps like Parrot already do for you.
			</p>

			<h2>Choosing a model size</h2>
			<table>
				<thead>
					<tr>
						<th>Model</th>
						<th>Size</th>
						<th>Speed (M2)</th>
						<th>Best for</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>tiny</td>
						<td>~75 MB</td>
						<td>Real-time</td>
						<td>Quick notes, casual use</td>
					</tr>
					<tr>
						<td>base</td>
						<td>~150 MB</td>
						<td>Real-time</td>
						<td>Everyday dictation</td>
					</tr>
					<tr>
						<td>small</td>
						<td>~500 MB</td>
						<td>~1.5x real-time</td>
						<td>Most users - good balance</td>
					</tr>
					<tr>
						<td>medium</td>
						<td>~1.5 GB</td>
						<td>~3x real-time</td>
						<td>Technical content, accents</td>
					</tr>
					<tr>
						<td>large</td>
						<td>~3 GB</td>
						<td>~5x real-time</td>
						<td>Maximum accuracy, batch jobs</td>
					</tr>
				</tbody>
			</table>

			<h2>Troubleshooting offline dictation</h2>
			<ul>
				<li>
					<strong>Microphone not detected:</strong> System Settings → Privacy &
					Security → Microphone, ensure your dictation app is enabled.
				</li>
				<li>
					<strong>First-press delay:</strong> the model loads into memory on
					first use. Keep the app running to avoid the warm-up.
				</li>
				<li>
					<strong>Inaccurate technical terms:</strong> add them to your custom
					vocabulary list. This is where dedicated apps beat the built-in
					option.
				</li>
				<li>
					<strong>Slow on Intel Macs:</strong> drop down to the small or base
					model. The accuracy gap is smaller than you'd expect.
				</li>
			</ul>

			<h2>Verifying you're truly offline</h2>
			<p>
				A simple test: turn off Wi-Fi and disconnect Ethernet, then try to
				dictate. If text still appears, transcription is happening locally. If
				you get an error or hang, the app is silently calling a cloud API and
				isn't actually local-first.
			</p>

			<h2>The bottom line</h2>
			<p>
				Offline voice dictation in 2026 is no longer a hacky workaround - it's a
				first-class workflow. For most people,{" "}
				<Link to="/">Parrot's local mode</Link> is the right starting point:
				private by default, no setup beyond the install, and feature-parity with
				cloud dictation.
			</p>
			<p>
				<Link to="/download">Download Parrot</Link> and dictate without the
				cloud.
			</p>
		</>
	);
}
