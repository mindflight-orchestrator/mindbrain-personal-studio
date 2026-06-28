# Graphiti Interface to Backend Function Tree

**Status:** Reference

This document maps the user-facing Graphiti interfaces to the implementation and
backend functions they call. It uses the current code as source of truth.

Primary surfaces:

```text
Python SDK
  -> graphiti_core.graphiti.Graphiti
  -> graphiti_core.namespaces.{nodes,edges}
FastAPI REST service
  -> server/graph_service/routers/*
MCP server
  -> mcp_server/src/graphiti_mcp_server.py
Backend operations
  -> graphiti_core/driver/operations/*
  -> concrete driver operation implementations, e.g. graphiti_core/driver/neo4j/operations/*
```

Source file map:

```text
Python SDK root
  graphiti_core/graphiti.py
Namespace helper APIs
  graphiti_core/namespaces/nodes.py
  graphiti_core/namespaces/edges.py
REST service
  server/graph_service/main.py
  server/graph_service/routers/ingest.py
  server/graph_service/routers/retrieve.py
  server/graph_service/zep_graphiti.py
MCP service
  mcp_server/src/graphiti_mcp_server.py
  mcp_server/src/services/queue_service.py
Backend operation ABCs
  graphiti_core/driver/operations/*.py
Concrete backend implementations
  graphiti_core/driver/neo4j/operations/*.py
  graphiti_core/driver/falkordb/operations/*.py
  graphiti_core/driver/kuzu/operations/*.py
  graphiti_core/driver/neptune/operations/*.py
Driver operation wiring
  graphiti_core/driver/driver.py
  graphiti_core/driver/neo4j_driver.py
  graphiti_core/driver/falkordb_driver.py
  graphiti_core/driver/kuzu_driver.py
  graphiti_core/driver/neptune_driver.py
```

Note: the MCP README still mentions older tool names such as `add_episode` and
`search_facts`; the current code exposes `add_memory` and `search_memory_facts`.

## Python SDK: `Graphiti`

```text
Graphiti(...)
  Functionality: construct a graph client, defaulting to Neo4j, OpenAI LLM,
  OpenAI embedder, and OpenAI reranker when no custom clients are supplied.
  Backend:
    Graphiti.__init__
      -> Neo4jDriver(...) when graph_driver is not supplied
      -> OpenAIClient(), OpenAIEmbedder(), OpenAIRerankerClient()
      -> create_tracer(...)
      -> NodeNamespace(driver, embedder)
      -> EdgeNamespace(driver, embedder)
      -> _capture_initialization_telemetry()
```

```text
token_tracker
  Functionality: expose the LLM token usage tracker.
  Backend:
    Graphiti.token_tracker
      -> self.llm_client.token_tracker
```

```text
close()
  Functionality: close the graph database connection.
  Backend:
    Graphiti.close
      -> self.driver.close()
```

```text
build_indices_and_constraints(delete_existing=False)
  Functionality: create required database indexes and constraints.
  Backend:
    Graphiti.build_indices_and_constraints
      -> self.driver.build_indices_and_constraints(delete_existing)
      -> GraphMaintenanceOperations.build_indices_and_constraints(...)
      -> concrete driver graph maintenance implementation
```

```text
retrieve_episodes(reference_time, last_n, group_ids, source, saga)
  Functionality: fetch recent episodic nodes, optionally scoped by group,
  source type, or saga.
  Backend:
    Graphiti.retrieve_episodes
      -> driver.graph_operations_interface.retrieve_episodes(...) if provided
      -> graphiti_core.utils.maintenance.graph_data_operations.retrieve_episodes(...)
      -> EpisodeNodeOperations.retrieve_episodes(...)
```

```text
add_episode(...)
  Functionality: ingest one episode, extract entities and facts, deduplicate
  them against graph history, persist provenance links, optionally update
  communities, and optionally attach the episode to a saga.
  Backend:
    Graphiti.add_episode
      -> validate_entity_types(...)
      -> validate_excluded_entity_types(...)
      -> validate_group_id(...) / get_default_group_id(...)
      -> retrieve_episodes(...) or EpisodicNode.get_by_uuids(...)
      -> EpisodicNode.get_by_uuid(...) or EpisodicNode(...)
      -> extract_nodes(...)
      -> resolve_extracted_nodes(...)
      -> _extract_and_resolve_edges(...)
        -> extract_edges(...)
        -> resolve_edge_pointers(...)
        -> resolve_extracted_edges(...)
      -> extract_attributes_from_nodes(...)
      -> _process_episode_data(...)
        -> build_episodic_edges(...)
        -> add_nodes_and_edges_bulk(...)
        -> _get_or_create_saga(...) when saga is supplied
        -> _saga_get_previous_episode_uuid(...)
        -> NextEpisodeEdge.save(...)
        -> HasEpisodeEdge.save(...)
        -> SagaNode.save(...)
      -> update_community(...) when update_communities=True
  Backend storage:
    add_nodes_and_edges_bulk(...)
      -> node/edge save paths
      -> concrete driver operations for nodes, edges, and embeddings
```

