//! Explicit, opt-in copy/lock benchmark. No model inference or microphone.
//! The legacy branch reproduces the pre-ISSUE-1055 snapshot and second copy.
use super::{AudioRecorder, CaptureSnapshot, RecordedSamples};
use serde_json::json;
use std::sync::{Arc, Barrier};
use std::time::{Duration, Instant};

fn snapshot(recorder: &AudioRecorder, legacy: bool) -> (CaptureSnapshot, Option<Vec<f32>>) {
    if !legacy {
        return (recorder.snapshot_tail(20), None);
    }
    let full = recorder.samples.lock().unwrap().clone();
    let total_samples = full.len();
    let start = total_samples.saturating_sub(recorder.sample_rate as usize * 20);
    let audio = RecordedSamples {
        samples: full[start..].to_vec(),
        sample_rate: recorder.sample_rate,
    };
    // The old streaming loop retained the full snapshot across inference.
    (
        CaptureSnapshot {
            audio,
            total_samples,
        },
        Some(full),
    )
}

fn timings(mut values: Vec<f64>) -> serde_json::Value {
    values.sort_by(f64::total_cmp);
    json!({"count": values.len(), "median_ms": values[values.len() / 2],
        "p95_ms": values[(values.len() as f64 * 0.95).ceil() as usize - 1],
        "max_ms": values[values.len() - 1]})
}

#[test]
#[ignore = "opt-in copy/lock benchmark; run through preview-buffer-benchmark.py"]
fn measure_preview_buffers() {
    let mode = std::env::var("PARROT_PREVIEW_BENCH_MODE").expect("legacy or bounded");
    assert!(matches!(mode.as_str(), "legacy" | "bounded"));
    let seconds: usize = std::env::var("PARROT_PREVIEW_BENCH_SECONDS")
        .expect("capture seconds")
        .parse()
        .unwrap();
    assert!((20..=600).contains(&seconds));
    let interval_ms: u64 = std::env::var("PARROT_PREVIEW_BENCH_INTERVAL_MS")
        .unwrap_or_else(|_| "10".into())
        .parse()
        .unwrap();
    let copies: usize = std::env::var("PARROT_PREVIEW_BENCH_COPIES")
        .unwrap_or_else(|_| "120".into())
        .parse()
        .unwrap();
    assert!((10..=900).contains(&interval_ms) && (1..=120).contains(&copies));
    let callback_count = (interval_ms as usize * copies / 10 + 50).max(200);
    let legacy = mode == "legacy";
    let rate = 48_000;
    let initial_len = rate * seconds;
    const CHUNK: usize = 480; // 10 ms mono capture callback at 48 kHz.
    let mut recorder = AudioRecorder::new().unwrap();
    recorder.begin_fixture(rate as u32);
    {
        // Exclude capture capacity growth so this isolates preview copies.
        let mut capture = recorder.samples.lock().unwrap();
        capture.reserve_exact(initial_len + callback_count * CHUNK);
        capture.resize(initial_len, 0.125);
    }
    println!(
        "PREVIEW_BENCH {}",
        json!({"phase": "capture_ready", "mode": mode,
        "seconds": seconds, "sample_rate": rate, "copy_interval_ms": interval_ms,
        "capture_capacity_bytes": recorder.samples.lock().unwrap().capacity() * 4})
    );
    std::thread::sleep(Duration::from_millis(500));

    let (held, full) = snapshot(&recorder, legacy);
    println!(
        "PREVIEW_BENCH {}",
        json!({"phase": "snapshot_live", "mode": mode,
        "seconds": seconds, "total_samples": held.total_samples,
        "preview_samples": held.audio.samples.len(),
        "copy_capacity_bytes": (held.audio.samples.capacity()
            + full.as_ref().map_or(0, Vec::capacity)) * 4})
    );
    // Hold both legacy buffers as the old loop did during asynchronous STT.
    std::thread::sleep(Duration::from_millis(500));
    std::hint::black_box((&held, &full));
    drop((held, full));

    let barrier = Arc::new(Barrier::new(2));
    let producer_barrier = barrier.clone();
    let capture = recorder.samples.clone();
    let producer = std::thread::spawn(move || {
        let chunk = [0.25; CHUNK];
        let mut waits = Vec::new();
        let mut callbacks = Vec::new();
        producer_barrier.wait();
        let mut deadline = Instant::now();
        for _ in 0..callback_count {
            let start = Instant::now();
            let mut capture = capture.lock().unwrap();
            waits.push(start.elapsed().as_secs_f64() * 1000.0);
            capture.extend_from_slice(&chunk);
            drop(capture);
            callbacks.push(start.elapsed().as_secs_f64() * 1000.0);
            deadline += Duration::from_millis(10);
            std::thread::sleep(deadline.saturating_duration_since(Instant::now()));
        }
        (waits, callbacks)
    });
    barrier.wait();
    let mut copy_timings = Vec::new();
    for _ in 0..copies {
        let start = Instant::now();
        let buffers = snapshot(&recorder, legacy);
        copy_timings.push(start.elapsed().as_secs_f64() * 1000.0);
        std::hint::black_box(&buffers);
        drop(buffers);
        std::thread::sleep(Duration::from_millis(interval_ms));
    }
    let (waits, callbacks) = producer.join().unwrap();
    let final_audio = recorder.stop().unwrap();
    assert_eq!(
        final_audio.samples.len(),
        initial_len + callback_count * CHUNK
    );
    assert!(final_audio.samples[..initial_len]
        .iter()
        .all(|&s| s == 0.125));
    assert!(final_audio.samples[initial_len..]
        .iter()
        .all(|&s| s == 0.25));
    println!(
        "PREVIEW_BENCH {}",
        json!({"phase": "complete", "mode": mode,
        "seconds": seconds, "copy": timings(copy_timings), "callback_lock_wait": timings(waits),
        "callback": timings(callbacks), "capture_preserved": true,
        "callback_budget_ms": 10, "final_samples": final_audio.samples.len()})
    );
}
