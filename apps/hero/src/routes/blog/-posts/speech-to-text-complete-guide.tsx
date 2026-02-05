import { Link } from "@tanstack/react-router";

export default function SpeechToTextCompleteGuide() {
	return (
		<>
			<p>
				Speech to text (also called voice to text, voice transcription, or automatic
				speech recognition) converts spoken words into written text. It powers
				everything from voice assistants to meeting transcriptions to dictation apps.
				This guide covers how the technology works, the best providers available, and
				practical ways to use it.
			</p>

			<h2>How speech to text works</h2>
			<p>
				Modern speech recognition uses deep learning models trained on massive
				datasets of audio and corresponding transcripts. Here's the simplified
				process:
			</p>
			<ol>
				<li>
					<strong>Audio capture</strong> - Your voice is recorded as a waveform
					(changes in air pressure over time).
				</li>
				<li>
					<strong>Feature extraction</strong> - The audio is converted into a
					spectrogram or mel-frequency cepstral coefficients (MFCCs), representing
					the frequency content over time.
				</li>
				<li>
					<strong>Neural network processing</strong> - A trained model (typically a
					transformer architecture) processes these features and predicts the most
					likely sequence of words.
				</li>
				<li>
					<strong>Language model refinement</strong> - A language model helps choose
					between similar-sounding words based on context ("their" vs "there" vs
					"they're").
				</li>
				<li>
					<strong>Output generation</strong> - The final transcript is produced, often
					with punctuation and formatting added automatically.
				</li>
			</ol>
			<p>
				The breakthrough in recent years has been the transformer architecture
				(the same technology behind ChatGPT) applied to speech recognition. Models
				like OpenAI's Whisper have dramatically improved accuracy, especially for
				diverse accents and background noise.
			</p>

			<h2>Top speech to text providers</h2>
			<p>
				If you're building an application or choosing a transcription service, these
				are the leading providers:
			</p>

			<h3>OpenAI Whisper</h3>
			<p>
				Whisper is OpenAI's open-source speech recognition model. It's trained on
				680,000 hours of multilingual audio and is known for excellent accuracy
				across accents and languages.
			</p>
			<ul>
				<li><strong>Accuracy:</strong> Excellent, especially for English and major languages</li>
				<li><strong>Speed:</strong> Moderate (faster with GPU acceleration)</li>
				<li><strong>Cost:</strong> Free to run locally, $0.006/minute via OpenAI API</li>
				<li><strong>Languages:</strong> 99+ languages supported</li>
			</ul>
			<p>
				Whisper can run entirely on your local machine, making it ideal for
				privacy-sensitive applications. The trade-off is that it requires decent
				hardware (especially for the larger, more accurate models).
			</p>

			<h3>Deepgram</h3>
			<p>
				Deepgram is an API-first transcription service optimized for speed. It's
				popular for real-time applications like live captioning and voice assistants.
			</p>
			<ul>
				<li><strong>Accuracy:</strong> Very good, especially for conversational speech</li>
				<li><strong>Speed:</strong> Fastest option - real-time streaming available</li>
				<li><strong>Cost:</strong> $0.0043/minute (Nova-2 model)</li>
				<li><strong>Languages:</strong> 30+ languages</li>
			</ul>
			<p>
				Deepgram excels when latency matters. If you need transcription results in
				milliseconds rather than seconds, it's the best choice.
			</p>

			<h3>ElevenLabs</h3>
			<p>
				ElevenLabs is primarily known for voice synthesis, but they also offer
				transcription. Their Scribe model is optimized for accuracy over speed.
			</p>
			<ul>
				<li><strong>Accuracy:</strong> Excellent, with strong speaker diarization</li>
				<li><strong>Speed:</strong> Slower than alternatives</li>
				<li><strong>Cost:</strong> Included in ElevenLabs subscription plans</li>
				<li><strong>Languages:</strong> 30+ languages</li>
			</ul>
			<p>
				ElevenLabs makes sense if you're already using their voice synthesis products
				or need speaker identification in multi-person recordings.
			</p>

			<h3>Google Cloud Speech-to-Text</h3>
			<p>
				Google's offering is enterprise-focused with extensive customization options
				and integrations with other Google Cloud services.
			</p>
			<ul>
				<li><strong>Accuracy:</strong> Very good</li>
				<li><strong>Speed:</strong> Good, with streaming support</li>
				<li><strong>Cost:</strong> $0.006-$0.024/minute depending on model</li>
				<li><strong>Languages:</strong> 125+ languages</li>
			</ul>

			<h3>Amazon Transcribe</h3>
			<p>
				AWS's transcription service integrates well with other Amazon services and
				offers features like custom vocabulary and automatic content redaction.
			</p>
			<ul>
				<li><strong>Accuracy:</strong> Good</li>
				<li><strong>Speed:</strong> Good, with streaming support</li>
				<li><strong>Cost:</strong> $0.024/minute standard, $0.0102/minute batch</li>
				<li><strong>Languages:</strong> 30+ languages</li>
			</ul>

			<h2>Choosing the right provider</h2>
			<p>
				Your choice depends on what matters most:
			</p>
			<ul>
				<li>
					<strong>Best accuracy:</strong> OpenAI Whisper (large model) or ElevenLabs
				</li>
				<li>
					<strong>Fastest speed:</strong> Deepgram
				</li>
				<li>
					<strong>Best for privacy:</strong> Whisper running locally
				</li>
				<li>
					<strong>Most languages:</strong> Google Cloud Speech-to-Text
				</li>
				<li>
					<strong>Best value:</strong> Deepgram or Whisper API
				</li>
			</ul>
			<p>
				For voice dictation apps like <Link to="/">Parrot</Link>, we support
				multiple providers so you can choose based on your priorities. Some users
				prefer the accuracy of Whisper, others need the speed of Deepgram, and
				privacy-conscious users run everything locally.
			</p>

			<h2>Common use cases</h2>

			<h3>Voice dictation</h3>
			<p>
				The most direct application: speak and your words appear as text. Modern
				voice dictation is fast enough for real-time use and accurate enough that
				most output needs minimal editing. With AI cleanup (removing "um"s, fixing
				grammar), the output often reads better than typed first drafts.
			</p>

			<h3>Meeting transcription</h3>
			<p>
				Automatically transcribe meetings, interviews, and calls. Speaker
				diarization (identifying who said what) makes these transcripts searchable
				and useful for reference.
			</p>

			<h3>Accessibility</h3>
			<p>
				Live captions for deaf and hard-of-hearing users. Real-time transcription
				makes video calls, lectures, and presentations accessible to everyone.
			</p>

			<h3>Voice assistants</h3>
			<p>
				Siri, Alexa, and Google Assistant all use speech to text as the first step
				in understanding your commands. Low latency is critical here - users expect
				instant responses.
			</p>

			<h3>Content creation</h3>
			<p>
				Podcasters and YouTubers use transcription to create show notes, blog posts,
				and searchable archives of their content. Some creators dictate entire
				articles and edit the transcript.
			</p>

			<h2>Tips for better transcription</h2>
			<p>
				Regardless of which provider or app you use, these practices improve results:
			</p>
			<ul>
				<li>
					<strong>Use a good microphone</strong> - A dedicated USB microphone or
					quality headset dramatically improves accuracy compared to laptop mics.
				</li>
				<li>
					<strong>Minimize background noise</strong> - Find a quiet space when
					possible. Modern models handle noise better than older ones, but clean
					audio still wins.
				</li>
				<li>
					<strong>Speak clearly but naturally</strong> - You don't need to
					over-enunciate. Speak at a normal pace and the model will keep up.
				</li>
				<li>
					<strong>Use custom vocabulary</strong> - If your transcription app supports
					it, add names, technical terms, and jargon that commonly get misrecognized.
				</li>
				<li>
					<strong>Try different providers</strong> - Accuracy varies by use case. A
					provider that's great for meetings might not be best for quick dictation.
				</li>
			</ul>

			<h2>The future of speech to text</h2>
			<p>
				Speech recognition has improved dramatically in the past five years, but
				there's more to come:
			</p>
			<ul>
				<li>
					<strong>Smaller, faster local models</strong> - Running accurate
					transcription on phones and laptops without cloud connectivity.
				</li>
				<li>
					<strong>Better context understanding</strong> - Models that understand not
					just words but meaning, improving homophone selection and punctuation.
				</li>
				<li>
					<strong>Multi-modal understanding</strong> - Combining audio with video
					(lip reading) for even better accuracy in noisy environments.
				</li>
				<li>
					<strong>Real-time translation</strong> - Speak in one language, get text in
					another, fast enough for live conversation.
				</li>
			</ul>
			<p>
				The goal is for speech to text to become invisible - fast enough, accurate
				enough, and private enough that you just talk and the right words appear.
				We're closer to that reality than ever before.
			</p>
		</>
	);
}