```text
add_episode_bulk(bulk_episodes, ...)
  Functionality: ingest many episodes as one batch, including extraction,
  deduplication, edge invalidation, provenance links, and optional saga chaining.
  Backend:
    Graphiti.add_episode_bulk
      -> validate/use group_id
      -> EpisodicNode.get_by_uuid(...) or EpisodicNode(...)
      -> add_nodes_and_edges_bulk(... episodes only ...)
      -> retrieve_previous_episodes_bulk(...)
      -> _extract_and_dedupe_nodes_bulk(...)
        -> extract_nodes_and_edges_bulk(...)
        -> dedupe_nodes_bulk(...)
      -> build_episodic_edges(...)
      -> resolve_edge_pointers(...)
      -> dedupe_edges_bulk(...)
      -> _resolve_nodes_and_edges_bulk(...)
        -> resolve_extracted_nodes(...)
        -> extract_attributes_from_nodes(...)
        -> resolve_extracted_edges(...)
      -> add_nodes_and_edges_bulk(... full graph objects ...)
      -> saga save / HAS_EPISODE / NEXT_EPISODE handling when saga is supplied
```

```text
build_communities(group_ids=None)
  Functionality: rebuild community nodes and edges for the graph or groups.
  Backend:
    Graphiti.build_communities
      -> remove_communities(driver)
      -> build_communities(driver, llm_client, group_ids)
      -> CommunityNode.generate_name_embedding(...)
      -> CommunityNode.save(...)
      -> CommunityEdge.save(...)
  Backend operations:
      -> GraphMaintenanceOperations.remove_communities(...)
      -> GraphMaintenanceOperations.get_community_clusters(...)
      -> GraphMaintenanceOperations.determine_entity_community(...)
      -> CommunityNodeOperations.save(...)
      -> CommunityEdgeOperations.save(...)
```

```text
search(query, center_node_uuid=None, group_ids=None, num_results=..., search_filter=None)
  Functionality: simple fact search returning entity edges.
  Backend:
    Graphiti.search
      -> choose EDGE_HYBRID_SEARCH_RRF or EDGE_HYBRID_SEARCH_NODE_DISTANCE
      -> graphiti_core.search.search.search(...)
      -> returns SearchResults.edges
```

```text
search_(query, config=COMBINED_HYBRID_SEARCH_CROSS_ENCODER, ...)
  Functionality: advanced search returning a SearchResults object containing
  nodes, edges, episodes, and/or communities depending on SearchConfig.
  Backend:
    Graphiti.search_
      -> graphiti_core.search.search.search(...)
        -> embedder.create(...) if vector search or MMR is enabled
        -> edge_search(...)
        -> node_search(...)
        -> episode_search(...)
        -> community_search(...)
        -> rerankers configured by SearchConfig
  Backend operations:
      -> SearchOperations.node_fulltext_search(...)
      -> SearchOperations.node_similarity_search(...)
      -> SearchOperations.node_bfs_search(...)
      -> SearchOperations.edge_fulltext_search(...)
      -> SearchOperations.edge_similarity_search(...)
      -> SearchOperations.edge_bfs_search(...)
      -> SearchOperations.episode_fulltext_search(...)
      -> SearchOperations.community_fulltext_search(...)
      -> SearchOperations.community_similarity_search(...)
      -> SearchOperations.node_distance_reranker(...)
      -> SearchOperations.episode_mentions_reranker(...)
```

```text
_search(...)
  Functionality: deprecated alias for advanced search.
  Backend:
    Graphiti._search
      -> Graphiti.search_(...)
```

```text
get_nodes_and_edges_by_episode(episode_uuids)
  Functionality: retrieve graph objects mentioned by episodes.
  Backend:
    Graphiti.get_nodes_and_edges_by_episode
      -> EpisodicNode.get_by_uuids(...)
      -> EntityEdge.get_by_uuids(...)
      -> get_mentioned_nodes(...)
      -> SearchResults(edges=..., nodes=...)
```

```text
add_triplet(source_node, edge, target_node)
  Functionality: manually add or merge a source node, fact edge, and target
  node, including embeddings and contradiction/invalidation checks.
  Backend:
    Graphiti.add_triplet
      -> EntityNode.generate_name_embedding(...)
      -> EntityEdge.generate_embedding(...)
      -> EntityNode.get_by_uuid(...)
      -> resolve_extracted_nodes(...) for missing nodes
      -> EntityEdge.get_by_uuid(...) to avoid UUID source/target conflicts
      -> EntityEdge.get_between_nodes(...)
      -> search(... EDGE_HYBRID_SEARCH_RRF ...) for related/existing edges
      -> resolve_extracted_edge(...)
      -> create_entity_edge_embeddings(...)
      -> create_entity_node_embeddings(...)
      -> add_nodes_and_edges_bulk(...)
```

