#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STUDIO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GHOSTCRAB_ROOT="${GHOSTCRAB_ROOT:-$(cd "$STUDIO_ROOT/../ghostcrab-personal-mcp" && pwd)}"
SQLITE_PATH="${GHOSTCRAB_SQLITE_PATH:-$STUDIO_ROOT/data/immeuble-demo.sqlite}"

if [[ -f "$GHOSTCRAB_ROOT/scripts/seed-immeuble-projections.mjs" ]]; then
	echo "==> Using GhostCrab seed script"
	exec node "$GHOSTCRAB_ROOT/scripts/seed-immeuble-projections.mjs"
fi

echo "==> Using Studio seed script (GhostCrab script not found)"
GHOSTCRAB_SQLITE_PATH="$SQLITE_PATH" GHOSTCRAB_ROOT="$GHOSTCRAB_ROOT" \
	exec node "$SCRIPT_DIR/seed-immeuble-projections.mjs"
