#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STUDIO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
GHOSTCRAB_ROOT="${GHOSTCRAB_ROOT:-$(cd "$STUDIO_ROOT/../ghostcrab-personal-mcp" && pwd)}"
DEFAULT_SQLITE="$STUDIO_ROOT/data/immeuble-demo.sqlite"
SQLITE_PATH="${GHOSTCRAB_SQLITE_PATH:-$DEFAULT_SQLITE}"
BUNDLE="$GHOSTCRAB_ROOT/examples/immeuble-demo/bundle.json"
GCP="$GHOSTCRAB_ROOT/bin/gcp.mjs"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
	arg="$1"
	shift
	case "$arg" in
		--) ;;
		--dry-run) DRY_RUN=true ;;
		--sqlite | --db)
			if [[ $# -lt 1 || -z "${1:-}" ]]; then
				echo "error: $arg requires a SQLite path" >&2
				exit 1
			fi
			SQLITE_PATH="$1"
			shift
			;;
		--sqlite=*)
			SQLITE_PATH="${arg#--sqlite=}"
			;;
		--db=*)
			SQLITE_PATH="${arg#--db=}"
			;;
		-h | --help)
			echo "Usage: load-immeuble-demo.sh [--dry-run] [--sqlite PATH]"
			echo ""
			echo "Loads the immeuble syndic demo bundle into workspace immeuble-demo."
			echo "Default SQLite: data/immeuble-demo.sqlite"
			echo "Override with GHOSTCRAB_SQLITE_PATH or --sqlite / --db PATH."
			echo "Use --dry-run to validate the bundle without writing to SQLite."
			echo "Override GHOSTCRAB_ROOT to point at a non-sibling GhostCrab checkout."
			exit 0
			;;
		*)
			echo "Unknown argument: $arg" >&2
			exit 1
			;;
	esac
done

if [[ ! -f "$GCP" ]]; then
	echo "error: gcp loader not found at $GCP" >&2
	echo "Set GHOSTCRAB_ROOT to your ghostcrab-personal-mcp checkout." >&2
	exit 1
fi

if [[ ! -f "$BUNDLE" ]]; then
	echo "error: bundle not found at $BUNDLE" >&2
	exit 1
fi

if [[ "$DRY_RUN" == true ]]; then
	echo "==> Dry-run bundle validation (no SQLite write)"
	node "$GCP" load "$BUNDLE" --dry-run
	exit 0
fi

mkdir -p "$(dirname "$SQLITE_PATH")"

echo "==> Loading bundle into $SQLITE_PATH (workspace immeuble-demo)"
GHOSTCRAB_SQLITE_PATH="$SQLITE_PATH" \
	node "$GCP" load "$BUNDLE" \
		--workspace immeuble-demo \
		--reindex none \
		--force

if ! command -v sqlite3 >/dev/null 2>&1; then
	echo "warning: sqlite3 not found; skipping SQL graph reindex and smoke check" >&2
	exit 0
fi

echo "==> SQL graph reindex for workspace immeuble-demo"
sqlite3 "$SQLITE_PATH" "
	BEGIN;
	DELETE FROM graph_relation_property
	WHERE relation_id IN (
		SELECT relation_id FROM graph_relation WHERE workspace_id='immeuble-demo'
	);
	DELETE FROM graph_relation WHERE workspace_id='immeuble-demo';
	DELETE FROM graph_entity_alias
	WHERE entity_id IN (
		SELECT entity_id FROM graph_entity WHERE workspace_id='immeuble-demo'
	);
	DELETE FROM graph_entity_chunk WHERE workspace_id='immeuble-demo';
	DELETE FROM graph_entity WHERE workspace_id='immeuble-demo';

	INSERT OR REPLACE INTO graph_entity (
		entity_id, workspace_id, entity_type, name, confidence, metadata_json, deprecated_at
	)
	SELECT entity_id, workspace_id, entity_type, name, confidence, metadata_json, NULL
	FROM entities_raw
	WHERE workspace_id='immeuble-demo';

	INSERT OR REPLACE INTO graph_entity_alias (term, entity_id, confidence)
	SELECT term, entity_id, confidence
	FROM entity_aliases_raw
	WHERE workspace_id='immeuble-demo';

	INSERT OR REPLACE INTO graph_relation (
		relation_id, workspace_id, relation_type, source_id, target_id,
		valid_from_unix, valid_to_unix, confidence, metadata_json, deprecated_at
	)
	SELECT
		relation_id, workspace_id, edge_type, source_entity_id, target_entity_id,
		unixepoch(valid_from), unixepoch(valid_to), confidence, metadata_json, NULL
	FROM relations_raw
	WHERE workspace_id='immeuble-demo';

	INSERT OR REPLACE INTO graph_relation_property (
		relation_id, property_key, value_type, value_text, value_number,
		value_integer, ref_doc_id, currency
	)
	SELECT
		relation_id, property_key, value_type, value_text, value_number,
		value_integer, ref_doc_id, currency
	FROM relation_properties_raw
	WHERE workspace_id='immeuble-demo';

	INSERT OR REPLACE INTO graph_entity_chunk (
		entity_id, workspace_id, collection_id, doc_id, chunk_index,
		role, confidence, metadata_json
	)
	SELECT
		entity_id, workspace_id, collection_id, doc_id, chunk_index,
		role, MAX(confidence), '{}'
	FROM entity_chunks_raw
	WHERE workspace_id='immeuble-demo'
	GROUP BY entity_id, workspace_id, collection_id, doc_id, chunk_index;
	COMMIT;
"

echo "==> Post-load smoke check"
ENTITY_COUNT="$(
	sqlite3 "$SQLITE_PATH" \
		"SELECT COUNT(*) FROM graph_entity WHERE workspace_id='immeuble-demo';"
)"
echo "graph_entity rows for immeuble-demo: $ENTITY_COUNT"

if [[ "$ENTITY_COUNT" -lt 100 ]]; then
	echo "error: expected at least 100 graph_entity rows after reindex" >&2
	exit 1
fi

echo "==> Done. Start backend and Studio with:"
echo "    GHOSTCRAB_SQLITE_PATH=\"$SQLITE_PATH\" pnpm backend   # terminal 1"
echo "    GHOSTCRAB_SQLITE_PATH=\"$SQLITE_PATH\" pnpm dev       # terminal 2"
echo "    # or: pnpm studio -- --sqlite \"$SQLITE_PATH\""
