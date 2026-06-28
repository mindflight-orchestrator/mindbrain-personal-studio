# Session Restore: Projections Interface Audit

Date: 2026-06-06
Resume target: continue in `mindbrain-personal-studio`

## User Goal

Re-audit and then refactor the old **Projections** management interface. The
previous version did not work and did not match expectations.

Expected direction:

- list available projections;
- use projections to extract data;
- use extracted data to focus/filter the graph;
- compare expectation vs reality using the immeuble demo in
  `../ghostcrab-personal-mcp`;
- act as devil's advocate and avoid a misleading interface.

## Files Created So Far

- `docs/plan/2026-06-06-answer-artifacts-studio-contract.md`
- `docs/plan/2026-06-06-answer-artifacts-studio-refactor.plan.md`
- `docs/plan/2026-06-06-projections-interface-audit-refactor.plan.md`
- `docs/plan/2026-06-06-session-restore-projections-interface.md`

The first two were created before this restore note. All are currently
documentation artifacts; no UI/API implementation has been done yet.

## Important Findings

Current Studio files involved:

- `src/lib/components/ProjectionsPanel.svelte`
- `src/lib/components/ProjectionsDrawer.svelte`
- `src/lib/brain/projectionRows.ts`
- `src/routes/+page.svelte`
- `src/lib/components/GraphCanvas.svelte`
- `src/routes/api/brain/[...path]/+server.ts`

Current local demo state from `data/immeuble-demo.sqlite`:

- `projections`: 5 rows;
- `ProjectionResult`: 0 rows;
- `DeltaFinding`: 0 rows;
- `graph_entity`: 131 rows for `immeuble-demo`.

The local projection rows are:

- quota constraint, `source_ref=scenario:quota-check`;
- snapshot pointer, `source_ref=projection:proj_immeuble_quota_check`;
- Tilleuls/Dupont family stack, `source_ref=scenario:tilleuls-family-stack`;
- tenant leases, `source_ref=scenario:tenant-lease`;
- CODA qualification step, `source_ref=document:extrait-coda-janvier-2026`.

The snapshot pointer is misleading today because no corresponding
`ProjectionResult` exists in the local DB.

## Key Design Decision

The next UI should not treat projections as exact graph queries. It should treat
them as business analysis contracts that can drive an extraction workflow.

The extraction workflow must show confidence and empty states:

- snapshot extraction when a materialized snapshot exists;
- graph-search extraction when only text is available;
- narrow `immeuble-demo` hints for demo competency questions;
- unresolved state when no credible graph seeds can be found.

## Recommended Next Implementation Steps

1. Replace `ProjectionRow` with an answer/projection-aware mapped row type.
2. Add extraction helper functions near `src/lib/brain/projectionRows.ts` or in
   a new small module.
3. Update `ProjectionsPanel.svelte` into an analysis catalog/detail/extraction
   workbench.
4. Update `ProjectionsDrawer.svelte` into a contextual “Analyses liees” drawer.
5. Reuse the existing `onViewInGraph` / `brainSeedIds` path to focus the graph.
6. Add explicit empty state for missing snapshots.
7. Run `pnpm check` and `pnpm build`.

## Verification Commands Already Used

```bash
sqlite3 -readonly data/immeuble-demo.sqlite "SELECT 'projections', COUNT(*) FROM projections UNION ALL SELECT 'ProjectionResult', COUNT(*) FROM graph_entity WHERE workspace_id='immeuble-demo' AND entity_type='ProjectionResult' UNION ALL SELECT 'DeltaFinding', COUNT(*) FROM graph_entity WHERE workspace_id='immeuble-demo' AND entity_type='DeltaFinding' UNION ALL SELECT 'graph_entity', COUNT(*) FROM graph_entity WHERE workspace_id='immeuble-demo';"

sqlite3 -readonly -header -column data/immeuble-demo.sqlite "SELECT id, agent_id, scope, proj_type, status, weight, source_ref, content FROM projections WHERE scope='immeuble-demo' ORDER BY weight DESC;"
```

## Restore Reminder

Before coding, re-check `git status --short`. The current repo already has
untracked docs from this planning/audit work. Preserve them unless the user asks
to consolidate or commit.