```text
remove_episode(episode_uuid)
  Functionality: delete an episode and any facts/nodes that are only supported
  by that episode.
  Backend:
    Graphiti.remove_episode
      -> EpisodicNode.get_by_uuid(...)
      -> EntityEdge.get_by_uuids(...)
      -> get_mentioned_nodes(...)
      -> driver.execute_query(...) to count episode mentions per node
      -> Edge.delete_by_uuids(...)
      -> Node.delete_by_uuids(...)
      -> episode.delete(...)
```

```text
summarize_saga(saga_id)
  Functionality: update a saga summary from newly added episode contents.
  Backend:
    Graphiti.summarize_saga
      -> SagaNode.get_by_uuid(...)
      -> _saga_get_episode_contents(...)
        -> driver.graph_operations_interface.saga_get_episode_contents(...) if provided
        -> driver.execute_query(...) fallback
      -> llm_client.generate_response(prompt_library.summarize_sagas.summarize_saga(...))
      -> SagaNode.save(...)
```

## Python SDK: Namespace Helper APIs

Namespaces are exposed from `Graphiti.__init__` as `graphiti.nodes` and
`graphiti.edges`. They are thin wrappers over driver operation interfaces.
Embedding generation happens in namespace methods for entity/community nodes and
entity edges; database I/O happens in operation classes.

```text
graphiti.nodes.entity
  save(node, tx=None)
    -> EntityNode.generate_name_embedding(...)
    -> EntityNodeOperations.save(driver, node, tx)
  save_bulk(nodes, tx=None, batch_size=100)
    -> EntityNodeOperations.save_bulk(...)
  delete(node, tx=None)
    -> EntityNodeOperations.delete(...)
  delete_by_group_id(group_id, tx=None, batch_size=100)
    -> EntityNodeOperations.delete_by_group_id(...)
  delete_by_uuids(uuids, tx=None, batch_size=100)
    -> EntityNodeOperations.delete_by_uuids(...)
  get_by_uuid(uuid)
    -> EntityNodeOperations.get_by_uuid(...)
  get_by_uuids(uuids)
    -> EntityNodeOperations.get_by_uuids(...)
  get_by_group_ids(group_ids, limit=None, uuid_cursor=None)
    -> EntityNodeOperations.get_by_group_ids(...)
  load_embeddings(node)
    -> EntityNodeOperations.load_embeddings(...)
  load_embeddings_bulk(nodes, batch_size=100)
    -> EntityNodeOperations.load_embeddings_bulk(...)
```

```text
graphiti.nodes.episode
  save(node, tx=None)
    -> EpisodeNodeOperations.save(...)
  save_bulk(nodes, tx=None, batch_size=100)
    -> EpisodeNodeOperations.save_bulk(...)
  delete(node, tx=None)
    -> EpisodeNodeOperations.delete(...)
  delete_by_group_id(group_id, tx=None, batch_size=100)
    -> EpisodeNodeOperations.delete_by_group_id(...)
  delete_by_uuids(uuids, tx=None, batch_size=100)
    -> EpisodeNodeOperations.delete_by_uuids(...)
  get_by_uuid(uuid)
    -> EpisodeNodeOperations.get_by_uuid(...)
  get_by_uuids(uuids)
    -> EpisodeNodeOperations.get_by_uuids(...)
  get_by_group_ids(group_ids, limit=None, uuid_cursor=None)
    -> EpisodeNodeOperations.get_by_group_ids(...)
  get_by_entity_node_uuid(entity_node_uuid)
    -> EpisodeNodeOperations.get_by_entity_node_uuid(...)
  retrieve_episodes(reference_time, last_n=3, group_ids=None, source=None, saga=None)
    -> EpisodeNodeOperations.retrieve_episodes(...)
```

```text
graphiti.nodes.community
  save(node, tx=None)
    -> CommunityNode.generate_name_embedding(...)
    -> CommunityNodeOperations.save(...)
  save_bulk(nodes, tx=None, batch_size=100)
    -> CommunityNodeOperations.save_bulk(...)
  delete(node, tx=None)
    -> CommunityNodeOperations.delete(...)
  delete_by_group_id(group_id, tx=None, batch_size=100)
    -> CommunityNodeOperations.delete_by_group_id(...)
  delete_by_uuids(uuids, tx=None, batch_size=100)
    -> CommunityNodeOperations.delete_by_uuids(...)
  get_by_uuid(uuid)
    -> CommunityNodeOperations.get_by_uuid(...)
  get_by_uuids(uuids)
    -> CommunityNodeOperations.get_by_uuids(...)
  get_by_group_ids(group_ids, limit=None, uuid_cursor=None)
    -> CommunityNodeOperations.get_by_group_ids(...)
  load_name_embedding(node)
    -> CommunityNodeOperations.load_name_embedding(...)
```

