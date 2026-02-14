import { Link } from "@tanstack/react-router";

export default function VoiceDictationMedicalHipaa() {
	return (
		<>
			<p>
				<strong>
					Yes, voice dictation can be HIPAA-compliant if the audio never leaves
					the device.
				</strong>{" "}
				Local-first tools like Parrot's on-device mode process everything using
				Whisper.cpp on your Mac - no cloud, no third-party servers, no PHI
				transmission. With clinicians spending an estimated 49% of their time on
				documentation (Annals of Internal Medicine, 2017), private voice
				dictation is a practical solution for reducing that burden.
			</p>

			<h2>The HIPAA problem with cloud dictation</h2>
			<p>
				Most voice dictation tools send your audio to a cloud server for
				processing. When that audio contains protected health information (PHI)
				- patient names, diagnoses, treatment plans - you have a HIPAA
				compliance issue.
			</p>
			<p>
				Using a cloud transcription API doesn't automatically violate HIPAA, but
				it requires a<strong> Business Associate Agreement (BAA)</strong> with
				the provider. Some providers offer BAAs (OpenAI does for enterprise
				accounts), but many don't. And even with a BAA, you're trusting a third
				party with patient data.
			</p>

			<h2>Local mode: the simplest solution</h2>
			<p>
				The cleanest way to handle PHI in voice dictation is to keep everything
				on-device. When audio never leaves your machine, there's no transmission
				of PHI to worry about.
			</p>
			<p>
				Parrot's{" "}
				<Link to="/blog/$slug" params={{ slug: "local-voice-dictation-mac" }}>
					local mode
				</Link>{" "}
				does exactly this. Whisper.cpp runs the transcription model on your Mac.
				Ollama handles the AI cleanup locally. Your audio and text stay on your
				laptop - no cloud, no network requests, no third parties.
			</p>
			<p>
				This doesn't mean you can ignore all HIPAA requirements. You still need
				appropriate device security (FileVault encryption, strong passwords,
				auto-lock), and your organization's policies around dictation software
				still apply. But you've eliminated the biggest risk: data in transit.
			</p>

			<h2>Custom vocabulary for medical terminology</h2>
			<p>
				Medical dictation has a specific challenge: terminology. Drug names,
				procedures, anatomical terms, and abbreviations that general-purpose
				transcription engines frequently get wrong.
			</p>
			<p>
				Parrot's{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "custom-vocabulary-voice-dictation" }}
				>
					custom vocabulary
				</Link>{" "}
				lets you add your terms - "metformin," "echocardiogram," "HbA1c" - so
				the transcription engine recognizes them. You build this list once and
				it applies to every dictation going forward.
			</p>

			<h2>Workflow: dictating patient notes</h2>
			<p>Here's how medical professionals typically use Parrot:</p>
			<ul>
				<li>Between appointments, press the hotkey to start recording.</li>
				<li>
					Dictate the patient note conversationally: "Patient is a 54-year-old
					male presenting with chest pain radiating to the left arm. BP 150 over
					95. History of hypertension."
				</li>
				<li>
					The AI cleanup formats it into clean clinical text, removing filler
					words and applying consistent formatting.
				</li>
				<li>
					The note is pasted directly into your EHR or documentation system.
				</li>
			</ul>
			<p>
				The entire process takes 30 seconds to a minute, compared to 3–5 minutes
				of typing the same note. Over a day with 20+ patients, that adds up to
				over an hour saved.
			</p>

			<h2>Cloud options with BYOK</h2>
			<p>
				If local mode doesn't fit your workflow (older Mac, limited disk space),
				Parrot's BYOK (Bring Your Own Key) mode lets you use cloud providers
				like OpenAI Whisper with your own API key. Some providers offer BAAs for
				enterprise accounts. You control the relationship with the provider
				directly.
			</p>
			<p>
				The key difference: in BYOK mode, audio goes directly from your Mac to
				your chosen provider. Parrot never sees or stores it.
			</p>

			<h2>What about Dragon Medical?</h2>
			<p>
				Dragon Medical is the incumbent in medical dictation, and it's good at
				what it does. But it's expensive ($99/month for individual licenses),
				requires a Windows PC or specific integrations, and is optimized for
				large hospital systems.
			</p>
			<p>
				Parrot isn't trying to replace Dragon in a hospital IT department. It's
				for individual practitioners, small practices, and medical professionals
				who want something that works on their Mac. Local mode keeps everything
				on-device, BYOK mode gives you control over your cloud provider.
			</p>

			<h2>Getting started</h2>
			<p>
				If you're a medical professional interested in trying voice dictation
				with local processing, <Link to="/waitlist">join the waitlist</Link> to
				get access when Parrot launches. Choose local mode during setup, and add
				your medical terminology to the custom vocabulary. The whole process
				takes a few minutes, and you can start dictating immediately.
			</p>
		</>
	);
}
