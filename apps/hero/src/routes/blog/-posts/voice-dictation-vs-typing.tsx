import { Link } from "@tanstack/react-router";

export default function VoiceDictationVsTyping() {
	return (
		<>
			<p>
				The average person types at about 40 words per minute. Decent typists hit 60–80 WPM.
				But most people can <strong>speak at 130–150 WPM</strong> without breaking a sweat. On
				paper, voice dictation should be 2–3x faster than typing. In practice, it depends on
				what you're doing.
			</p>

			<h2>Raw speed: dictation wins easily</h2>
			<p>
				We tested drafting emails, meeting notes, and long-form writing using both methods. For
				first drafts of prose — emails, documentation, journal entries — voice dictation was
				consistently <strong>2.5–3x faster</strong> than typing. The words just come out faster
				when you don't have to think about your fingers.
			</p>
			<p>
				This advantage holds even when you factor in corrections. Modern transcription engines
				like Whisper and Deepgram are accurate enough that you're not spending significant time
				fixing errors. With{" "}
				<Link to="/about">AI cleanup</Link>, the output often needs less
				editing than a typed first draft.
			</p>

			<h2>Where typing still wins</h2>
			<p>
				Voice dictation isn't the right tool for everything. Code, spreadsheet formulas, and
				anything with lots of special characters is still faster to type. You can dictate a
				comment explaining what your function does, but you wouldn't dictate the function itself.
			</p>
			<p>
				Short messages — a two-word Slack reply, a quick "sounds good" — are faster to type
				because the overhead of starting a recording isn't worth it. The sweet spot for
				dictation is anything longer than a sentence or two.
			</p>

			<h2>The editing question</h2>
			<p>
				Critics of voice dictation usually point to editing time. "Sure, you spoke faster, but
				then you have to fix everything." This was true five years ago. It's much less true
				now.
			</p>
			<p>
				With a modern transcription engine and an AI cleanup pass, the output is already
				grammatically correct, properly punctuated, and free of filler words. You're editing
				for content and tone, not for basic correctness. That's the same editing you'd do with
				typed text.
			</p>

			<h2>Custom vocabulary eliminates the biggest friction</h2>
			<p>
				The most frustrating part of dictation has always been proper nouns. Your coworker's
				name, your company's product, medical or legal terminology — these get mangled
				constantly. <Link to="/blog/custom-vocabulary-voice-dictation">Custom vocabulary</Link>{" "}
				fixes this. You add your terms once, and the transcription engine handles them correctly
				every time.
			</p>

			<h2>When to use which</h2>
			<p>
				Here's our practical recommendation after months of testing:
			</p>
			<ul>
				<li><strong>Use voice dictation</strong> for emails, documentation, notes, journal entries, messages longer than a sentence, and anything where you're expressing ideas in natural language.</li>
				<li><strong>Use typing</strong> for code, formulas, very short messages, and situations where you can't speak aloud (libraries, open offices without a private space).</li>
				<li><strong>Use both</strong> — dictate the draft, type the edits. This hybrid approach is the fastest workflow we've found.</li>
			</ul>

			<h2>The real advantage isn't speed</h2>
			<p>
				Speed matters, but the bigger win is <strong>reduced friction</strong>. When you can
				just talk through your thoughts, you spend less energy on the mechanics of getting
				words out and more on what you're actually trying to say. Writers call this "flow."
				Dictation gets you there faster because there's less between your brain and the page.
			</p>
			<p>
				If you've never tried modern voice dictation, the gap between what you remember and
				what exists now is significant. The accuracy is there, the speed is there, and with
				tools like <Link to="/">Parrot</Link>, the setup is minimal — press a hotkey
				and start talking.
			</p>
		</>
	);
}
