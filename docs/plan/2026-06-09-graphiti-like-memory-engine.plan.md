# Graphiti-Like Memory Engine Plan

**Status:** Draft  
**Branch:** `graphiti_like`  
**Date:** 2026-06-09

## Goal

Build a Graphiti-like memory engine for MindBrain/Studio: episode ingestion,
entity/fact extraction, temporal provenance, hybrid retrieval, and agent-facing
SDK/REST/MCP surfaces.

The target is not only Graphiti compatibility. The target is to compete with the
Graphiti product shape while using MindBrain strengths:

- ontology-constrained memory extraction;
- local-first SQLite plus Postgres parity;
- evidence-backed answer artifacts;
- Studio as a debugger for memory, provenance, and ontology coverage.

## Competitive Reading

Graphiti's useful product surface is a memory engine, not a graph viewer:

- `add_episode` / `add_episode_bulk`: ingest text, JSON, or messages.
- Extract entities and facts from episodes.
- Resolve extracted nodes/edges against graph history.
- Deduplicate nodes and edges.
- Store episode-to-entity/fact provenance.
- Support temporal validity and invalidation.
- Search facts, nodes, episodes, and communities with hybrid ranking.
- Expose SDK, REST, and MCP surfaces over the same core behavior.

MindBrain already has stronger primitives around workspaces, native graph
tables, facets, schema registry, ontologies, SQLite, and answer artifacts. The
missing piece is a coherent memory-ingestion and retrieval contract.

## Product Contract

### Core Objects

- `MemoryEpisode`: source unit of ingestion.
- `MemoryEntity`: resolved entity node with aliases, type, attributes, and
  embedding.
- `MemoryFact`: resolved relation/fact edge with statement, validity, confidence,
  source episodes, and embedding.
- `MemoryMention`: provenance link from an episode to an entity or fact.
- `MemoryGroup`: Graphiti-style partition mapped explicitly to MindBrain
  `workspace_id`.
- `MemoryCommunity`: optional clustered entity group.
- `MemorySaga`: optional ordered episode chain.

### API Surfaces

Expose the same workflows through MCP, REST, and later a small SDK:

- `add_memory`
- `add_memory_bulk`
- `add_triplet`
- `search_memory_facts`
- `search_nodes`
- `get_episodes`
- `get_memory_fact`
- `delete_memory_fact`
- `delete_episode`
- `clear_memory_group`
- `memory_status`

Studio should consume the REST/MCP-compatible routes rather than raw SQL.

## P0: Competitive Baseline

### P0.1 Storage Contract

Add Graphiti-like compatibility tables for SQLite first, with a clear migration
path to Postgres:

- `memory_episodes`
- `memory_entities`
- `memory_facts`
- `memory_mentions`
- `memory_entity_aliases`
- `memory_embeddings`

Keep stable UUIDs for external API compatibility. Mirror into native MindBrain
graph tables only after the compatibility write succeeds:

- SQLite: `graph_entity`, `graph_relation`, `graph_entity_alias`.
- Postgres: `graph.entity`, `graph.relation`, `graph.entity_alias`.

Fail the write if the native mirror or required index update fails. Stale graph
indexes would make retrieval behavior untrustworthy.

### P0.2 Episode Ingestion

Implement:

- ingest one episode;
- ingest episodes in batch;
- support source types: `text`, `json`, `message`;
- store `reference_time`, source description, workspace/group id, and raw body;
- serialize per-workspace ingestion for the same group to avoid duplicate
  resolution races.

### P0.3 Extraction And Resolution

Implement a first deterministic-plus-LLM extraction pipeline:

- extract candidate entities;
- extract candidate facts;
- resolve candidate entities against existing aliases and semantic search;
- resolve candidate facts against existing relations;
- preserve unresolved candidates as diagnostics, not silent drops.

Ontology constraints must be part of extraction:

- allowed entity types;
- allowed relation types;
- required fields;
- domain/range checks;
- schema registry/native ontology drift warnings.

