import { Link } from "@tanstack/react-router";

export default function CustomVocabularyVoiceDictation() {
	return (
		<>
			<p>
				<strong>
					Custom vocabulary lists fix the #1 frustration with voice dictation:
					mangled names, acronyms, and domain-specific terms.
				</strong>{" "}
				By feeding a word list to the transcription engine, tools like Parrot
				ensure "Kubernetes" doesn't become "Cooper Netties" and your coworker's
				name comes through correctly every time. Here's how custom vocabulary
				works and how to set it up.
			</p>

			<h2>Why transcription engines struggle with names</h2>
			<p>
				Speech-to-text models are trained on general language. They optimize for
				the most probable sequence of words given the audio. For common English
				words, this works extremely well. For proper nouns, brand names,
				technical jargon, and abbreviations, the model has to guess - and it
				guesses wrong a lot.
			</p>
			<p>
				This isn't a flaw in any one product. Cloud APIs and on-device engines
				share the same challenge: the model doesn't know that "Supabase" is a
				word, so it transcribes what sounds closest in its training data.
			</p>

			<h2>How custom vocabulary works</h2>
			<p>
				Custom vocabulary gives the transcription engine a hint: "these specific
				terms are likely to appear in this audio." When the model is deciding
				between "Cooper Netties" and "Kubernetes," the vocabulary list tips the
				scale toward the correct transcription.
			</p>
			<p>
				In <Link to="/">Parrot</Link>, you add terms in your vocabulary
				settings. The list is stored locally on your Mac and is applied on every
				dictation — including a post-pass that fixes near-miss spellings before
				cleanup.
			</p>

			<h2>What to add to your vocabulary</h2>
			<p>
				Not every word needs to be in your vocabulary - common English words are
				already handled well. Focus on:
			</p>
			<ul>
				<li>
					<strong>People's names</strong> - coworkers, clients, doctors, anyone
					you mention regularly. Include full names and common shortened
					versions.
				</li>
				<li>
					<strong>Company and product names</strong> - your company, tools you
					use, products you discuss. "Figma," "Vercel," "Supabase," "Notion."
				</li>
				<li>
					<strong>Technical terms</strong> - domain-specific jargon. "GraphQL,"
					"OAuth2," "PostgreSQL," "echocardiogram," "amortization."
				</li>
				<li>
					<strong>Acronyms and abbreviations</strong> - "YC," "SaaS," "HIPAA,"
					"BP," "EHR." Include what they stand for if the model confuses them.
				</li>
				<li>
					<strong>Unusual spellings</strong> - brand names with non-standard
					capitalization or spelling. "macOS," "iPhone," "TypeScript."
				</li>
			</ul>

			<h2>How many terms do you need?</h2>
			<p>
				Start small. Add the 10–20 terms you use most frequently and that get
				transcribed incorrectly. You'll notice an immediate improvement. Over
				time, add terms as you encounter transcription errors - it's an
				iterative process.
			</p>
			<p>
				There's no practical limit to the number of terms, but keeping the list
				focused is better than dumping in hundreds of words. A targeted list of
				50–100 terms covers most people's needs.
			</p>

			<h2>Vocabulary + AI cleanup = near-perfect output</h2>
			<p>
				Custom vocabulary handles the transcription step. The AI cleanup step
				handles everything else - grammar, punctuation, filler words,
				formatting. Together, they produce output that reads like you typed it
				carefully, even though you were speaking stream-of-consciousness.
			</p>
			<p>
				For example, you might say: "send the proposal to Priya Raghavan at
				Anthropic and CC the YC partners, um, make sure to mention the Series A
				timeline." With vocabulary and cleanup, the output is:
			</p>
			<p>
				<em>
					"Send the proposal to Priya Raghavan at Anthropic and CC the YC
					partners. Make sure to mention the Series A timeline."
				</em>
			</p>
			<p>
				Every proper noun correct. No filler words. Proper punctuation. Ready to
				send.
			</p>

			<h2>Getting started</h2>
			<p>
				In Parrot, go to your profile page and find the vocabulary section.
				Start typing terms and press enter to add each one. Your vocabulary
				syncs across all your dictation sessions immediately - no restart
				needed.
			</p>
			<p>
				If you're dictating{" "}
				<Link
					to="/blog/$slug"
					params={{ slug: "voice-dictation-medical-hipaa" }}
				>
					medical notes
				</Link>{" "}
				or legal documents, your vocabulary list will be longer and more
				specialized. That's fine - the more specific your list, the better the
				results. <Link to="/download">Download Parrot</Link> to try it today.
			</p>
		</>
	);
}