```text
graphiti.nodes.saga
  save(node, tx=None)
    -> SagaNodeOperations.save(...)
  save_bulk(nodes, tx=None, batch_size=100)
    -> SagaNodeOperations.save_bulk(...)
  delete(node, tx=None)
    -> SagaNodeOperations.delete(...)
  delete_by_group_id(group_id, tx=None, batch_size=100)
    -> SagaNodeOperations.delete_by_group_id(...)
  delete_by_uuids(uuids, tx=None, batch_size=100)
    -> SagaNodeOperations.delete_by_uuids(...)
  get_by_uuid(uuid)
    -> SagaNodeOperations.get_by_uuid(...)
  get_by_uuids(uuids)
    -> SagaNodeOperations.get_by_uuids(...)
  get_by_group_ids(group_ids, limit=None, uuid_cursor=None)
    -> SagaNodeOperations.get_by_group_ids(...)
```

```text
graphiti.edges.entity
  save(edge, tx=None)
    -> EntityEdge.generate_embedding(...)
    -> EntityEdgeOperations.save(...)
  save_bulk(edges, tx=None, batch_size=100)
    -> EntityEdgeOperations.save_bulk(...)
  delete(edge, tx=None)
    -> EntityEdgeOperations.delete(...)
  delete_by_uuids(uuids, tx=None)
    -> EntityEdgeOperations.delete_by_uuids(...)
  get_by_uuid(uuid)
    -> EntityEdgeOperations.get_by_uuid(...)
  get_by_uuids(uuids)
    -> EntityEdgeOperations.get_by_uuids(...)
  get_by_group_ids(group_ids, limit=None, uuid_cursor=None)
    -> EntityEdgeOperations.get_by_group_ids(...)
  get_between_nodes(source_node_uuid, target_node_uuid)
    -> EntityEdgeOperations.get_between_nodes(...)
  get_by_node_uuid(node_uuid)
    -> EntityEdgeOperations.get_by_node_uuid(...)
  load_embeddings(edge)
    -> EntityEdgeOperations.load_embeddings(...)
  load_embeddings_bulk(edges, batch_size=100)
    -> EntityEdgeOperations.load_embeddings_bulk(...)
```

```text
graphiti.edges.episodic
  save(edge, tx=None)
    -> EpisodicEdgeOperations.save(...)
  save_bulk(edges, tx=None, batch_size=100)
    -> EpisodicEdgeOperations.save_bulk(...)
  delete(edge, tx=None)
    -> EpisodicEdgeOperations.delete(...)
  delete_by_uuids(uuids, tx=None)
    -> EpisodicEdgeOperations.delete_by_uuids(...)
  get_by_uuid(uuid)
    -> EpisodicEdgeOperations.get_by_uuid(...)
  get_by_uuids(uuids)
    -> EpisodicEdgeOperations.get_by_uuids(...)
  get_by_group_ids(group_ids, limit=None, uuid_cursor=None)
    -> EpisodicEdgeOperations.get_by_group_ids(...)
```

```text
graphiti.edges.community
  save(edge, tx=None)
    -> CommunityEdgeOperations.save(...)
  delete(edge, tx=None)
    -> CommunityEdgeOperations.delete(...)
  delete_by_uuids(uuids, tx=None)
    -> CommunityEdgeOperations.delete_by_uuids(...)
  get_by_uuid(uuid)
    -> CommunityEdgeOperations.get_by_uuid(...)
  get_by_uuids(uuids)
    -> CommunityEdgeOperations.get_by_uuids(...)
  get_by_group_ids(group_ids, limit=None, uuid_cursor=None)
    -> CommunityEdgeOperations.get_by_group_ids(...)
```

```text
graphiti.edges.has_episode
  save(edge, tx=None)
    -> HasEpisodeEdgeOperations.save(...)
  save_bulk(edges, tx=None, batch_size=100)
    -> HasEpisodeEdgeOperations.save_bulk(...)
  delete(edge, tx=None)
    -> HasEpisodeEdgeOperations.delete(...)
  delete_by_uuids(uuids, tx=None)
    -> HasEpisodeEdgeOperations.delete_by_uuids(...)
  get_by_uuid(uuid)
    -> HasEpisodeEdgeOperations.get_by_uuid(...)
  get_by_uuids(uuids)
    -> HasEpisodeEdgeOperations.get_by_uuids(...)
  get_by_group_ids(group_ids, limit=None, uuid_cursor=None)
    -> HasEpisodeEdgeOperations.get_by_group_ids(...)
```

```text
graphiti.edges.next_episode
  save(edge, tx=None)
    -> NextEpisodeEdgeOperations.save(...)
  save_bulk(edges, tx=None, batch_size=100)
    -> NextEpisodeEdgeOperations.save_bulk(...)
  delete(edge, tx=None)
    -> NextEpisodeEdgeOperations.delete(...)
  delete_by_uuids(uuids, tx=None)
    -> NextEpisodeEdgeOperations.delete_by_uuids(...)
  get_by_uuid(uuid)
    -> NextEpisodeEdgeOperations.get_by_uuid(...)
  get_by_uuids(uuids)
    -> NextEpisodeEdgeOperations.get_by_uuids(...)
  get_by_group_ids(group_ids, limit=None, uuid_cursor=None)
    -> NextEpisodeEdgeOperations.get_by_group_ids(...)
```

## FastAPI REST Service

