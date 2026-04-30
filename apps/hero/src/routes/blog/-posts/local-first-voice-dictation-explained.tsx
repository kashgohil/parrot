import { Link } from "@tanstack/react-router";

export default function LocalFirstVoiceDictationExplained() {
	return (
		<>
			<p>
				<strong>
					Local-first voice dictation means your audio is transcribed on your
					own device instead of being uploaded to a server.
				</strong>{" "}
				Your microphone never streams to the cloud, your transcripts never touch
				a third-party database, and the workflow keeps working when the internet
				doesn't. This guide explains what local-first actually means, why it
				matters, how it compares to cloud dictation, and how to tell whether an
				app is genuinely local-first or just claims to be.
			</p>

			<h2>What "local-first" actually means</h2>
			<p>
				The term was popularized by a{" "}
				<a
					href="https://www.inkandswitch.com/local-first/"
					rel="noopener noreferrer"
					target="_blank"
				>
					2019 essay from researchers at Ink &amp; Switch
				</a>{" "}
				describing software that puts the user's device - not a remote server -
				at the center of the experience. As the authors put it:
			</p>
			<blockquote>
				<p>
					"In a local-first app, the data on your device is the primary copy,
					not just a cache of data stored on a server. Cloud services may be
					used to enhance the experience, but the local copy is the source of
					truth."
				</p>
			</blockquote>
			<p>Applied to voice dictation, local-first means:</p>
			<ul>
				<li>
					<strong>Audio stays on your device.</strong> Your microphone feed is
					processed by a model running on your CPU, GPU, or Neural Engine -
					never uploaded.
				</li>
				<li>
					<strong>Transcripts stay on your device.</strong> History, vocabulary,
					and settings live in a local database, not someone else's cloud.
				</li>
				<li>
					<strong>Works offline.</strong> No network = no problem. The app
					doesn't degrade or stop working.
				</li>
				<li>
					<strong>You own the data.</strong> Export, delete, or move it without
					asking permission.
				</li>
			</ul>
			<p>
				Local-first is not the same as "end-to-end encrypted" or "private
				cloud." Both still upload your data; local-first doesn't.
			</p>

			<h2>Why it matters</h2>

			<h3>Privacy that doesn't depend on policy</h3>
			<p>
				Cloud dictation services protect your audio with privacy policies -
				documents that can change, be misinterpreted, or be overridden by
				subpoena. Local-first dictation protects your audio with physics: it
				never leaves the machine, so there's nothing to request, leak, or
				repurpose for training data.
			</p>

			<h3>Industries that legally require it</h3>
			<p>For some users, local-first isn't a preference, it's a requirement:</p>
			<ul>
				<li>
					<strong>Healthcare.</strong> HIPAA-covered conversations should not be
					sent to a third-party API without a Business Associate Agreement (see{" "}
					<a
						href="https://www.hhs.gov/hipaa/for-professionals/covered-entities/sample-business-associate-agreement-provisions/index.html"
						rel="noopener noreferrer"
						target="_blank"
					>
						HHS guidance on BAAs
					</a>
					). Local processing avoids the question entirely.
				</li>
				<li>
					<strong>Legal.</strong> Attorney-client privilege erodes the moment a
					recording leaves the firm's control.
				</li>
				<li>
					<strong>Finance.</strong> Internal trading desks, deal teams, and
					compliance reviews can't afford a cloud round-trip on sensitive
					discussions.
				</li>
				<li>
					<strong>Government and defense.</strong> Classified or
					controlled-unclassified content can't go to consumer cloud APIs.
				</li>
			</ul>

			<h3>Reliability</h3>
			<p>
				Cloud dictation breaks during outages, on flights, in cafes with bad
				Wi-Fi, and on trains in tunnels. Local-first dictation works in all of
				those places. The difference shows up most when you need it - in the
				middle of a sentence.
			</p>

			<h3>Latency</h3>
			<p>
				A local Whisper model on Apple Silicon can return a transcript in
				100-300ms after you stop speaking. Cloud APIs add a network round-trip
				on top of their own processing time, so the same transcript can take
				600-1200ms. The gap is small in absolute terms but obvious in feel -
				local dictation feels like typing; cloud dictation feels like waiting.
			</p>

			<h3>Cost over time</h3>
			<p>
				Local transcription is free per minute after install. Cloud
				transcription is free per minute until your free tier runs out, then
				it's $0.006-0.01 per minute forever. For a daily dictator, that's $5-15
				a month - sustainable, but unnecessary if your machine is capable of
				running the model itself.
			</p>

			<h2>Local-first vs cloud-first vs hybrid</h2>
			<table>
				<thead>
					<tr>
						<th></th>
						<th>Local-first</th>
						<th>Cloud-first</th>
						<th>Hybrid</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>Audio leaves device</td>
						<td>No</td>
						<td>Yes</td>
						<td>Sometimes</td>
					</tr>
					<tr>
						<td>Works offline</td>
						<td>Yes</td>
						<td>No</td>
						<td>Partial</td>
					</tr>
					<tr>
						<td>Latency</td>
						<td>100-300ms</td>
						<td>600-1200ms</td>
						<td>Varies</td>
					</tr>
					<tr>
						<td>Per-minute cost</td>
						<td>$0</td>
						<td>$0.006-0.01</td>
						<td>Mixed</td>
					</tr>
					<tr>
						<td>Top-end accuracy</td>
						<td>Very good</td>
						<td>Best</td>
						<td>Best (when online)</td>
					</tr>
					<tr>
						<td>HIPAA-friendly</td>
						<td>Yes</td>
						<td>Only with BAA</td>
						<td>Depends</td>
					</tr>
				</tbody>
			</table>

			<h2>What's changed: local models are now good enough</h2>
			<p>
				A few years ago, the trade-off was real - local models were noticeably
				worse than cloud ones, and you paid for privacy with accuracy. That's no
				longer true. On Apple Silicon, the medium and large Whisper variants are
				within a few percentage points of the best cloud APIs on most everyday
				speech, and they run in real time. The reason most apps still default to
				cloud transcription is inertia, not capability.
			</p>

			<h2>How to tell if an app is actually local-first</h2>
			<p>
				Marketing pages love the word "private." Here's how to verify the claim:
			</p>
			<ol>
				<li>
					<strong>The airplane test.</strong> Turn off Wi-Fi and Ethernet, then
					dictate. If it still works, the model is local. If it hangs or errors,
					it isn't.
				</li>
				<li>
					<strong>The first-launch test.</strong> A truly local app downloads
					model weights once, then never needs the network. If it requires login
					or a server check on every launch, it isn't fully local-first.
				</li>
				<li>
					<strong>The privacy policy test.</strong> Search the policy for words
					like "transmit," "process on our servers," or "third-party
					processors." Their absence is meaningful.
				</li>
				<li>
					<strong>The network monitor test.</strong> Run Little Snitch or
					macOS's built-in network monitor while dictating. A local-first app
					makes no outbound connections during transcription.
				</li>
			</ol>

			<h2>Where local-first still has limits</h2>
			<p>It's worth being honest about the trade-offs:</p>
			<ul>
				<li>
					<strong>Disk space.</strong> Local models are 500 MB to 3 GB.
				</li>
				<li>
					<strong>RAM.</strong> Larger models need 4-8 GB available during
					transcription.
				</li>
				<li>
					<strong>Older hardware.</strong> Intel Macs and base-model M1s can
					struggle with the largest Whisper variants.
				</li>
				<li>
					<strong>Specialized accuracy.</strong> Cloud providers fine-tune on
					millions of hours of audio. For very heavy accents or noisy
					environments, cloud still has an edge.
				</li>
			</ul>
			<p>
				The right answer for most people is an app that <em>can</em> go local
				but lets you pick a cloud provider when you specifically want one -
				which is how <Link to="/">Parrot</Link> is built.
			</p>

			<h2>The bottom line</h2>
			<p>
				Local-first voice dictation is no longer the slow, niche option - it's
				the default that should be questioned, not chosen. Your audio is some of
				the most personal data you generate. There's no good reason to send it
				to a server when your laptop can transcribe it faster, for free, in
				private.
			</p>
			<p>
				<Link to="/">Parrot</Link> is local-first by default, with optional
				cloud providers when you want them.{" "}
				<Link to="/download">Download it</Link> and run the airplane test
				yourself.
			</p>
		</>
	);
}
