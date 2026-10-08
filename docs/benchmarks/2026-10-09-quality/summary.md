# Local quality evaluation

Complete: True. Pending human review: 498.

| Variant | Stage / upstream | Tone / language | Cases | Errors | Fact flags | New cleanup flags | Fallbacks | WER | CER | Median ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| parakeet-v3 | asr | auto / en | 16 | 0 | 6 | 0 | 0 | 3.1% | — | 106.7 |
| parakeet-v3 | asr | auto / es | 2 | 0 | 0 | 0 | 0 | 0.0% | — | 75.0 |
| parakeet-v3 | asr | auto / fr | 4 | 0 | 2 | 0 | 0 | 10.5% | — | 101.5 |
| qwen-0-5b | cleanup_isolated | casual | 32 | 0 | 2 | 2 | 4 | — | — | 102.7 |
| qwen-0-5b | cleanup_isolated | formal | 32 | 0 | 2 | 2 | 4 | — | — | 101.3 |
| qwen-0-5b | cleanup_isolated | neutral | 32 | 0 | 2 | 2 | 4 | — | — | 100.0 |
| qwen-0-5b | cleanup_pipeline / parakeet-v3 | neutral | 22 | 0 | 8 | 0 | 2 | — | — | 78.5 |
| qwen-0-5b | cleanup_pipeline / whisper-compact | neutral | 30 | 0 | 12 | 2 | 4 | — | — | 76.7 |
| qwen-0-5b | cleanup_pipeline / whisper-turbo | neutral | 30 | 0 | 12 | 2 | 4 | — | — | 79.5 |
| qwen-1-5b | cleanup_isolated | casual | 32 | 0 | 2 | 2 | 6 | — | — | 208.1 |
| qwen-1-5b | cleanup_isolated | formal | 32 | 0 | 2 | 2 | 6 | — | — | 206.2 |
| qwen-1-5b | cleanup_isolated | neutral | 32 | 0 | 2 | 2 | 6 | — | — | 205.4 |
| qwen-1-5b | cleanup_pipeline / parakeet-v3 | neutral | 22 | 0 | 8 | 0 | 2 | — | — | 136.9 |
| qwen-1-5b | cleanup_pipeline / whisper-compact | neutral | 30 | 0 | 14 | 0 | 6 | — | — | 136.4 |
| qwen-1-5b | cleanup_pipeline / whisper-turbo | neutral | 30 | 0 | 10 | 0 | 6 | — | — | 140.8 |
| whisper-compact | asr | auto / en | 16 | 0 | 6 | 0 | 0 | 4.2% | — | 263.3 |
| whisper-compact | asr | auto / es | 2 | 0 | 2 | 0 | 0 | 25.0% | — | 243.1 |
| whisper-compact | asr | auto / fr | 4 | 0 | 0 | 0 | 0 | 5.3% | — | 265.1 |
| whisper-compact | asr | auto / hi | 2 | 0 | 2 | 0 | 0 | — | 19.4% | 340.4 |
| whisper-compact | asr | auto / hi+en | 2 | 0 | 2 | 0 | 0 | — | 58.8% | 263.3 |
| whisper-compact | asr | auto / ja | 2 | 0 | 0 | 0 | 0 | — | 0.0% | 300.8 |
| whisper-compact | asr | auto / zh | 2 | 0 | 2 | 0 | 0 | — | 8.3% | 249.0 |
| whisper-compact | asr | en / en | 16 | 0 | 6 | 0 | 0 | 4.2% | — | 128.6 |
| whisper-compact | asr | es / es | 2 | 0 | 2 | 0 | 0 | 25.0% | — | 109.3 |
| whisper-compact | asr | fr / fr | 4 | 0 | 0 | 0 | 0 | 5.3% | — | 130.4 |
| whisper-compact | asr | hi / hi | 2 | 0 | 2 | 0 | 0 | — | 19.4% | 215.1 |
| whisper-compact | asr | hi / hi+en | 2 | 0 | 2 | 0 | 0 | — | 44.1% | 156.2 |
| whisper-compact | asr | ja / ja | 2 | 0 | 0 | 0 | 0 | — | 0.0% | 164.0 |
| whisper-compact | asr | zh / zh | 2 | 0 | 2 | 0 | 0 | — | 8.3% | 118.1 |
| whisper-turbo | asr | auto / en | 16 | 0 | 6 | 0 | 0 | 2.8% | — | 933.9 |
| whisper-turbo | asr | auto / es | 2 | 0 | 0 | 0 | 0 | 0.0% | — | 853.2 |
| whisper-turbo | asr | auto / fr | 4 | 0 | 0 | 0 | 0 | 5.3% | — | 891.7 |
| whisper-turbo | asr | auto / hi | 2 | 0 | 2 | 0 | 0 | — | 9.7% | 939.9 |
| whisper-turbo | asr | auto / hi+en | 2 | 0 | 2 | 0 | 0 | — | 61.8% | 871.5 |
| whisper-turbo | asr | auto / ja | 2 | 0 | 0 | 0 | 0 | — | 0.0% | 962.8 |
| whisper-turbo | asr | auto / zh | 2 | 0 | 0 | 0 | 0 | — | 0.0% | 863.0 |
| whisper-turbo | asr | en / en | 16 | 0 | 6 | 0 | 0 | 2.8% | — | 264.8 |
| whisper-turbo | asr | es / es | 2 | 0 | 0 | 0 | 0 | 0.0% | — | 205.8 |
| whisper-turbo | asr | fr / fr | 4 | 0 | 0 | 0 | 0 | 5.3% | — | 244.4 |
| whisper-turbo | asr | hi / hi | 2 | 0 | 2 | 0 | 0 | — | 9.7% | 275.7 |
| whisper-turbo | asr | hi / hi+en | 2 | 0 | 2 | 0 | 0 | — | 64.7% | 266.2 |
| whisper-turbo | asr | ja / ja | 2 | 0 | 0 | 0 | 0 | — | 0.0% | 310.5 |
| whisper-turbo | asr | zh / zh | 2 | 0 | 0 | 0 | 0 | — | 0.0% | 215.2 |

WER and CER aggregates include only cases declaring that primary metric; empty references use absolute insertion counts.
Fact/script flags screen for regressions. Review source and output before judging meaning or cleanup usefulness.
Skipped unsupported combinations: 8. These are not passing evaluations.
This synthetic seed does not qualify any model or language for release.