The REST service lives in `server/graph_service`. It uses a request-scoped
`ZepGraphiti` client from `get_graphiti(...)`. Startup calls
`initialize_graphiti(...)`, which creates a client and builds indexes.

```text
GET /healthcheck
  Functionality: service liveness check.
  Backend:
    server.graph_service.main.healthcheck
      -> JSONResponse({"status": "healthy"})
```

```text
POST /messages
  Functionality: queue one or more conversation messages for episode ingestion.
  Backend:
    routers.ingest.add_messages
      -> AsyncWorker.queue.put(partial(add_messages_task, message))
      -> add_messages_task(...)
        -> graphiti.add_episode(
             uuid=message.uuid,
             group_id=request.group_id,
             name=message.name,
             episode_body="<role>(<role_type>): <content>",
             reference_time=message.timestamp,
             source=EpisodeType.message,
             source_description=message.source_description
           )
      -> Graphiti.add_episode pipeline
```

```text
POST /entity-node
  Functionality: create or save a named entity node directly.
  Backend:
    routers.ingest.add_entity_node
      -> ZepGraphiti.save_entity_node(...)
        -> EntityNode(...)
        -> EntityNode.generate_name_embedding(...)
        -> EntityNode.save(driver)
        -> EntityNodeOperations.save(...)
```

```text
DELETE /entity-edge/{uuid}
  Functionality: delete a fact/entity edge by UUID.
  Backend:
    routers.ingest.delete_entity_edge
      -> ZepGraphiti.delete_entity_edge(uuid)
        -> EntityEdge.get_by_uuid(driver, uuid)
        -> edge.delete(driver)
        -> EntityEdgeOperations.delete(...)
```

```text
DELETE /group/{group_id}
  Functionality: delete all entity edges, entity nodes, and episodes for a group.
  Backend:
    routers.ingest.delete_group
      -> ZepGraphiti.delete_group(group_id)
        -> EntityEdge.get_by_group_ids(driver, [group_id])
        -> EntityNode.get_by_group_ids(driver, [group_id])
        -> EpisodicNode.get_by_group_ids(driver, [group_id])
        -> edge.delete(driver), node.delete(driver), episode.delete(driver)
```

```text
DELETE /episode/{uuid}
  Functionality: delete an episode node by UUID.
  Backend:
    routers.ingest.delete_episode
      -> ZepGraphiti.delete_episodic_node(uuid)
        -> EpisodicNode.get_by_uuid(driver, uuid)
        -> episode.delete(driver)
        -> EpisodeNodeOperations.delete(...)
```

```text
POST /clear
  Functionality: clear graph data and rebuild indexes.
  Backend:
    routers.ingest.clear
      -> clear_data(graphiti.driver)
      -> graphiti.build_indices_and_constraints()
      -> GraphMaintenanceOperations.clear_data(...)
      -> GraphMaintenanceOperations.build_indices_and_constraints(...)
```

```text
POST /search
  Functionality: search facts by query and optional group IDs.
  Backend:
    routers.retrieve.search
      -> graphiti.search(group_ids=query.group_ids, query=query.query, num_results=query.max_facts)
      -> Graphiti.search pipeline
      -> get_fact_result_from_edge(...) for response DTO
```

```text
GET /entity-edge/{uuid}
  Functionality: retrieve one fact/entity edge by UUID.
  Backend:
    routers.retrieve.get_entity_edge
      -> ZepGraphiti.get_entity_edge(uuid)
        -> EntityEdge.get_by_uuid(driver, uuid)
      -> get_fact_result_from_edge(...)
```

```text
GET /episodes/{group_id}?last_n=N
  Functionality: fetch the last N episodes for one group.
  Backend:
    routers.retrieve.get_episodes
      -> graphiti.retrieve_episodes(
           group_ids=[group_id],
           last_n=last_n,
           reference_time=datetime.now(timezone.utc)
         )
      -> Graphiti.retrieve_episodes pipeline
```

```text
POST /get-memory
  Functionality: compose a search query from messages and return relevant facts.
  Backend:
    routers.retrieve.get_memory
      -> compose_query_from_messages(request.messages)
      -> graphiti.search(group_ids=[request.group_id], query=combined_query, num_results=request.max_facts)
      -> Graphiti.search pipeline
      -> get_fact_result_from_edge(...)
```

## MCP Server

The MCP server lives in `mcp_server/src/graphiti_mcp_server.py`. It uses a
process-wide `GraphitiService`, which creates LLM/embedder/database clients from
configuration, then initializes `Graphiti` and builds indexes. Episode ingestion
uses `QueueService` so episodes for the same group are processed sequentially.

