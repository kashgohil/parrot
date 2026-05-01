#!/usr/bin/env bash
# Full release build: sign + notarize the .app, build + sign + notarize +
# staple the .dmg. Slow (5–20min for Apple's notary queue) but produces a
# Gatekeeper-clean artifact ready to ship to users.
#
# For local iteration use `bun run desktop build` from `apps/desktop/`
# instead — that produces a signed-but-not-notarized build in ~30s, which
# is enough since locally-built binaries don't carry the quarantine flag
# and don't trigger Gatekeeper.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ ! -f "$REPO_ROOT/.env.release" ]]; then
	cat >&2 <<-EOF
		.env.release not found at $REPO_ROOT/.env.release

		Releases need APPLE_ID / APPLE_PASSWORD / APPLE_TEAM_ID for notarization.
		Copy .env.release.example to .env.release and fill in the values.
	EOF
	exit 1
fi

set -a
# shellcheck disable=SC1091
source "$REPO_ROOT/.env.release"
set +a

: "${APPLE_ID:?APPLE_ID empty in .env.release}"
: "${APPLE_PASSWORD:?APPLE_PASSWORD empty in .env.release}"
: "${APPLE_TEAM_ID:?APPLE_TEAM_ID empty in .env.release}"

cd "$REPO_ROOT/apps/desktop"

echo "==> Building (Tauri will notarize the .app)…"
bun run desktop build

echo "==> Notarizing and stapling the .dmg…"
bash "$SCRIPT_DIR/notarize-dmg.sh"

echo "✅ Release build complete."
