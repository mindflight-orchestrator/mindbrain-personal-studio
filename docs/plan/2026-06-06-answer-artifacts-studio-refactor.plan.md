# Studio Answer Artifacts Refactor Plan

Date: 2026-06-06
Scope: `mindbrain-personal-studio`

## Summary

The current Studio still exposes the old **Projections** surface while the
upstream MindBrain/GhostCrab contract has moved to answer artifacts.

This plan records the target for the next implementation pass. It does not
change UI behavior by itself; it fixes the vocabulary, backend surfaces, and
Studio boundaries that the refactor must follow.

## Current Studio State

Studio currently has three main areas:

- **Modele**: ontology model and taxonomy exploration.
- **Donnees**: instance graph exploration plus a docked projections drawer.
- **Projections**: diagnostic view over `pack-projections`,
  `projections/relevance`, and `projection-get`.

The implementation is still centered on:

- `src/lib/components/ProjectionsPanel.svelte`
- `src/lib/components/ProjectionsDrawer.svelte`
- `src/lib/brain/projectionRows.ts`
- `scripts/seed-immeuble-projections.mjs`
- `docs/demo-immo/immeuble-demo/projections.seed.jsonl`

The browser proxy currently allows:

- `GET /api/brain/ghostcrab/pack-projections`
- `GET /api/brain/ghostcrab/projections/relevance`
- `GET /api/brain/ghostcrab/projection-get`

It does not yet expose:

- `GET /api/brain/ghostcrab/artifact/{artifact_id}`
- `POST /api/brain/ghostcrab/artifact/{artifact_id}/refresh`
- `GET /api/brain/ghostcrab/artifact/{artifact_id}/events`

## Target Vocabulary

The UI must stop treating all answer-facing outputs as generic projections.
Use the canonical upstream vocabulary:

| Legacy concept | Backend compatibility | UI concept |
|----------------|-----------------------|------------|
| Projection Type A / `projections` row | `artifact_kind: "analysis_plan"`, `legacy_kind: "projection_type_a"` | Analysis plan |
| Projection Type B / `ProjectionResult` graph entity | `artifact_kind: "answer_snapshot"`, `legacy_kind: "projection_type_b"` | Snapshot |
| New mutable answer artifact | `artifact_kind: "live_answer_view"` | Live answer |
| Evidence links / evidence bundle | `artifact_kind: "evidence_pack"` | Evidence pack |
| Version update | `event_kind: "answer_update_event"` | Update event |

`answer_update_event` is not an `artifact_kind`.

## Implementation Changes For The Refactor

### Proxy

Extend the server-side proxy allowlist to expose only the new answer artifact
routes needed by the browser:

- artifact get;
- live answer refresh;
- artifact events.

Do not expose raw SQL through the browser proxy.

### Data Mapping

Replace the projection-only row model with an answer-artifact-aware model that
can carry:

- `artifact_id`
- `artifact_kind`
- `legacy_kind`
- `public_label`
- `lifecycle`
- `state`
- `current_version`
- `legacy_ref`
- `source_ref`
- graph evidence ids when present.

Keep compatibility with legacy rows returned by `pack-projections` and
`projection-get`, because those routes remain valid compatibility surfaces.

### UI

Rename the top-level **Projections** experience to an answer-artifact-oriented
view. The exact label can be decided during the implementation pass, but it
must separate:

- analysis plans: compact agent context / former Type A rows;
- snapshots: frozen materialized answer bundles / former Type B output;
- live answers: refreshable answer artifacts;
- evidence packs: facts, entities, and relations supporting an answer.

The docked drawer in **Donnees** should remain graph-contextual, but it should
present analysis plans and linked snapshots without using Type A / Type B as the
primary user-facing language.

### Boundaries

Do not fold graph quality surfaces into answer artifacts:

- graph gap rules;
- graph diagnostics;
- ontology coverage reports;
- graph search;
- answerability gaps;
- MECE/doc gaps.

Those surfaces may be linked from an answer artifact when useful, but they must
not receive synthetic `artifact_kind` fields.

## Test Plan

For the refactor implementation pass:

- run `pnpm check`;
- run `pnpm build`;
- smoke the Studio against a MindBrain backend and verify:
  - Modele still loads ontologies;
  - Donnees still loads graph data and drawer context;
  - the renamed artifact view can load legacy analysis-plan rows;
  - snapshot detail still loads through `projection-get`;
  - artifact get/refresh/events routes work for `live_answer_view` rows;
  - diagnostics and coverage payloads do not appear as answer artifacts.

## Assumptions

- MindBrain `../mindbrain-perso` is the backend contract source.
- GhostCrab `../ghostcrab-personal-mcp` is the MCP/client surface above that
  backend contract.
- Studio should visualize the contract; it should not invent new persistence
  semantics.
- This plan is documentation only. The UI/proxy refactor is a separate change.