```text
add_memory(name, episode_body, group_id=None, source="text", source_description="", uuid=None)
  Functionality: primary MCP ingestion tool; queue text, JSON, or message
  content as a Graphiti episode.
  Backend:
    add_memory
      -> effective_group_id = provided group_id or config.graphiti.group_id
      -> EpisodeType[source.lower()] with fallback to EpisodeType.text
      -> queue_service.add_episode(...)
        -> QueueService.add_episode_task(group_id, process_episode)
        -> QueueService._process_episode_queue(group_id)
        -> process_episode()
          -> graphiti_client.add_episode(
               name=name,
               episode_body=content,
               source_description=source_description,
               source=episode_type,
               group_id=group_id,
               reference_time=datetime.now(timezone.utc),
               entity_types=entity_types,
               uuid=uuid
             )
      -> Graphiti.add_episode pipeline
```

```text
search_nodes(query, group_ids=None, max_nodes=10, entity_types=None)
  Functionality: search entity nodes by natural language query and optional
  entity labels.
  Backend:
    search_nodes
      -> graphiti_service.get_client()
      -> SearchFilters(node_labels=entity_types)
      -> client.search_(config=NODE_HYBRID_SEARCH_RRF, group_ids=effective_group_ids, ...)
      -> Graphiti.search_ pipeline
      -> format into NodeSearchResponse
```

```text
search_memory_facts(query, group_ids=None, max_facts=10, center_node_uuid=None)
  Functionality: search relationship facts, optionally centered around a node.
  Backend:
    search_memory_facts
      -> validate max_facts > 0
      -> graphiti_service.get_client()
      -> client.search(
           group_ids=effective_group_ids,
           query=query,
           num_results=max_facts,
           center_node_uuid=center_node_uuid
         )
      -> Graphiti.search pipeline
      -> format_fact_result(edge)
```

```text
delete_entity_edge(uuid)
  Functionality: delete one entity edge by UUID.
  Backend:
    delete_entity_edge
      -> graphiti_service.get_client()
      -> EntityEdge.get_by_uuid(client.driver, uuid)
      -> entity_edge.delete(client.driver)
      -> EntityEdgeOperations.delete(...)
```

```text
delete_episode(uuid)
  Functionality: delete one episodic node by UUID.
  Backend:
    delete_episode
      -> graphiti_service.get_client()
      -> EpisodicNode.get_by_uuid(client.driver, uuid)
      -> episodic_node.delete(client.driver)
      -> EpisodeNodeOperations.delete(...)
```

```text
get_entity_edge(uuid)
  Functionality: retrieve and serialize one entity edge by UUID.
  Backend:
    get_entity_edge
      -> graphiti_service.get_client()
      -> EntityEdge.get_by_uuid(client.driver, uuid)
      -> format_fact_result(entity_edge)
```

```text
get_episodes(group_ids=None, max_episodes=10)
  Functionality: retrieve recent episodes for supplied or default groups.
  Backend:
    get_episodes
      -> graphiti_service.get_client()
      -> EpisodicNode.get_by_group_ids(client.driver, effective_group_ids, limit=max_episodes)
      -> format episode dictionaries
```

```text
clear_graph(group_ids=None)
  Functionality: clear graph data for supplied or default groups.
  Backend:
    clear_graph
      -> graphiti_service.get_client()
      -> clear_data(client.driver, group_ids=effective_group_ids)
      -> GraphMaintenanceOperations.clear_data(...)
```

```text
get_status()
  Functionality: report MCP server and database connection health.
  Backend:
    get_status
      -> graphiti_service.get_client()
      -> client.driver.session()
      -> session.run("MATCH (n) RETURN count(n) as count")
```

```text
GET /health
  Functionality: HTTP health check for Docker/load balancers.
  Backend:
    health_check
      -> JSONResponse({"status": "healthy", "service": "graphiti-mcp"})
```

## Backend Operation Interfaces

The backend layer is split into abstract operation interfaces under
`graphiti_core/driver/operations/` and concrete implementations under driver
directories such as `graphiti_core/driver/neo4j/operations/`.

The driver base class exposes one property per operation family:

```text
GraphDriver
  entity_node_ops
  episode_node_ops
  community_node_ops
  saga_node_ops
  entity_edge_ops
  episodic_edge_ops
  community_edge_ops
  has_episode_edge_ops
  next_episode_edge_ops
  search_ops
  graph_ops
```

Concrete drivers instantiate provider-specific implementations:

