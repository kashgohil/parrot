import { Link } from "@tanstack/react-router";

export default function LocalVoiceDictationMac() {
	return (
		<>
			<p>
				Most voice dictation tools send your audio to a cloud API for transcription. That works,
				but it means your words travel over the internet, you need an API key or subscription,
				and it won't work offline. Local mode is different: everything runs on your Mac.
			</p>

			<h2>What "local" actually means</h2>
			<p>
				When you run Parrot in local mode, two things happen on-device:
			</p>
			<ul>
				<li><strong>Transcription</strong> uses Whisper.cpp — a C++ port of OpenAI's Whisper model that runs natively on Apple Silicon and Intel Macs.</li>
				<li><strong>AI cleanup</strong> uses Ollama — a local LLM runner. It handles grammar fixes, filler word removal, and applying your writing style.</li>
			</ul>
			<p>
				No audio leaves your machine. No text is sent anywhere. After the initial model
				download, you don't even need an internet connection.
			</p>

			<h2>Step 1: Install Parrot</h2>
			<p>
				<Link to="/download">Download Parrot</Link> and drag it to your Applications folder.
				On first launch, it'll ask for microphone permission — that's the only system permission
				it needs.
			</p>

			<h2>Step 2: Choose local mode during onboarding</h2>
			<p>
				When you first open Parrot, the onboarding wizard asks whether you want local or cloud
				mode. Pick <strong>Local</strong>. You can switch anytime in settings, so this isn't a
				permanent decision.
			</p>

			<h2>Step 3: Download the models</h2>
			<p>
				Parrot will download two models:
			</p>
			<ul>
				<li><strong>Whisper model</strong> (~1.5 GB for the "medium" size) — handles speech-to-text.</li>
				<li><strong>Ollama model</strong> (~2.5 GB for a small LLM) — handles the AI cleanup pass.</li>
			</ul>
			<p>
				Total download is about 4 GB. This only happens once. After that, everything runs
				offline.
			</p>

			<h2>Step 4: Start dictating</h2>
			<p>
				Press <strong>Cmd+Shift+Space</strong> (or your custom hotkey) to start recording.
				Press it again to stop. Your transcription appears where your cursor is — no
				copy-paste needed.
			</p>

			<h2>Performance expectations</h2>
			<p>
				Local transcription is slightly slower than cloud APIs. On an M1 Mac, expect about
				1–2 seconds of processing per 10 seconds of audio. On Intel Macs, it's a bit slower.
				For most dictation use cases (emails, notes, messages), this delay is barely noticeable.
			</p>
			<p>
				Accuracy is very good with the medium Whisper model. It won't match the latest
				cloud offerings from Deepgram or ElevenLabs on edge cases, but for everyday dictation
				it's more than sufficient. Adding{" "}
				<Link to="/blog/custom-vocabulary-voice-dictation">custom vocabulary</Link> helps
				significantly with proper nouns.
			</p>

			<h2>Why go local?</h2>
			<p>
				Three reasons people choose local mode:
			</p>
			<ul>
				<li><strong>Privacy</strong> — nothing leaves your Mac. Important for{" "}
					<Link to="/blog/voice-dictation-medical-hipaa">medical professionals</Link>,
					lawyers, and anyone handling sensitive information.</li>
				<li><strong>Cost</strong> — no API fees, no subscription. Once downloaded, it's free forever.</li>
				<li><strong>Offline</strong> — works on planes, in areas with bad connectivity, or if you just don't want to depend on the internet.</li>
			</ul>

			<h2>When to consider cloud instead</h2>
			<p>
				If you need the absolute fastest transcription, or you're on an older Intel Mac where
				local processing is slow, cloud mode with your own API key is a good alternative.
				Check our <Link to="/blog/transcription-apis-compared">comparison of transcription APIs</Link>{" "}
				to pick a provider. You can switch between local and cloud anytime in{" "}
				<Link to="/download">Parrot's settings</Link>.
			</p>
		</>
	);
}
