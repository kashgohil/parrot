#!/usr/bin/env bash
# Notarize and staple every .dmg produced by `tauri build`.
#
# Tauri's bundler notarizes the .app inside the DMG but stops short of
# notarizing the DMG itself, leaving users with an "Apple could not verify"
# dialog when they download and double-click it. This script closes that gap.
#
# Required env (loaded from repo-root .env.release locally; from secrets in CI):
#   APPLE_ID         developer Apple ID email
#   APPLE_PASSWORD   app-specific password (xxxx-xxxx-xxxx-xxxx)
#   APPLE_TEAM_ID    10-character team identifier
#
# Idempotent: if a DMG is already stapled, we skip it.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TAURI_TARGET_DIR="$REPO_ROOT/apps/desktop/src-tauri/target"

# Local builds land in target/release/bundle/dmg.
# CI builds with --target aarch64-apple-darwin land in
# target/aarch64-apple-darwin/release/bundle/dmg. Glob both.

# Auto-load .env.release from repo root if present, so a developer can run
# this directly without exporting credentials in their shell. Apple creds
# live in .env.release (not .env) so day-to-day local builds don't trigger
# auto-notarization on every iteration.
if [[ -f "$REPO_ROOT/.env.release" ]]; then
	set -a
	# shellcheck disable=SC1091
	source "$REPO_ROOT/.env.release"
	set +a
fi

: "${APPLE_ID:?APPLE_ID not set — see .env.example}"
: "${APPLE_PASSWORD:?APPLE_PASSWORD not set — see .env.example}"
: "${APPLE_TEAM_ID:?APPLE_TEAM_ID not set — see .env.example}"

shopt -s nullglob
dmgs=(
	"$TAURI_TARGET_DIR"/release/bundle/dmg/*.dmg
	"$TAURI_TARGET_DIR"/*/release/bundle/dmg/*.dmg
)
shopt -u nullglob

if (( ${#dmgs[@]} == 0 )); then
	echo "No DMGs found under $TAURI_TARGET_DIR — nothing to notarize." >&2
	exit 0
fi

for dmg in "${dmgs[@]}"; do
	echo "==> $dmg"

	if xcrun stapler validate "$dmg" >/dev/null 2>&1; then
		echo "    already stapled, skipping"
		continue
	fi

	# Skip DMGs that aren't signed by our Developer ID — these are usually
	# stale artifacts from older experiments (e.g. unsigned builds left over
	# from before signing was wired up). Submitting them would just earn an
	# Invalid response from Apple.
	if ! codesign -dv "$dmg" 2>&1 | grep -q "TeamIdentifier=$APPLE_TEAM_ID"; then
		echo "    not signed by team $APPLE_TEAM_ID, skipping (likely a stale artifact)"
		continue
	fi

	echo "    submitting to Apple notary service…"
	submit_log="$(mktemp)"
	xcrun notarytool submit "$dmg" \
		--apple-id "$APPLE_ID" \
		--password "$APPLE_PASSWORD" \
		--team-id "$APPLE_TEAM_ID" \
		--wait \
		--output-format json | tee "$submit_log"

	status=$(grep -o '"status":"[^"]*"' "$submit_log" | tail -n1 | cut -d'"' -f4)
	id=$(grep -o '"id":"[^"]*"' "$submit_log" | tail -n1 | cut -d'"' -f4)
	rm -f "$submit_log"

	if [[ "$status" != "Accepted" ]]; then
		echo "    ❌ notarization returned status: $status (id: $id)" >&2
		echo "    fetch the log with:" >&2
		echo "      xcrun notarytool log $id --apple-id \"\$APPLE_ID\" --password \"\$APPLE_PASSWORD\" --team-id \"\$APPLE_TEAM_ID\"" >&2
		exit 1
	fi

	echo "    stapling ticket…"
	xcrun stapler staple "$dmg"

	echo "    verifying with Gatekeeper…"
	spctl -a -t open --context context:primary-signature -vv "$dmg"
done

echo "✅ All DMGs notarized and stapled."
