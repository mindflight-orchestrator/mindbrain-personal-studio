# Studio Contract After Answer Artifact Rename

Date: 2026-06-06
Repo: `mindbrain-personal-studio`

## Summary

This Studio visualizes data served by `../mindbrain-perso`, normally through the
GhostCrab/MindBrain HTTP backend started by the local Studio scripts.

The upstream vocabulary changed: the old projection Type A / Type B language is
now a compatibility layer over a clearer answer artifact model. Before changing
the Studio UI, this document records what changed and which contract Studio must
respect.

## Upstream Changes Reviewed

### `../mindbrain-perso`

Current reviewed head:

- `397a4f7 docs: specify graph quality control workflow`
- `0e8d335 feat: add answer artifact registry`

The important backend changes are:

- new table `mindbrain_answer_artifacts`;
- new table `mindbrain_answer_events`;
- new artifact kinds:
  - `analysis_plan`
  - `live_answer_view`
  - `answer_snapshot`
  - `evidence_pack`
- new event kind:
  - `answer_update_event`
- backup/load support for answer artifact rows and retained events;
- compatibility fields added to existing GhostCrab projection routes.

The backend keeps durable `projections` as the working-memory write surface.
It does not move legacy `memory_projections` into the answer artifact registry.

### `../ghostcrab-personal-mcp`

Current reviewed head:

- `7b41397 chore: refresh local pack manifest`
- `05d2581 chore: sync mindbrain vendor to remote main`
- `2f96df4 docs: clarify answer artifact taxonomy`
- `f6f683b feat: add answer artifact surfaces`

The relevant GhostCrab changes are:

- the vendored MindBrain submodule now points at `397a4f7`;
- new MCP/CLI surfaces exist for answer artifact list/get/refresh/events;
- docs and glossaries now describe the old Type A / Type B names as legacy;
- `answer_update_event` is explicitly an event kind, not an artifact kind.

## Canonical Vocabulary

| Public meaning | Backend code | Legacy equivalent | Notes |
|----------------|--------------|-------------------|-------|
| Analysis plan | `analysis_plan` | Projection Type A / `projections` | Stable plan for what to search, pack, or answer. |
| Live answer | `live_answer_view` | New | Mutable answer view, explicitly refreshable in Personal/SQLite. |
| Snapshot | `answer_snapshot` | Projection Type B / `ProjectionResult` | Frozen answer state at one point in time. |
| Evidence pack | `evidence_pack` | Evidence links | Facts, entities, relations, and source rows supporting an answer. |
| Update event | `answer_update_event` | New | Stored in `mindbrain_answer_events.event_kind`. |

Rules:

- `artifact_kind` is limited to `analysis_plan`, `live_answer_view`,
  `answer_snapshot`, and `evidence_pack`.
- `answer_update_event` must never be displayed or stored as an
  `artifact_kind`.
- Stable artifact ids are version-less. Version is carried by
  `current_version`.

## Compatibility Surfaces

The old projection routes remain valid, but their meaning changed.

| Route | Current meaning |
|-------|-----------------|
| `/api/mindbrain/ghostcrab/pack-projections` | Returns durable `projections` rows for agent context, with additive `analysis_plan` compatibility fields. |
| `/api/mindbrain/ghostcrab/projections/relevance` | Ranks durable projection rows against graph context. |
| `/api/mindbrain/ghostcrab/projection-get` | Returns a materialized graph bundle for a former Type B projection, with additive `answer_snapshot` compatibility fields. |

New artifact routes:

| Route | Current meaning |
|-------|-----------------|
| `/api/mindbrain/ghostcrab/artifact/{artifact_id}` | Read one answer artifact registry row. |
| `/api/mindbrain/ghostcrab/artifact/{artifact_id}/refresh` | Refresh a `live_answer_view`, increment `current_version`, and write one event. |
| `/api/mindbrain/ghostcrab/artifact/{artifact_id}/events` | Read retained `answer_update_event` rows. |

## Non-Artifact Boundary

These surfaces are not answer artifacts and must not receive synthetic
`artifact_kind` fields:

- graph gap rules;
- graph diagnostics;
- graph conflict diagnostics;
- ontology coverage reports;
- coverage gaps;
- graph search;
- answerability gaps;
- MECE/doc validation gaps.

If Studio later needs to show those next to answer artifacts, they should be
rendered as diagnostics or quality signals, not as registry artifacts.

## Studio Impact

Studio currently has no local references to `artifact_kind`, `legacy_kind`,
`analysis_plan`, `answer_snapshot`, `live_answer_view`, or
`answer_update_event`.

The current implementation still uses:

- **Projections** as a tab label;
- **Projections** as a docked drawer label in **Donnees**;
- `ProjectionRow` as the main row type;
- `Type B` as user-facing detail language;
- `projection_id` / `linked_projection_id` as the primary detail jump;
- `source_ref` parsing for `projection:{id}` links.

The server-side proxy allows only the legacy compatibility routes:

- `ghostcrab/pack-projections`;
- `ghostcrab/projections/relevance`;
- `ghostcrab/projection-get`.

It does not yet allow artifact get, refresh, or events.

## Required Direction For The Refactor

The next Studio refactor should preserve the three major work areas:

- **Modele**: ontology model and taxonomy.
- **Donnees**: instance graph, graph context, and contextual answer artifacts.
- **Answer artifacts**: analysis plans, live answers, snapshots, evidence packs,
  and update history.

The old projection language should become compatibility wording only:

- use **analysis plan** instead of Type A;
- use **snapshot** instead of Type B;
- keep `projection-get` and `pack-projections` as route names because they are
  still the backend compatibility endpoints;
- show `legacy_kind` only in technical/raw detail areas.

Studio should display `public_label` when available and fall back to legacy
`content`, `id`, or `projection_id` only when the backend response does not
provide artifact fields.

## Acceptance Checklist

Before implementing UI changes, use this checklist:

- the proxy exposes only the required artifact routes, not raw SQL;
- answer artifact rows carry `artifact_kind`, lifecycle, state, version, and
  legacy reference when present;
- former Type A rows display as analysis plans;
- former Type B bundles display as snapshots;
- live answers can show current version and refresh status;
- update history displays `answer_update_event` as events;
- graph quality and coverage results remain outside the artifact registry.
