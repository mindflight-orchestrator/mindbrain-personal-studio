# MindBrain Driver Interface

**Status:** Draft

## Goal

Add two Graphiti drivers that target the MindBrain storage model:

- `PgMindBrainDriver`: PostgreSQL with the `pg_mindbrain` extension from
  `/home/dlamotte/Documents/mindflight/pg_mindbrain`.
- `MindBrainSQLiteDriver`: SQLite standalone schema/API from
  `/home/dlamotte/Documents/mindflight/mindbrain`.

Both drivers should expose the same Graphiti behavior through the existing
operations interfaces in `graphiti_core/driver/operations/`. They should not
pretend to be Cypher engines.

## Current Graphiti Driver Shape

`GraphDriver` has two responsibilities today:

1. Connection/query/session lifecycle:
   - `execute_query(query, **kwargs)`
   - `session(database=None)`
   - `transaction()`
   - `close()`
   - `build_indices_and_constraints(delete_existing=False)`
   - `delete_all_indexes()`
   - `clone()` / `with_database()`

2. Driver-specific operations:
   - node ops: entity, episode, community, saga
   - edge ops: entity, episodic, community, has-episode, next-episode
   - search ops
   - graph maintenance ops

For MindBrain, the second layer is the important one. Existing Neo4j/FalkorDB
ops send Cypher through `execute_query`; MindBrain ops should send SQL through a
small backend interface.

## Proposed Architecture

```
Graphiti namespaces
  -> existing operations ABCs
    -> MindBrain operations implementations
      -> MindBrainBackend interface
        -> PgMindBrainBackend
        -> SQLiteMindBrainBackend
```

The two concrete Graphiti drivers should mostly wire connection lifecycle and
instantiate the same MindBrain operations classes with a backend instance.

## Provider Names

Add explicit providers instead of overloading `KUZU` or `NEO4J`:

```python
class GraphProvider(Enum):
    NEO4J = 'neo4j'
    FALKORDB = 'falkordb'
    KUZU = 'kuzu'
    NEPTUNE = 'neptune'
    PG_MINDBRAIN = 'pg_mindbrain'
    MINDBRAIN_SQLITE = 'mindbrain_sqlite'
```

## Backend Interface

This is the narrow interface the operations layer should depend on. It is SQL
oriented and returns normalized Python dictionaries, so operation classes do not
care whether rows came from asyncpg/psycopg or SQLite.

```python
from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any


class MindBrainBackend(ABC):
    provider: GraphProvider

    @abstractmethod
    async def execute(
        self,
        sql: str,
        params: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Execute SQL and return rows as dictionaries."""

    @abstractmethod
    async def execute_many(
        self,
        sql: str,
        rows: list[dict[str, Any]],
    ) -> None:
        """Execute one statement against many parameter dictionaries."""

    @asynccontextmanager
    @abstractmethod
    async def transaction(self) -> AsyncIterator['MindBrainTransaction']:
        """Yield a real transaction when the backend supports one."""

    @abstractmethod
    async def close(self) -> None:
        """Close underlying connections."""

    @abstractmethod
    def placeholders(self, params: list[str]) -> dict[str, str]:
        """Return backend placeholders for generated SQL fragments."""


class MindBrainTransaction(ABC):
    @abstractmethod
    async def execute(
        self,
        sql: str,
        params: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Execute SQL inside the transaction."""

    @abstractmethod
    async def execute_many(
        self,
        sql: str,
        rows: list[dict[str, Any]],
    ) -> None:
        """Execute one statement against many parameter dictionaries."""
```

`PgMindBrainBackend.placeholders(['uuid'])` can return `{'uuid': '$1'}` or use
native named parameters depending on the chosen library. SQLite can return
`{'uuid': ':uuid'}`. Keep placeholder handling in the backend so operation code
does not fork everywhere.

## Graphiti Driver Adapter

The concrete drivers should still subclass `GraphDriver`:

```python
class MindBrainDriver(GraphDriver):
    provider: GraphProvider

    def __init__(self, backend: MindBrainBackend, database: str = 'default'):
        self.backend = backend
        self._database = database
        self._entity_node_ops = MindBrainEntityNodeOperations()
        self._episode_node_ops = MindBrainEpisodeNodeOperations()
        self._entity_edge_ops = MindBrainEntityEdgeOperations()
        self._episodic_edge_ops = MindBrainEpisodicEdgeOperations()
        self._search_ops = MindBrainSearchOperations()
        self._graph_ops = MindBrainGraphMaintenanceOperations()

    async def execute_query(self, query: str, **kwargs: Any) -> tuple[list[dict[str, Any]], None, None]:
        return await self.backend.execute(query, kwargs), None, None

    async def close(self) -> None:
        await self.backend.close()
```

`execute_query()` exists for Graphiti compatibility, but new MindBrain operation
classes should call `backend.execute()` through a small helper rather than rely
on Cypher-shaped assumptions.

## Storage Mapping

Graphiti model fields do not map one-to-one to current MindBrain graph tables:

| Graphiti object | MindBrain target | Notes |
| --- | --- | --- |
| `EntityNode` | `graph.entity` / `graph_entity` or raw `entities_raw` | MindBrain primary IDs are integer IDs; Graphiti UUIDs need a stable mapping. |
| `EntityEdge` | `graph.relation` / `graph_relation` or raw `relations_raw` | Graphiti edge UUIDs also need a mapping. |
| `EpisodicNode` | dedicated Graphiti-owned episode table | MindBrain graph model has documents/chunks, not Graphiti episodes. |
| `EpisodicEdge` | dedicated Graphiti-owned mention table | Links episodes to entities. |
| `CommunityNode` / `CommunityEdge` | dedicated Graphiti-owned tables initially | MindBrain does not expose Graphiti community semantics directly. |
| `SagaNode`, `HAS_EPISODE`, `NEXT_EPISODE` | dedicated Graphiti-owned tables | Required for existing Graphiti saga APIs. |

