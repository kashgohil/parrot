import { Link } from "@tanstack/react-router";
import { useCallback, useState } from "react";

function CodeBlock({ children }: { children: string }) {
	const [copied, setCopied] = useState(false);

	const copy = useCallback(() => {
		navigator.clipboard.writeText(children).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		});
	}, [children]);

	return (
		<div className="relative group">
			<button
				type="button"
				onClick={copy}
				className="absolute top-2 right-2 px-2 py-1 rounded-md text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer bg-foreground/[0.05] hover:bg-foreground/[0.1] text-foreground/50"
			>
				{copied ? "Copied" : "Copy"}
			</button>
			<pre>
				<code>{children}</code>
			</pre>
		</div>
	);
}

export default function LocalVoiceDictationMac() {
	return (
		<>
			<p>
				Most voice dictation tools send your audio to a cloud API for
				transcription. That works, but it means your words travel over the
				internet, you need an API key or subscription, and it won't work
				offline. Parrot's local mode is different: everything runs on your Mac.
			</p>
			<p>
				This guide walks through every step - from installing the prerequisites
				to fine-tuning your setup for the best results.
			</p>

			<h2>What &quot;local&quot; actually means</h2>
			<p>When you run Parrot in local mode, two things happen on-device:</p>
			<ul>
				<li>
					<strong>Transcription</strong> uses{" "}
					<a
						href="https://github.com/ggerganov/whisper.cpp"
						target="_blank"
						rel="noopener noreferrer"
					>
						Whisper.cpp
					</a>{" "}
					— a C++ port of OpenAI's Whisper model that runs natively on Apple
					Silicon and Intel Macs. It uses Core ML and Metal acceleration on
					Apple Silicon for near-real-time performance.
				</li>
				<li>
					<strong>Cleanup</strong> uses{" "}
					<a
						href="https://ollama.com"
						target="_blank"
						rel="noopener noreferrer"
					>
						Ollama
					</a>{" "}
					— a local LLM runner. It handles grammar fixes, filler word removal,
					and applying your writing style — all without an internet connection.
					(Cloud users can use OpenAI or Anthropic models instead.)
				</li>
			</ul>
			<p>
				No audio leaves your machine. No text is sent anywhere. After the
				initial model download, you don't even need an internet connection.
			</p>

			<h2>Prerequisites</h2>
			<p>
				Before installing Parrot, you'll need two tools set up on your Mac. Both
				are free and open source.
			</p>

			<h3>1. Install Homebrew (if you don't have it)</h3>
			<p>
				<a href="https://brew.sh" target="_blank" rel="noopener noreferrer">
					Homebrew
				</a>{" "}
				is a package manager for macOS that makes installing command-line tools
				easy. Open Terminal and run:
			</p>
			<CodeBlock>
				{
					'/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
				}
			</CodeBlock>
			<p>
				Follow the on-screen prompts. After installation, restart your terminal.
			</p>

			<h3>2. Install Whisper.cpp</h3>
			<p>
				<a
					href="https://github.com/ggerganov/whisper.cpp"
					target="_blank"
					rel="noopener noreferrer"
				>
					Whisper.cpp
				</a>{" "}
				is what handles speech-to-text locally. Install it via Homebrew:
			</p>
			<CodeBlock>brew install whisper-cpp</CodeBlock>
			<p>
				Then download a Whisper model. The "medium" model offers the best
				balance of accuracy and speed:
			</p>
			<CodeBlock>
				{
					"# Download the medium model (~1.5 GB)\nwhisper-cpp-download-ggml-model medium"
				}
			</CodeBlock>
			<p>Other model sizes you can choose:</p>
			<ul>
				<li>
					<strong>tiny</strong> (~75 MB) — fastest, lowest accuracy. Good for
					quick testing.
				</li>
				<li>
					<strong>base</strong> (~142 MB) — fast, decent accuracy for simple
					dictation.
				</li>
				<li>
					<strong>small</strong> (~466 MB) — good middle ground if you're low on
					disk space.
				</li>
				<li>
					<strong>medium</strong> (~1.5 GB) — recommended. Accurate for everyday
					use.
				</li>
				<li>
					<strong>large-v3</strong> (~3 GB) — most accurate, but slower. Best
					for non-English languages.
				</li>
			</ul>
			<p>
				See the full list of models in the{" "}
				<a
					href="https://github.com/ggerganov/whisper.cpp/blob/master/models/README.md"
					target="_blank"
					rel="noopener noreferrer"
				>
					Whisper.cpp models documentation
				</a>
				.
			</p>

			<h3>3. Install Ollama</h3>
			<p>
				<a
					href="https://ollama.com/download"
					target="_blank"
					rel="noopener noreferrer"
				>
					Download Ollama
				</a>{" "}
				from the official site and follow the installer. Alternatively, install
				via Homebrew:
			</p>
			<CodeBlock>brew install ollama</CodeBlock>
			<p>Start the Ollama service:</p>
			<CodeBlock>ollama serve</CodeBlock>
			<p>
				Then pull a model for the AI cleanup step. We recommend{" "}
				<strong>llama3.2</strong> for its balance of quality and speed:
			</p>
			<CodeBlock>
				{"# Pull the default cleanup model (~2.5 GB)\nollama pull llama3.2"}
			</CodeBlock>
			<p>Other models that work well:</p>
			<ul>
				<li>
					<strong>llama3.2</strong> (3B, ~2.5 GB) — recommended. Fast and
					accurate for text cleanup.
				</li>
				<li>
					<strong>mistral</strong> (7B, ~4.1 GB) — higher quality output, slower
					on base M1/M2.
				</li>
				<li>
					<strong>phi3</strong> (3.8B, ~2.3 GB) — lightweight alternative with
					good performance.
				</li>
			</ul>
			<p>
				Browse all available models at the{" "}
				<a
					href="https://ollama.com/library"
					target="_blank"
					rel="noopener noreferrer"
				>
					Ollama model library
				</a>
				.
			</p>

			<h2>Step 1: Install Parrot</h2>
			<p>
				<Link to="/waitlist">Join the waitlist</Link> to get access when Parrot
				launches. On first launch, it'll ask for microphone permission — that's
				the only system permission it needs.
			</p>
			<p>
				If macOS shows a "cannot be opened because the developer cannot be
				verified" warning, go to{" "}
				<strong>System Settings → Privacy & Security</strong> and click{" "}
				<strong>Open Anyway</strong>.
			</p>

			<h2>Step 2: Choose local mode during onboarding</h2>
			<p>
				When you first open Parrot, the onboarding wizard asks whether you want
				local or cloud mode. Pick <strong>Local</strong>. You can switch anytime
				in settings, so this isn't a permanent decision.
			</p>
			<p>
				Parrot will verify that Whisper.cpp and Ollama are available on your
				system. If either is missing, you'll see a prompt with install
				instructions.
			</p>

			<h2>Step 3: Verify the models</h2>
			<p>
				Parrot will detect the Whisper and Ollama models you installed in the
				prerequisites. If you want to confirm everything is working, run these
				commands in Terminal:
			</p>
			<CodeBlock>
				{
					"# Verify Whisper.cpp is installed\nwhisper-cpp --help\n\n# Verify Ollama is running and the model is available\nollama list"
				}
			</CodeBlock>
			<p>
				You should see your chosen models listed. If Ollama isn't running, start
				it with <code>ollama serve</code> before using Parrot.
			</p>

			<h2>Step 4: Start dictating</h2>
			<p>
				Press <strong>Cmd+Shift+Space</strong> (or your custom hotkey) to start
				recording. Press it again to stop. Your transcription appears where your
				cursor is — no copy-paste needed.
			</p>
			<p>
				The first transcription may take a few extra seconds while the models
				load into memory. Subsequent transcriptions will be faster.
			</p>

			<h2>Step 5: Customize your setup</h2>
			<p>
				Once basic dictation is working, head to Parrot's settings to tune your
				experience:
			</p>
			<ul>
				<li>
					<strong>Custom vocabulary</strong> — add names, technical terms, and
					jargon so Whisper recognizes them correctly. See our guide on{" "}
					<Link to="/blog/$slug" params={{ slug: "custom-vocabulary-voice-dictation" }}>
						custom vocabulary
					</Link>
					.
				</li>
				<li>
					<strong>Writing context</strong> — tell the AI cleanup model what kind
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
					processing per 10 seconds of audio with the medium model. Metal GPU
					acceleration makes this feel near-instant for short dictations.
				</li>
				<li>
					<strong>Intel Macs</strong> — roughly 2–4x slower than Apple Silicon.
					Consider using the "small" or "base" Whisper model for faster results.
				</li>
				<li>
					<strong>RAM</strong> — the medium Whisper model needs about 2–3 GB of
					RAM. If you're running Ollama simultaneously, aim for at least 16 GB
					total system memory.
				</li>
			</ul>
			<p>
				Accuracy is very good with the medium Whisper model. It won't match the
				latest cloud offerings from Deepgram or ElevenLabs on edge cases, but
				for everyday dictation it's more than sufficient. Adding{" "}
				<Link to="/blog/$slug" params={{ slug: "custom-vocabulary-voice-dictation" }}>
					custom vocabulary
				</Link>{" "}
				helps significantly with proper nouns.
			</p>

			<h2>Troubleshooting</h2>
			<ul>
				<li>
					<strong>"Whisper not found"</strong> — make sure{" "}
					<code>whisper-cpp</code> is in your PATH. Run{" "}
					<code>which whisper-cpp</code> in Terminal to check. If it's not
					found, reinstall with <code>brew install whisper-cpp</code>.
				</li>
				<li>
					<strong>"Ollama connection refused"</strong> — Ollama needs to be
					running in the background. Start it with <code>ollama serve</code> or
					launch the Ollama app.
				</li>
				<li>
					<strong>Slow transcription</strong> — try a smaller Whisper model
					(small or base). Close memory-heavy apps to free up RAM.
				</li>
				<li>
					<strong>Poor accuracy</strong> — upgrade to a larger Whisper model, or
					add frequently misheard words to your custom vocabulary in Parrot's
					settings.
				</li>
				<li>
					<strong>Microphone not working</strong> — check System Settings →
					Privacy & Security → Microphone and ensure Parrot has permission.
				</li>
			</ul>

			<h2>Why go local?</h2>
			<p>Three reasons people choose local mode:</p>
			<ul>
				<li>
					<strong>Privacy</strong> — nothing leaves your Mac. Important for{" "}
					<Link to="/blog/$slug" params={{ slug: "voice-dictation-medical-hipaa" }}>
						medical professionals
					</Link>
					, lawyers, and anyone handling sensitive information.
				</li>
				<li>
					<strong>No API key required</strong> — no external accounts, no setup
					beyond the initial model downloads.
				</li>
				<li>
					<strong>Offline</strong> — works on planes, in areas with bad
					connectivity, or if you just don't want to depend on the internet.
				</li>
			</ul>

			<h2>When to consider cloud instead</h2>
			<p>
				If you need the absolute fastest transcription, or you're on an older
				Intel Mac where local processing is slow, Parrot offers two cloud options:
			</p>
			<ul>
				<li>
					<strong>BYOK (Bring Your Own Key)</strong> — use your own API keys for
					OpenAI Whisper, Deepgram, or ElevenLabs. You control the provider
					relationship. Check our{" "}
					<Link to="/blog/$slug" params={{ slug: "transcription-apis-compared" }}>
						comparison of transcription APIs
					</Link>{" "}
					to pick one.
				</li>
				<li>
					<strong>Managed mode</strong> — let Parrot handle everything. No API
					keys to manage, we route your audio to the best available provider.
				</li>
			</ul>
			<p>
				You can switch between local, BYOK, and managed modes anytime in
				Parrot's settings. Your vocabulary, history, and preferences carry over.
			</p>

			<h2>Resources</h2>
			<ul>
				<li>
					<a
						href="https://github.com/ggerganov/whisper.cpp"
						target="_blank"
						rel="noopener noreferrer"
					>
						Whisper.cpp on GitHub
					</a>{" "}
					— source code, build instructions, and model details.
				</li>
				<li>
					<a
						href="https://github.com/openai/whisper"
						target="_blank"
						rel="noopener noreferrer"
					>
						OpenAI Whisper
					</a>{" "}
					— the original Whisper research and model documentation.
				</li>
				<li>
					<a
						href="https://ollama.com"
						target="_blank"
						rel="noopener noreferrer"
					>
						Ollama
					</a>{" "}
					— official site with downloads and documentation.
				</li>
				<li>
					<a
						href="https://ollama.com/library"
						target="_blank"
						rel="noopener noreferrer"
					>
						Ollama Model Library
					</a>{" "}
					— browse and compare available local LLMs.
				</li>
				<li>
					<a href="https://brew.sh" target="_blank" rel="noopener noreferrer">
						Homebrew
					</a>{" "}
					— macOS package manager.
				</li>
			</ul>
		</>
	);
}
