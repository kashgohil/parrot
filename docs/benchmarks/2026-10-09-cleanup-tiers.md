# Cleanup tier comparison — ISSUE-1051

Keep **Qwen2.5 0.5B Q4_K_M as the existing default** and recommend it as the
starting point when memory or latency matters. The three current tiers trade
memory and speed for different model behavior; the largest model does not
consistently produce better formatting. Saved selections remain unchanged.

Settings now calls the tiers Basic, Standard and Large, identifies download sizes
as storage, and replaces assumed quality rankings with the observed tradeoffs.
Standard is an optional English-formatting choice when the extra memory and time
are acceptable. Large is an explicit experiment, rather than a guaranteed upgrade
for Hindi or Hindi–English mixing. Native-speaker review remains ISSUE-1077;
whole-app 8/16 GB device, older-chip and energy qualification remains ISSUE-1072.

## Repeated quality comparison

The current production cleanup prompt, source guards and 2,048-token sidecar run
against four corpora, all three tiers, three isolated tones and two sequential
passes. All matching tier inputs and system prompts are checked for equality.
The seed also includes each engine's actual Auto ASR output with Neutral cleanup:
Whisper Turbo Q5_0 with the optional Hindi–English hint and Parakeet v3 INT8.
The hint is explicitly configured for this comparison; the app's default remains
off. Parakeet's unsupported Hindi/Hinglish/CJK coverage is skipped explicitly.

| Corpus | Scored rows | Coverage |
| --- | ---: | --- |
| Existing 16-case seed | 496 | 52 ASR, 288 isolated cleanup, 156 pipeline cleanup |
| Existing 12-case faithfulness corpus | 216 | Commands, corrections, uncertainty, names and repetition |
| Existing 32-case filler corpus | 576 | Language, quote/name and permitted-pause controls |
| New 8-case formatting probes | 144 | English, Hindi, Hinglish, French, Chinese and Japanese |
| Total | **1,432** | **1,380 cleanup rows and 52 ASR rows** |

There are no inference error rows. All **716 paired results** have identical
returned text, model responses/candidates, completion status, fallback and bypass
decisions. All recorded prompt plus output reservations fit the actual context.
All **1,432 hash-bound semantic/usefulness review decisions remain pending**.

| Tier | Cleanup rows | Fallbacks | Incomplete generations | Seed isolated median native ms | Seed pipeline median native ms |
| --- | ---: | ---: | ---: | ---: | ---: |
| Basic / 0.5B | 460 | 218 | 6 | 73.5 | 70.6 |
| Standard / 1.5B | 460 | 266 | 4 | 139.5 | 127.2 |
| Large / 3B | 460 | 160 | 0 | 279.2 | 264.3 |

Medians include only requests with native segments, exclude model loading, and
include the long seed case. Each tier has 440 native cleanup requests, 12 empty
isolated inputs and 8 application pipeline bypasses. The bypasses retain exact
input without a prompt, completion claim or model acquisition. A fallback can
protect content while delivering no useful punctuation; these counts are not
semantic accuracy or failure-rate estimates.

Seed, filler and formatting returned outputs have **zero introduced source-content
screening flags**. All 576 filler outputs match the allowed normalized content
oracle. The existing **18 amount-correction flags** remain visible in the
faithfulness corpus: all three tones/two repeats on all three tiers for the
explicit correction case. They are not waived or counted as new lost facts here.
Reference-fact checks pass on all isolated text corpora.

The seed pipeline has 20 reference-fact flags per tier, with no new source-content
flags relative to raw ASR. These expose retained upstream recognition errors,
including Hindi and Hinglish; cleanup does not establish that recognition is
correct or repair lost facts. Larger tiers are not a substitute for ASR review.

The ten incomplete filler results reproduce ISSUE-1048: six 0.5B and four 1.5B
token limits, including Hindi-leading and Hindi–English-interior cases. Every
incomplete result keeps exact original input and empty usable model output. No
transcript is clipped to make completion appear successful.

## Formatting is a separate outcome

The eight new probes remove terminal punctuation from clear statements and an
English question. Latin-script examples additionally request initial uppercase.
The check requires an allowed terminal mark and, where specified, initial case;
it does not grade grammar, internal commas, meaning or general language accuracy.
Non-English fixture wording and punctuation choices still need speaker review.

| Tier | Neutral passes | Casual passes | Formal passes | Total |
| --- | ---: | ---: | ---: | ---: |
| 0.5B | 2/16 | 2/16 | 4/16 | **8/48** |
| 1.5B | 8/16 | 8/16 | 8/16 | **24/48** |
| 3B | 0/16 | 0/16 | 2/16 | **2/48** |

For example, Neutral 1.5B returns `Priya did not approve invoice 25 on Friday.`
and passes that statement's case/period check. 0.5B echoes its lowercase input;
3B adds a period but keeps its lowercase initial. For the question, 0.5B and
1.5B return `Can Priya not deploy release 2.1 until Friday?`; 3B echoes a
lowercase form without a question mark. Hindi/Hinglish probes gain no requested
terminal mark on any tier. The content screens still pass.

These narrow checks favor 1.5B for this English formatting task, while 3B's fewer
fallbacks often reflect accepted echo outputs. Neither establishes a universal
model ranking. **ISSUE-1082** tracks punctuation/capitalization improvement with
all existing fidelity guards, limits and regression corpora intact.