Recommended first implementation: create Graphiti-owned compatibility tables in
both backends, then optionally mirror entity/relation rows into the native
MindBrain graph tables for traversal/search acceleration.

Minimum compatibility tables:

```sql
graphiti_entities(uuid text primary key, group_id text, name text, labels json, summary text,
                  attributes json, name_embedding blob/json, created_at timestamp,
                  native_entity_id bigint/integer unique);
graphiti_entity_edges(uuid text primary key, group_id text, source_node_uuid text,
                      target_node_uuid text, name text, fact text, fact_embedding blob/json,
                      episodes json, attributes json, created_at timestamp,
                      expired_at timestamp, valid_at timestamp, invalid_at timestamp,
                      reference_time timestamp, native_relation_id bigint/integer unique);
graphiti_episodes(...);
graphiti_episode_mentions(...);
graphiti_communities(...);
graphiti_sagas(...);
graphiti_has_episode_edges(...);
graphiti_next_episode_edges(...);
```

This avoids corrupting or overloading `mb_collections.entities_raw` with
Graphiti-specific UUID semantics before the mapping is proven.

## Native MindBrain Integration Points

Once compatibility tables pass Graphiti's existing unit behavior, mirror these
objects into the native graph layer:

- PostgreSQL:
  - `graph.entity`, `graph.entity_alias`, `graph.relation`
  - `graph.rebuild_lj_relations()`
  - `graph.k_hops_filtered(...)`, `graph.shortest_path_filtered(...)`
  - `graph.marketplace_search(...)`, `graph.entity_fts_search(...)`
  - `graph.similar_entities(...)` from extension `1.1.0`

- SQLite:
  - `graph_entity`, `graph_entity_alias`, `graph_relation`
  - `graph_lj_out`, `graph_lj_in`
  - standalone Zig helpers documented in `docs/graph.md`
  - FTS5/BM25 tables from `search_*`

The mirror should be best-effort inside the same transaction where possible.
If a native graph mirror fails, fail the write; stale native indexes would make
Graphiti search/traversal behavior difficult to reason about.

## Operations Implementation Boundary

Implement these operation families first:

1. `EntityNodeOperations`
2. `EntityEdgeOperations`
3. `EpisodicNodeOperations`
4. `EpisodicEdgeOperations`
5. `SearchOperations` for entity/edge/episode fulltext and similarity
6. `GraphMaintenanceOperations.clear_data`, `build_indices_and_constraints`,
   `delete_all_indexes`

Defer communities and sagas only if the product path does not use them. The
current namespace layer allows a driver to return `None` for unsupported ops,
but existing Graphiti workflows may expect all core ops to exist.

## Query Result Contract

Every MindBrain operation should return Graphiti model instances, not raw
MindBrain rows. Keep all row parsing in one module:

```python
def entity_node_from_row(row: dict[str, Any]) -> EntityNode: ...
def entity_edge_from_row(row: dict[str, Any]) -> EntityEdge: ...
def episodic_node_from_row(row: dict[str, Any]) -> EpisodicNode: ...
def episodic_edge_from_row(row: dict[str, Any]) -> EpisodicEdge: ...
```

Do not reuse Neo4j record parsers directly; their keys and nested shapes assume
Cypher return clauses.

## Transaction Contract

`GraphDriver.transaction()` should wrap the backend transaction and adapt it to
Graphiti's `Transaction` ABC:

```python
class MindBrainGraphitiTransaction(Transaction):
    def __init__(self, tx: MindBrainTransaction):
        self._tx = tx

    async def run(self, query: str, **kwargs: Any) -> Any:
        return await self._tx.execute(query, kwargs)
```

PostgreSQL and SQLite both support real commit/rollback, so unlike FalkorDB and
Kuzu these drivers should provide real transaction semantics.

## Index/Schema Contract

`build_indices_and_constraints(delete_existing=False)` should be idempotent.

For `PgMindBrainDriver`:

- verify `pg_mindbrain` is installed
- require extension version with the graph APIs needed by the implementation
- create compatibility tables/indexes if absent
- avoid dropping native extension tables

For `MindBrainSQLiteDriver`:

- verify the SQLite schema is installed or install the Graphiti compatibility
  tables only
- do not assume the Zig standalone binary is available unless the driver is
  explicitly configured to use it

## Testing Plan

Start with backend-agnostic operation tests that run against both drivers:

- save/get/delete `EntityNode`
- save/get/delete `EntityEdge`
- save/get/delete `EpisodicNode`
- save/get/delete `EpisodicEdge`
- transaction rollback
- group isolation via `group_id`
- fulltext search over entity names/summaries and edge facts
- embedding load/search using stored vectors
- clear-data leaves native extension metadata intact

Then add one native integration smoke per backend:

- PostgreSQL: write entity/relation, call `graph.rebuild_lj_relations()`, prove
  traversal/search returns the mirrored entity.
- SQLite: write entity/relation, rebuild or update adjacency, prove native graph
  lookup returns the mirrored entity.

## Open Decisions

- Choose PostgreSQL client library: `asyncpg` is simple and async-native;
  `psycopg[binary,pool]` may be easier if the project already prefers psycopg.
- Decide whether embeddings are stored as JSON arrays, binary blobs, or native
  pgvector in compatibility tables. Search quality and cross-backend parity
  depend on this choice.
- Decide whether Graphiti `group_id` maps to MindBrain `workspace_id` directly.
  This is attractive, but should be explicit because MindBrain workspaces carry
  broader collection/ontology semantics than Graphiti group partitions.
