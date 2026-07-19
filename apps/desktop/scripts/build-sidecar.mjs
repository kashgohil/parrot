// Build the `cleanup-sidecar` binary and stage it where Tauri's `externalBin`
// expects it: `src-tauri/binaries/cleanup-sidecar-<target-triple>`.
//
// Tauri strips the `-<triple>` suffix and drops the binary next to the main
// executable in the bundle (and, in dev, next to the debug binary), which is
// exactly where `resolve_sidecar_path()` looks for it at runtime.
//
// Usage:
//   bun scripts/build-sidecar.mjs           # debug (tauri dev)
//   bun scripts/build-sidecar.mjs --release # release (tauri build)

import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const release = process.argv.includes("--release");
const scriptDir = dirname(fileURLToPath(import.meta.url));
const srcTauri = join(scriptDir, "..", "src-tauri");

function hostTriple() {
  const out = execFileSync("rustc", ["-vV"], { encoding: "utf8" });
  const m = out.match(/^host:\s*(.+)$/m);
  if (!m) throw new Error("could not determine host target triple from `rustc -vV`");
  return m[1].trim();
}

const host = hostTriple();
// Tauri sets TAURI_ENV_TARGET_TRIPLE during before*Command; fall back to host.
const triple = process.env.TAURI_ENV_TARGET_TRIPLE || host;
const cross = triple !== host;
const isWindows = triple.includes("windows");
const exeExt = isWindows ? ".exe" : "";

const cargoArgs = ["build", "-p", "parrot-cleanup-sidecar"];
if (release) cargoArgs.push("--release");
if (cross) cargoArgs.push("--target", triple);

console.log(`[build-sidecar] cargo ${cargoArgs.join(" ")}`);
execFileSync("cargo", cargoArgs, { cwd: srcTauri, stdio: "inherit" });

const profile = release ? "release" : "debug";
const builtPath = cross
  ? join(srcTauri, "target", triple, profile, `cleanup-sidecar${exeExt}`)
  : join(srcTauri, "target", profile, `cleanup-sidecar${exeExt}`);

const outDir = join(srcTauri, "binaries");
mkdirSync(outDir, { recursive: true });
const dest = join(outDir, `cleanup-sidecar-${triple}${exeExt}`);
copyFileSync(builtPath, dest);
if (!isWindows) chmodSync(dest, 0o755);

console.log(`[build-sidecar] staged ${dest}`);
