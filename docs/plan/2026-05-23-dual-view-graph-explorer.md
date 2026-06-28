# Dual-View Graph Explorer Plan

Date: 2026-05-23
Scope: `sqlite-sigma-graphology` SvelteKit/Sigma viewer.

## Summary

Transform the current SQLite-direct Sigma viewer into a read-only client for a
live MindBrain backend.

The target experience has three work areas:

- **Modèle**: ontology model graph, based on entity types, edge types, triples,
  rules, labels, and definitions;
- **Données**: instance graph, based on `graph_entity`, `graph_relation`,
  relation properties, facets, provenance, and subgraph search;
- **Projections**: diagnostic panel for `pack-projections` and
  `projection-get`.

The core UX rule is:

```text
L'ontologie explique le sens.
Le graphe montre les faits.
La fiche laterale relie les deux.
```

## Current State

- The app has one page and one large `GraphCanvas.svelte`.
- Data is loaded through local routes under `/api/graph/*`.
- `graphRepository.ts` opens a SQLite file directly in read-only mode.
- The current "Entity type" picker is an instance filter over
  `graph_entity.entity_type`; it is not an ontology model view.
- There is no text search, BM25 search, projection panel, or model-linked
  inspector.
- `docs/plan` is new in this repo and should be the durable planning location.

## Target Architecture

Use MindBrain HTTP through a SvelteKit server-side proxy:

```text
Svelte UI -> /api/brain/* proxy -> mindbrain-http :8091 -> ghostcrab.sqlite
```

Environment variables:

```text
MINDBRAIN_HTTP_URL=http://127.0.0.1:8091
DATA_SOURCE=brain
GHOSTCRAB_SQLITE_PATH=fixtures/minimal-graph.sqlite
```

`DATA_SOURCE=brain` is the default. `DATA_SOURCE=sqlite-demo` keeps the current
read-only SQLite demo path, but brain-only features are disabled in that mode.
Do not silently switch a real workspace from brain to demo data.

## Backend Contract

The viewer depends on these MindBrain endpoints:

```text
GET /health
GET /api/mindbrain/ontology/list?workspace_id=
GET /api/mindbrain/ontology/graph?workspace_id=&ontology_id=
GET /api/mindbrain/ontology/type?ontology_id=&kind=entity|edge&type=
GET /api/mindbrain/graph/entity?workspace_id=&entity_id=
GET /api/mindbrain/graph/relation?workspace_id=&relation_id=
GET /api/mindbrain/graph/subgraph?workspace_id=&seed_ids=&hops=&edge_types=&format=json
GET /api/mindbrain/ghostcrab/graph-search?workspace_id=&query=&entity_type=
POST /api/mindbrain/ghostcrab/search
GET /api/mindbrain/collections/facet-search?workspace_id=&collection_id=&namespace=&dimension=&value=
GET /api/mindbrain/ghostcrab/pack-projections?agent_id=&query=&scope=&limit=
GET /api/mindbrain/ghostcrab/projection-get?workspace_id=&projection_id=&include_evidence=true
```

Do not expose `/api/mindbrain/sql` through the browser proxy.

## Implementation Plan

### Brain client and proxy

- Add `src/lib/server/mindbrainClient.ts`.
- Add `/api/brain/[...path]/+server.ts` as the only browser-facing proxy to
  MindBrain.
- Add typed DTOs for graph nodes, graph edges, ontology nodes, ontology edge
  types, search results, projections, and inspector payloads.
- Add request timeout handling and plain error payloads that the UI can show.
- Update `.env.example` with `MINDBRAIN_HTTP_URL`, `DATA_SOURCE`, and the
  existing SQLite demo path.

### UI decomposition

Extract the current canvas responsibilities in this order:

1. `SigmaGraphView.svelte`: pure Graphology/Sigma rendering, layout, focus,
   legend, and click events.
2. `DataGraphView.svelte`: loads instance subgraphs through the brain proxy.
3. `OntologyGraphView.svelte`: loads ontology model graph and applies abstract
   styling for classes, edge types, and qualified relations.
4. `InspectorPanel.svelte`: shows selected instance/relation details plus the
   linked ontology type and provenance/history.
5. `SearchBar.svelte`: graph search, BM25 search, and facet search.
6. `ProjectionsPanel.svelte`: projection diagnostics.

Keep the existing `GraphCanvas.svelte` behavior working during the transition,
then retire or reduce it once `SigmaGraphView` is stable.

### Main page layout

Use one workspace selector and three tabs:

- **Modèle**: ontology graph, type list, type inspector.
- **Données**: instance graph, search, relation/entity inspector.
- **Projections**: projection query form and result viewer.

Rename the old "Entity type" control to "Filter type" when shown in the data
view to avoid confusing it with the ontology model tab.

### Inspector behavior

On instance node click:

- load `/graph/entity`;
- show label, type, facets, metadata, incident relations;
- load `/ontology/type` for the entity type;
- show definition, labels, expected properties, raw triples, and rules;
- show evidence or missing-evidence messages when available.

On relation click:

- load `/graph/relation`;
- show source, target, relation type, confidence, validity dates, and
  `graph_relation_property` values;
- load `/ontology/type` for the edge type;
- show source/target type, definition, triples, and business rules.

History and provenance are part of the inspector in v1, not a separate fourth
tab.

### Search and focus

Search modes:

- **Graph**: call `ghostcrab/graph-search`, return entity seeds.
- **BM25**: call `ghostcrab/search` with `vector_weight=0` in v1, show score
  and excerpt, and focus graph only when the result maps to an entity.
- **Facets**: call `collections/facet-search`, then resolve/focus matching
  entity seeds where possible.

After search, call workspace-scoped `graph/subgraph` with bounded hops instead
of loading a full graph.

### SQLite demo mode

Keep `graphRepository.ts` and current `/api/graph/*` only for
`DATA_SOURCE=sqlite-demo`.

In demo mode:

- the data graph can render from `fixtures/minimal-graph.sqlite`;
- brain health, model graph, search, and projections show a disabled/unavailable
  state unless the fixture is explicitly extended to cover them;
- the UI must label the mode as demo data.

## Demo Fixture

Create or extend a fixture with:

- workspace and default ontology;
- entity types and edge types;
- raw ontology triples for labels/definitions;
- instance graph rows;
- a qualified relation with `graph_relation_property`;
- facets/search documents for BM25 and facet lookup;
- at least one projection row for the projection panel.

The fixture should demonstrate a concrete relation such as:

```text
Personne -> RelationPropriete -> Lot
RelationPropriete -> Document
RelationPropriete -> Evenement
```

## Validation

Run:

```sh
pnpm check
pnpm build
pnpm dev:demo
```

For brain-live validation, start MindBrain separately on `:8091`, then run the
viewer with:

```sh
MINDBRAIN_HTTP_URL=http://127.0.0.1:8091 DATA_SOURCE=brain pnpm dev
```

Manual smoke checklist:

- health badge shows brain online;
- **Modèle** displays ontology classes and edge types separately from instances;
- **Données** displays a workspace-scoped instance subgraph;
- selecting an entity shows instance data plus ontology definition;
- selecting a relation shows typed relation properties and provenance;
- graph/BM25/facet search focuses a bounded subgraph;
- **Projections** can call `pack-projections` and `projection-get`;
- demo mode still renders the shipped SQLite fixture.

## Out Of Scope

- Editing ontology or graph data.
- Direct browser access to MindBrain SQL.
- Full OWL/SHACL reasoning in the UI.
- Replacing MindBrain backend behavior in the viewer.