## Fresh-process loading, warm latency and memory

Six additional owned headless workers evaluate the same seed inputs in Neutral,
preceded by two identical short requests. Tier order reverses on the second pass.
The six quiet runs are separated from compilation and other benchmark inference.
There are 108 result rows, including 96 native requests and 12 exact bypasses.

| Tier | File bytes / decimal download size | Load ms | First short ms | Warm identical short ms | Sampled peak footprint MiB | Sampled peak RSS MiB |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 0.5B | 491,400,032 / 491 MB | 184.7–195.1 | 106.0–121.6 | 56.1–57.7 | 186.0–188.4 | 600.3–602.5 |
| 1.5B | 1,117,320,736 / 1.12 GB | 208.9–210.2 | 233.4–238.5 | 92.6–93.2 | 221.1–223.4 | 1232.0–1234.2 |
| 3B | 2,104,932,768 / 2.10 GB | 243.2–244.7 | 453.8–469.2 | 161.3–162.7 | 240.0–240.0 | 2192.2–2192.2 |

Load is recorded separately from inference. Load plus first short inference is
290.7–316.7 ms, 443.6–447.4 ms and 697.0–713.9 ms respectively. These are fresh
process/model sessions with warm, uncontrolled filesystem/kernel/Metal caches;
they are **not first-ever cold-disk or app-launch timings**. The identical warm
request also exercises the production prompt cache, rather than representing all
dictations. The regular seed medians above include varied inputs.

The macOS 50 ms sampler attributes only each new quality worker and its owned
sidecar descendants. It retains 318 raw samples: 316 complete process-tree
ledgers and 2 incomplete exit-race samples. Peaks exclude those two incomplete
samples; no missing ledger becomes a zero-memory success. Maximum observed gap
is 120.9 ms. Sampling may miss brief peaks.

Physical footprint and RSS are different per-process measures. RSS includes
resident file-backed model pages; footprint does not mean total app memory or
all unified-memory residency. Do not add the columns together or advertise a
240 MiB whole-app requirement for 3B. GUI/WebKit, ASR, microphone, the installed
app, system pressure/swap and energy are excluded. Hardware is **M4 Pro / 24 GiB,
macOS 26.6.2**. No 8/16 GB support claim follows from these measurements.

For a tight memory budget, use Basic with demand loading and idle release, or
disable cleanup for exact raw transcription. Existing low-memory mode keeps
speech and builtin cleanup sequential, disables speech previews/prewarming and
uses its shorter idle policy without overwriting saved choices. Standard and
Large require an explicit choice and enough measured headroom on the target
device. Fixed RAM/chip thresholds are deferred to ISSUE-1072.

## Reproduction and evidence

[Workflow](../cleanup-tier-comparison.md),
[machine summary](2026-10-09-cleanup-tiers/summary.json),
[native archive](2026-10-09-cleanup-tiers/native-validation.tar.gz), and
[checksums](2026-10-09-cleanup-tiers/SHA256SUMS) retain requests, raw candidates,
returned text, scores, pending review queues, full prompts, model/audio hashes,
stderr, complete/incomplete process ledgers, configs, fixtures and source snapshots.
No weights, executables, private dictation or app database are archived.

Quality executions use source revision `f5b3696` with clean tracked trees. The
worker was rebuilt at `aea1b38`; Rust production source is unchanged between those
revisions. Binary hashes identify the actual executables:

| Artifact | SHA-256 |
| --- | --- |
| Quality worker | `86d86e0f89c64ed0ccd1ae5ab2042827ca38e681ee5b05953e78759e92a0e6fc` |
| Sidecar | `2b8797d22cad981145849f39f4a8259da347b40b74b521dc928b0c46c3cfab3a` |
| 0.5B model | `74a4da8c9fdbcd15bd1f6d01d621410d31c6fc00986f5eb687824e7b93d7a9db` |
| 1.5B model | `6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e` |
| 3B model | `626b4a6678b86442240e33df819e00132d3ba7dddfe1cdc4fbb18e0a9615c62d` |

Resource executions use the same worker/sidecar bytes, with pending Settings
copy and a Rust documentation-comment edit recorded in their dirty-tree hash.
The archive includes exact native source from `f5b3696` and current settings copy.
The installed app's existing sidecar and all model selections remain untouched.

The first seed attempt is incomplete because the runner tried to hash a nonexistent
prompt on an application bypass. ISSUE-1051 repairs it and adds a complete-run
regression test. That diagnostic is excluded from all tables. An exploratory
resource pass overlapped frontend compilation; its logs are also retained but
only the subsequent quiet six-run measurements appear above.

To reproduce, adapt the archived local model paths, build both release workers,
and run `quality-evaluation.py run` with `--repeats 2` on each manifest, using
fresh output directories. Use the speech-enabled config for the seed and the
cleanup-only config for the other corpora. Run `cleanup-tier-memory.py` as shown
in the workflow. The archive's `evidence.py --repo ... --input-prefix ...
--output ...` verifies matching prompts, repeat signatures, source oracles,
completion budgets, fresh scores, memory peaks and every internal hash.

Validation: **35 Python tests pass**, including native-bypass runner integration
and incomplete-ledger handling; frontend TypeScript/Vite and both release worker
builds pass. Existing dead-code and bundle-size warnings remain. No app was
installed/launched, no model preference changed, and nothing was pushed.
