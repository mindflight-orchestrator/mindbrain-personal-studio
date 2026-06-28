# Projections Interface Audit And Refactor Plan

Date: 2026-06-06
Scope: `mindbrain-personal-studio`

## Summary

The current **Projections** interface does not match the intended use.
Projections should act as business reading contracts: they list the important
questions or operational views for a workspace, then help extract matching
graph data.

In the current Studio, the projection UI mostly displays technical rows and
pushes users toward `projection-get` / Type B snapshots. That is misleading for
the immeuble demo because the local reference data contains Type A projection
rows but no materialized `ProjectionResult` snapshots.

## Audit Findings

### What projections are for

Projections are compact, scoped, ranked statements used by agents and operators
to retrieve context, guide analysis, and connect business questions to the
underlying graph/facets/documents.

They are not the source of truth. The graph, facets, documents, and raw rows
remain the source of truth. A projection should help choose what to inspect or
extract.

### Immeuble demo expectation

The canonical demo in `../ghostcrab-personal-mcp/examples/immeuble/reference`
contains:

- competency questions in `scenarios.yaml`;
- optional Type A projection seeds in `projections.seed.jsonl`;
- graph/facet/document data that answers those questions after import;
- no canonical `ProjectionResult` / Type B snapshot entities in the reference
  bundle.

The local Studio seed adds one extra Type A row pointing at
`projection:proj_immeuble_quota_check`, but the local
`data/immeuble-demo.sqlite` currently has:

- `5` rows in `projections`;
- `0` `graph_entity` rows of type `ProjectionResult`;
- `0` `graph_entity` rows of type `DeltaFinding`;
- `131` graph entities for the workspace.

So the UI path “Load Type B” is expected to fail or show an empty state unless a
separate seed/materialization step creates that snapshot.

### Current Studio reality

The current interface:

- shows a top-level tab named **Projections**;
- shows a drawer named **Projections** in **Donnees**;
- maps rows through `ProjectionRow`, which only keeps basic fields;
- exposes `Type B projection id` and `Load Type B` as primary actions;
- uses `source_ref=projection:*` as a detail jump;
- does not convert most Type A rows into graph seeds;
- cannot distinguish “snapshot missing” from “projection extraction failed”.

The graph already supports seed-based focus via `brainSeedIds`, and
`GraphCanvas` can reload `/api/brain/graph/subgraph` around those seeds. The
missing part is a reliable bridge from projection intent to graph entity ids.

## Target Interface

Rename the experience from **Projections** to **Analyses** or
**Contrats de lecture** in the UI, while keeping projection terminology in raw
technical details.

The user-facing model should be:

1. Pick a business analysis from a catalog.
2. See its status, type, source, and confidence.
3. Extract candidate graph data.
4. Focus the graph on the extracted entities.
5. Inspect evidence or snapshot details when available.

## Implementation Plan

### Projection catalog

Create an answer/projection-aware catalog model, replacing the current
projection-only row shape where needed.

The mapped row should preserve:

- `id`;
- `proj_type`;
- `content`;
- `weight`;
- `status`;
- `source_ref`;
- `artifact_kind`;
- `legacy_kind`;
- `public_label`;
- extracted `snapshot_projection_id` when `source_ref` starts with
  `projection:`.

Display catalog rows with labels such as:

- `CONSTRAINT` -> blocking rule;
- `FACT` -> operational fact;
- `STEP` -> procedure/action;
- `analysis_plan` -> answer artifact compatibility layer.

### Extraction flow

Add an extraction helper that returns:

- the selected projection row;
- extraction mode: `snapshot`, `graph_search`, `demo_hint`, or `unresolved`;
- candidate entity ids;
- candidate result rows;
- warnings when confidence is low or the mapping is heuristic.

Rules:

- If `source_ref=projection:<id>`, call `projection-get`.
- If the snapshot returns `projection_results` or linked evidence ids, use
  those ids for graph focus.
- If the snapshot is empty, show “snapshot not materialized” and offer live
  extraction.
- Otherwise use graph search against projection content and short extracted
  keywords.
- For `immeuble-demo`, include a narrow deterministic hint table for the known
  competency projections:
  - `scenario:tilleuls-family-stack`: Dupont, Tilleuls A1/A3.
  - `scenario:tenant-lease`: lease contracts and rented lots.
  - `scenario:quota-check`: buildings and units with `tantiemes` /
    `quota_basis`.
  - `document:extrait-coda-janvier-2026`: CODA entries, charge calls,
    payments/review.

These hints are a demo bridge, not the final backend contract. The UI must label
them as inferred/demo extraction.

### Graph integration

When extraction yields entity ids:

- call the existing page-level seed handler;
- switch to the **Donnees** tab;
- set `brainSeedIds`;
- render a visible focus banner with the selected analysis title and a clear
  action.

The drawer in **Donnees** should become “Analyses liees”:

- list projections relevant to the current selected entity;
- expose **Extract** and **Focus graph** actions;
- stop using Type A / Type B as primary labels.

### Snapshot detail

Keep raw `projection-get` detail available, but make it secondary:

- display it as “Snapshot”;
- show `answer_snapshot` / `projection_type_b` in raw details only;
- if no snapshot exists, do not show this as a hard failure.

## Devil's Advocate Checks

- Do not present Type A projections as exact graph queries.
- Do not claim `source_ref=scenario:*` is an entity link.
- Do not rely on Type B snapshots for the immeuble demo unless the seed really
  materializes them.
- Do not hide empty extraction behind a generic “No projections” message.
- Do not turn diagnostics, coverage, or gap rules into answer artifacts.
- Do not expose raw SQL through the browser proxy.

## Test Plan

Run:

```bash
pnpm check
pnpm build
```

Manual smoke against `data/immeuble-demo.sqlite`:

- the catalog shows 5 projection rows;
- quota snapshot row clearly says the snapshot is not materialized when no
  `ProjectionResult` exists;
- Dupont/family projection focuses Tilleuls A1/A3 and related people/households;
- tenant lease projection focuses the 5 lease contracts and rented units;
- CODA projection focuses CODA entries and charge calls;
- graph focus can be cleared;
- existing **Modele**, **Donnees**, search, and inspector still work.

## Assumptions

- This pass stays in Studio; no backend schema/API changes.
- The next production-grade version should add structured extraction metadata
  to projections or answer artifacts, instead of relying on demo hints.
- The current answer-artifact vocabulary remains valid:
  `analysis_plan`, `live_answer_view`, `answer_snapshot`, `evidence_pack`, and
  `answer_update_event`.