```text
Neo4jDriver
  -> Neo4jEntityNodeOperations
  -> Neo4jEpisodeNodeOperations
  -> Neo4jCommunityNodeOperations
  -> Neo4jSagaNodeOperations
  -> Neo4jEntityEdgeOperations
  -> Neo4jEpisodicEdgeOperations
  -> Neo4jCommunityEdgeOperations
  -> Neo4jHasEpisodeEdgeOperations
  -> Neo4jNextEpisodeEdgeOperations
  -> Neo4jSearchOperations
  -> Neo4jGraphMaintenanceOperations

FalkorDriver
  -> FalkorEntityNodeOperations
  -> FalkorEpisodeNodeOperations
  -> FalkorCommunityNodeOperations
  -> FalkorSagaNodeOperations
  -> FalkorEntityEdgeOperations
  -> FalkorEpisodicEdgeOperations
  -> FalkorCommunityEdgeOperations
  -> FalkorHasEpisodeEdgeOperations
  -> FalkorNextEpisodeEdgeOperations
  -> FalkorSearchOperations
  -> FalkorGraphMaintenanceOperations

KuzuDriver
  -> KuzuEntityNodeOperations
  -> KuzuEpisodeNodeOperations
  -> KuzuCommunityNodeOperations
  -> KuzuSagaNodeOperations
  -> KuzuEntityEdgeOperations
  -> KuzuEpisodicEdgeOperations
  -> KuzuCommunityEdgeOperations
  -> KuzuHasEpisodeEdgeOperations
  -> KuzuNextEpisodeEdgeOperations
  -> KuzuSearchOperations
  -> KuzuGraphMaintenanceOperations

NeptuneDriver
  -> NeptuneEntityNodeOperations
  -> NeptuneEpisodeNodeOperations
  -> NeptuneCommunityNodeOperations
  -> NeptuneSagaNodeOperations
  -> NeptuneEntityEdgeOperations
  -> NeptuneEpisodicEdgeOperations
  -> NeptuneCommunityEdgeOperations
  -> NeptuneHasEpisodeEdgeOperations
  -> NeptuneNextEpisodeEdgeOperations
  -> NeptuneSearchOperations
  -> NeptuneGraphMaintenanceOperations
```

```text
EntityNodeOperations
  Functionality: entity node persistence, lookup, deletion, and embedding loads.
  Methods:
    save
    save_bulk
    delete
    delete_by_group_id
    delete_by_uuids
    get_by_uuid
    get_by_uuids
    get_by_group_ids
    load_embeddings
    load_embeddings_bulk
  Called by:
    graphiti.nodes.entity.*
    EntityNode model class methods
    ingestion and triplet persistence helpers
```

```text
EpisodeNodeOperations
  Functionality: episode persistence, lookup, deletion, group retrieval,
  entity-to-episode lookup, and temporal episode retrieval.
  Methods:
    save
    save_bulk
    delete
    delete_by_group_id
    delete_by_uuids
    get_by_uuid
    get_by_uuids
    get_by_group_ids
    get_by_entity_node_uuid
    retrieve_episodes
  Called by:
    graphiti.nodes.episode.*
    Graphiti.retrieve_episodes
    REST/MCP episode retrieval and deletion
```

```text
CommunityNodeOperations
  Functionality: community node persistence, lookup, deletion, and embedding
  loads.
  Methods:
    save
    save_bulk
    delete
    delete_by_group_id
    delete_by_uuids
    get_by_uuid
    get_by_uuids
    get_by_group_ids
    load_name_embedding
  Called by:
    graphiti.nodes.community.*
    Graphiti.build_communities
```

```text
SagaNodeOperations
  Functionality: saga node persistence, lookup, and deletion.
  Methods:
    save
    save_bulk
    delete
    delete_by_group_id
    delete_by_uuids
    get_by_uuid
    get_by_uuids
    get_by_group_ids
  Called by:
    graphiti.nodes.saga.*
    Graphiti.add_episode / add_episode_bulk saga handling
    Graphiti.summarize_saga
```

```text
EntityEdgeOperations
  Functionality: fact/entity edge persistence, lookup, deletion, between-node
  queries, node adjacency queries, and embedding loads.
  Methods:
    save
    save_bulk
    delete
    delete_by_uuids
    get_by_uuid
    get_by_uuids
    get_by_group_ids
    get_between_nodes
    get_by_node_uuid
    load_embeddings
    load_embeddings_bulk
  Called by:
    graphiti.edges.entity.*
    EntityEdge model class methods
    Graphiti.search, add_episode, add_triplet, REST/MCP fact operations
```

```text
EpisodicEdgeOperations
  Functionality: MENTIONS/provenance edge persistence, lookup, and deletion.
  Methods:
    save
    save_bulk
    delete
    delete_by_uuids
    get_by_uuid
    get_by_uuids
    get_by_group_ids
  Called by:
    graphiti.edges.episodic.*
    add_nodes_and_edges_bulk(...)
```

```text
CommunityEdgeOperations
  Functionality: community edge persistence, lookup, and deletion.
  Methods:
    save
    delete
    delete_by_uuids
    get_by_uuid
    get_by_uuids
    get_by_group_ids
  Called by:
    graphiti.edges.community.*
    Graphiti.build_communities
```

```text
HasEpisodeEdgeOperations
  Functionality: saga-to-episode edge persistence, lookup, and deletion.
  Methods:
    save
    save_bulk
    delete
    delete_by_uuids
    get_by_uuid
    get_by_uuids
    get_by_group_ids
  Called by:
    graphiti.edges.has_episode.*
    Graphiti.add_episode / add_episode_bulk saga handling
```

```text
NextEpisodeEdgeOperations
  Functionality: ordered episode-chain edge persistence, lookup, and deletion.
  Methods:
    save
    save_bulk
    delete
    delete_by_uuids
    get_by_uuid
    get_by_uuids
    get_by_group_ids
  Called by:
    graphiti.edges.next_episode.*
    Graphiti.add_episode / add_episode_bulk saga handling
```

