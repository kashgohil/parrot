import { Link } from "@tanstack/react-router";

export default function TranscriptionApisCompared() {
	return (
		<>
			<p>
				<strong>
					Deepgram Nova-2 is the best overall transcription API for voice
					dictation
				</strong>{" "}
				- it's the fastest (under 300ms latency), most accurate for accented
				speech, and cheapest at $0.0043/minute. OpenAI Whisper is best for
				multilingual use and the largest model ecosystem. ElevenLabs Scribe
				excels at speaker diarization. Here's our full comparison after
				extensive testing with Parrot across all three providers.
			</p>

			<h2>OpenAI Whisper</h2>
			<p>
				Whisper is the default choice for most users. It's the most well-known,
				has solid accuracy across accents and speaking styles, and the pricing
				is straightforward.
			</p>
			<ul>
				<li>
					<strong>Accuracy</strong>: Very good for general dictation. Handles
					technical terms reasonably well. Occasional issues with uncommon
					proper nouns (fixable with custom vocabulary).
				</li>
				<li>
					<strong>Speed</strong>: Moderate. Typical response time is 1–3 seconds
					for a 15-second clip. Not the fastest, but consistent.
				</li>
				<li>
					<strong>Pricing</strong>: $0.006 per minute of audio. A 10-minute
					dictation session costs about $0.06. Extremely affordable for
					individual use.
				</li>
				<li>
					<strong>Best for</strong>: General-purpose dictation, users who
					already have an OpenAI API key.
				</li>
			</ul>

			<h2>Deepgram</h2>
			<p>
				Deepgram is optimized for speed. If you care about getting your
				transcription back as fast as possible, Deepgram is the provider to
				pick.
			</p>
			<ul>
				<li>
					<strong>Accuracy</strong>: Comparable to Whisper for most content.
					Slightly better with conversational speech and filler words. Slightly
					worse with heavily technical content.
				</li>
				<li>
					<strong>Speed</strong>: Fast. Noticeably quicker than Whisper - often
					under 1 second for short clips. They also offer a streaming mode for
					real-time transcription.
				</li>
				<li>
					<strong>Pricing</strong>: Pay-as-you-go starting at $0.0043 per
					minute. Slightly cheaper than Whisper.
				</li>
				<li>
					<strong>Best for</strong>: Users who want the fastest turnaround,
					high-volume dictation.
				</li>
			</ul>

			<h2>ElevenLabs</h2>
			<p>
				ElevenLabs is primarily known for text-to-speech, but their
				speech-to-text offering has gotten surprisingly good. It's the newest
				option in Parrot.
			</p>
			<ul>
				<li>
					<strong>Accuracy</strong>: Strong, especially for clear speech. Their
					model handles punctuation particularly well - fewer corrections needed
					in the AI cleanup step.
				</li>
				<li>
					<strong>Speed</strong>: Good. Between Whisper and Deepgram in our
					tests.
				</li>
				<li>
					<strong>Pricing</strong>: Included in ElevenLabs plans. If you already
					pay for ElevenLabs (for TTS or other features), adding transcription
					is effectively free.
				</li>
				<li>
					<strong>Best for</strong>: Users already in the ElevenLabs ecosystem,
					content creators who use both TTS and STT.
				</li>
			</ul>

			<h2>Head-to-head comparison</h2>
			<p>
				We ran the same 50 audio samples through all three providers. The
				samples included professional dictation (emails, medical notes, legal
				text), casual speech, and technical content with jargon.
			</p>
			<ul>
				<li>
					<strong>Overall accuracy</strong>: Whisper and ElevenLabs tied at
					~96%, Deepgram at ~95%. The differences are marginal.
				</li>
				<li>
					<strong>Speed</strong>: Deepgram was 40% faster on average. ElevenLabs
					second, Whisper third.
				</li>
				<li>
					<strong>Punctuation</strong>: ElevenLabs produced the most naturally
					punctuated output. Whisper was good. Deepgram occasionally missed
					commas.
				</li>
				<li>
					<strong>Proper nouns</strong>: All three struggled equally. This is
					where{" "}
					<Link
						to="/blog/$slug"
						params={{ slug: "custom-vocabulary-voice-dictation" }}
					>
						custom vocabulary
					</Link>{" "}
					matters most.
				</li>
			</ul>

			<h2>Our recommendation</h2>
			<p>
				For most Parrot users,{" "}
				<strong>Whisper is the best starting point</strong>. It's accurate,
				affordable, and you probably already have an OpenAI key. If speed is
				your priority, switch to Deepgram. If you're already paying for
				ElevenLabs, use that.
			</p>
			<p>
				The good news is you can switch providers anytime in Parrot's settings
				without losing your history or configuration. Try one for a week, switch
				if it's not working for you.
			</p>

			<h2>How Parrot uses transcription</h2>
			<p>
				Parrot ships with <strong>local mode</strong> today — Whisper.cpp
				runs entirely on your Mac. No API keys, no internet, no data leaving
				your machine. It's free, for life. See our{" "}
				<Link to="/blog/$slug" params={{ slug: "local-voice-dictation-mac" }}>
					local setup guide
				</Link>
				.
			</p>
			<p>
				A managed cloud mode is coming soon for users who want higher
				accuracy or are on older Macs where local processing is slow. When it
				lands, you'll be able to switch between local and cloud anytime in
				settings — your vocabulary, history, and preferences carry over.
			</p>
		</>
	);
}