### P0.4 Hybrid Search

Implement fact and node search with:

- fulltext/BM25;
- embedding similarity;
- graph neighborhood expansion;
- optional center-node distance reranking;
- workspace/group isolation;
- filters by entity type, relation type, source, and validity.

P0 can defer community search, but fact and node search must be good enough for
agent memory retrieval.

### P0.5 MCP And REST

Expose:

- `add_memory`
- `search_memory_facts`
- `search_nodes`
- `get_episodes`
- `get_memory_fact`
- `delete_memory_fact`
- `delete_episode`
- `clear_memory_group`
- `memory_status`

Each route/tool should return stable ids, source episode ids, confidence,
validity fields, and enough evidence for Studio to render provenance.

## P1: MindBrain Differentiators

### P1.1 Ontology-First Memory

Make schema/ontology constraints visible and enforceable:

- extraction prompt/schema generated from ontology;
- rejected candidate list with reasons;
- coverage report per episode and per workspace;
- drift report between schema registry and native ontology;
- repair suggestions for missing types/relations.

### P1.2 Answer Artifacts Integration

Connect memory retrieval to answer artifacts:

- `analysis_plan`: what to search and why;
- `evidence_pack`: selected facts, entities, episodes, chunks, and ontology
  definitions;
- `live_answer_view`: refreshable answer against current memory;
- `answer_snapshot`: frozen answer state.

Graph quality, ontology coverage, and answerability gaps remain diagnostics,
not answer artifacts.

### P1.3 Studio Debugger

Add Studio views for:

- episode timeline;
- extracted candidates;
- resolved entities/facts;
- invalidated or contradicted facts;
- evidence provenance;
- ontology validation results;
- search ranking breakdown.

This should make Studio better than a Graphiti API demo: users can inspect why a
memory exists and whether it is trustworthy.

## P2: Parity And Scale

### P2.1 SDK

Provide a small TypeScript or Python SDK with:

- `memory.addEpisode(...)`
- `memory.addTriplet(...)`
- `memory.searchFacts(...)`
- `memory.searchNodes(...)`
- `memory.getEpisodes(...)`
- transaction-aware batch helpers.

### P2.2 SQLite/Postgres Parity

Run the same behavioral tests against both backends:

- save/get/delete episode;
- save/get/delete entity;
- save/get/delete fact;
- transaction rollback;
- workspace isolation;
- fulltext search;
- vector search;
- graph neighborhood search;
- native graph mirror smoke.

### P2.3 Communities And Sagas

Add after core memory is stable:

- community clustering;
- community search;
- ordered saga/episode chains;
- saga summaries.

These are useful for parity but should not block the first competitive memory
engine.

## Suggested Implementation Order

1. Define storage schema and DTOs.
2. Add SQLite migrations plus repository tests.
3. Implement episode write/read/delete.
4. Implement direct triplet write/read/search before LLM extraction.
5. Implement fulltext + graph-neighborhood retrieval.
6. Add embedding storage and vector retrieval.
7. Add extraction/resolution pipeline.
8. Add MCP/REST surfaces.
9. Add Studio episode/fact/provenance debugger.
10. Port the contract to Postgres and run parity tests.

## Success Criteria

- A local SQLite user can call `add_memory`, then retrieve facts and nodes from
  that memory without external graph infrastructure.
- Every returned fact has provenance back to one or more episodes.
- Deleting an episode removes facts/nodes that are only supported by that
  episode and preserves shared facts.
- Search combines fulltext, vector, and graph context.
- Extraction obeys ontology constraints and reports rejected candidates.
- Studio shows the memory lifecycle end to end.
- The same behavior can be validated on Postgres without changing API semantics.

## Non-Goals

- Do not clone Graphiti's internal Python architecture unless useful.
- Do not overload native graph tables with Graphiti UUID semantics before the
  compatibility mapping is proven.
- Do not present graph quality reports as answer artifacts.
- Do not make communities/sagas a blocker for P0.