```text
SearchOperations
  Functionality: database-specific search primitives used by the shared search
  orchestration layer.
  Methods:
    node_fulltext_search
    node_similarity_search
    node_bfs_search
    edge_fulltext_search
    edge_similarity_search
    edge_bfs_search
    episode_fulltext_search
    community_fulltext_search
    community_similarity_search
    node_distance_reranker
    episode_mentions_reranker
  Called by:
    graphiti_core.search.search.search(...)
    Graphiti.search
    Graphiti.search_
    REST /search and /get-memory
    MCP search_nodes and search_memory_facts
```

```text
GraphMaintenanceOperations
  Functionality: graph clearing, index management, community clustering, and
  graph neighborhood helpers.
  Methods:
    clear_data
    build_indices_and_constraints
    delete_all_indexes
    get_community_clusters
    remove_communities
    determine_entity_community
    get_mentioned_nodes
    get_communities_by_nodes
  Called by:
    Graphiti.build_indices_and_constraints
    Graphiti.build_communities
    clear_data(...)
    get_mentioned_nodes(...)
    REST /clear
    MCP clear_graph
```

## Cross-Surface Functionality Index

```text
Initialize and configure graph client
  Python SDK: Graphiti(...)
  REST: initialize_graphiti(settings), get_graphiti(settings)
  MCP: GraphitiService.initialize()
  Backend: driver constructor, client factories, build_indices_and_constraints
```

```text
Add episode / memory
  Python SDK: Graphiti.add_episode, Graphiti.add_episode_bulk
  REST: POST /messages
  MCP: add_memory
  Backend: extraction utils, dedupe utils, add_nodes_and_edges_bulk,
  node/edge operations, graph maintenance when communities are enabled
```

```text
Add direct entity node
  Python SDK: graphiti.nodes.entity.save
  REST: POST /entity-node
  MCP: no direct tool
  Backend: EntityNode.generate_name_embedding, EntityNodeOperations.save
```

```text
Add direct triplet/fact
  Python SDK: Graphiti.add_triplet
  REST: no route
  MCP: no direct tool
  Backend: EntityNodeOperations, EntityEdgeOperations, search, edge resolution
```

```text
Search facts
  Python SDK: Graphiti.search
  REST: POST /search, POST /get-memory
  MCP: search_memory_facts
  Backend: graphiti_core.search.search, SearchOperations edge methods,
  rerankers, format_fact_result/get_fact_result_from_edge
```

```text
Search nodes
  Python SDK: Graphiti.search_ with node SearchConfig
  REST: no dedicated route
  MCP: search_nodes
  Backend: SearchOperations node methods and configured rerankers
```

```text
Retrieve episodes
  Python SDK: Graphiti.retrieve_episodes, graphiti.nodes.episode.get_by_group_ids
  REST: GET /episodes/{group_id}
  MCP: get_episodes
  Backend: EpisodeNodeOperations.retrieve_episodes or get_by_group_ids
```

```text
Retrieve one fact
  Python SDK: graphiti.edges.entity.get_by_uuid or EntityEdge.get_by_uuid
  REST: GET /entity-edge/{uuid}
  MCP: get_entity_edge
  Backend: EntityEdgeOperations.get_by_uuid
```

```text
Delete one fact
  Python SDK: graphiti.edges.entity.delete / delete_by_uuids
  REST: DELETE /entity-edge/{uuid}
  MCP: delete_entity_edge
  Backend: EntityEdgeOperations.delete
```

```text
Delete one episode
  Python SDK: Graphiti.remove_episode for cleanup-aware deletion, or
  graphiti.nodes.episode.delete for direct deletion
  REST: DELETE /episode/{uuid}
  MCP: delete_episode
  Backend: EpisodeNodeOperations.delete plus optional cleanup in Graphiti.remove_episode
```

```text
Delete/clear groups
  Python SDK: namespace delete_by_group_id methods, clear_data utility
  REST: DELETE /group/{group_id}, POST /clear
  MCP: clear_graph
  Backend: node/edge get_by_group_ids/delete paths, GraphMaintenanceOperations.clear_data
```

```text
Build communities
  Python SDK: Graphiti.build_communities
  REST: no route
  MCP: no tool
  Backend: GraphMaintenanceOperations community methods, CommunityNodeOperations,
  CommunityEdgeOperations
```

```text
Saga support
  Python SDK: add_episode/add_episode_bulk saga args, summarize_saga,
  graphiti.nodes.saga, graphiti.edges.has_episode, graphiti.edges.next_episode
  REST: no direct route
  MCP: no direct tool
  Backend: SagaNodeOperations, HasEpisodeEdgeOperations, NextEpisodeEdgeOperations,
  raw driver saga helper queries when graph_operations_interface does not implement them
```

```text
Health/status
  Python SDK: no explicit health API beyond driver/session usage
  REST: GET /healthcheck
  MCP: get_status, GET /health
  Backend: MCP get_status executes a simple MATCH count query through driver.session
```
