import { Link } from "@tanstack/react-router";
import { PARROT_FACTS } from "@/lib/parrot-facts";

export default function LocalVoiceDictationMac() {
	return (
		<>
			<p>
				<strong>
					You can run voice dictation entirely on your Mac with zero internet,
					zero API keys, and zero data leaving your device.
				</strong>{" "}
				{PARROT_FACTS.entity} It handles transcription and AI cleanup completely
				on-device. Setup takes under 5 minutes through a built-in wizard, and
				once the models (~4 GB) are downloaded, it works fully offline —{" "}
				{PARROT_FACTS.price}.
			</p>
			<p>
				This guide walks through what local dictation is, how to get it running
				on {PARROT_FACTS.osRequirement}, and how to tune it for the best
				results.
			</p>
			<p>
				<strong>Best for:</strong> private, offline Mac dictation with no
				subscription. <strong>Not for:</strong> Intel Macs or users who need
				Windows/cloud sync.
			</p>

			<h2>What &quot;local&quot; actually means</h2>
			<p>
				Local voice dictation is speech-to-text that runs entirely on your own
				device: your voice is transcribed by models on your Mac, and no audio
				ever leaves the computer.
			</p>
			<p>With Parrot, two things happen on-device:</p>
			<ul>
				<li>
					<strong>Transcription</strong> — your voice is converted to text using
					an on-device speech-to-text engine optimized for Apple Silicon.
					It&apos;s fast enough for daily email, notes, and chat.
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
				setup. It checks your system, requests the macOS permissions it needs,
				and downloads the dictation and cleanup engines for you. No Terminal, no
				package managers, no manual model downloads.
			</p>
			<p>
				You&apos;ll pick a speed/accuracy balance once. Parrot downloads what it
				needs, then everything runs offline from there. The recommended default
				works well on most Apple Silicon Macs.
			</p>

			<h2>Step 3: Start dictating</h2>
			<p>
				Press <strong>{PARROT_FACTS.defaultHotkey}</strong> (or your custom
				hotkey) to start recording. Press it again to stop. Your transcription
				appears where your cursor is — no copy-paste needed.
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
					<strong>Hotkey</strong> — change the default{" "}
					{PARROT_FACTS.defaultHotkey} key to any key combination that fits your
					workflow.
				</li>
			</ul>

			<h2>Performance expectations</h2>
			<p>
				On Apple Silicon, local dictation is fast enough for daily work — short
				clips feel near-instant once the app is warm. Parrot targets M1 and
				later; that&apos;s where the experience is built to shine.
			</p>
			<p>
				The speed is worth having: a 2016 Stanford/Baidu study found speech
				input was about 3x faster than typing on mobile keyboards (
				<a
					href="https://arxiv.org/abs/1608.07323"
					rel="noopener noreferrer"
					target="_blank"
				>
					Ruan et al., &quot;Speech Is 3x Faster than Typing for English and
					Mandarin&quot;
				</a>
				). Local processing is what makes that speed usable for dictation — no
				network round-trip between your voice and the text.
			</p>
			<ul>
				<li>
					<strong>Time-to-text</strong> — release the hotkey and text lands at
					your cursor with minimal wait for everyday phrases.
				</li>
				<li>
					<strong>Disk</strong> — budget a few GB once for models; after that,
					no network needed.
				</li>
				<li>
					<strong>RAM</strong> — leave headroom while dictating; 16 GB system
					memory is a comfortable baseline for most machines.
				</li>
			</ul>
			<p>
				Accuracy is strong for everyday speech. Adding{" "}
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
					<strong>Poor accuracy</strong> — switch to the Precise dictation tier,
					or add frequently misheard words to your custom vocabulary in Parrot's
					settings.
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
			<p>Three reasons people choose local dictation:</p>
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
					<strong>No API key required</strong> — no external accounts, no setup
					beyond the wizard.
				</li>
				<li>
					<strong>Offline</strong> — works on planes, in areas with bad
					connectivity, or if you just don't want to depend on the internet.
				</li>
			</ul>

			<h2>Do you still need cloud transcription?</h2>
			<p>
				For most daily dictation on a modern Mac, no. Local is what Parrot ships
				— {PARROT_FACTS.price}, private by default, and fast enough for email,
				docs, and chat. Cloud APIs still make sense for specialized server-side
				pipelines, batch jobs, or apps that can&apos;t run models on-device.
			</p>
			<p>
				If you&apos;re comparing API vendors for a product you&apos;re building,
				see our{" "}
				<Link to="/blog/$slug" params={{ slug: "transcription-apis-compared" }}>
					comparison of transcription APIs
				</Link>
				. If you just want to dictate on your Mac, stay local — start with{" "}
				<Link to="/download">download</Link>, then read{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "free-voice-dictation-apps-2026" }}
				>
					free dictation apps
				</Link>{" "}
				and{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "private-voice-dictation-apps" }}
				>
					private voice dictation
				</Link>
				.
			</p>
		</>
	);
}
