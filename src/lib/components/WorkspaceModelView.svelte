<script lang="ts">
	import SchemaGraphView from '$lib/components/SchemaGraphView.svelte';
	import { buildSchemaGraph } from '$lib/brain/schemaGraphModel';
	import type { SchemaGraphEdge, SchemaGraphNode } from '$lib/brain/schemaGraphModel';
	import {
		ALL_ONTOLOGIES,
		fetchOntologyInspect,
		fetchSchemaRegistry,
		ontologyKeyFromId,
		schemaIndexFromInspects,
		type OntologyInspectPayload,
		type OntologySummaryRow,
		type SchemaRegistryResponse,
		type SchemaRegistryRow
	} from '$lib/brain/ontologyInspect';

	let {
		workspaceId,
		ontologies,
		selectedOntologyId = ALL_ONTOLOGIES,
		onSelect
	}: {
		workspaceId: string;
		ontologies: OntologySummaryRow[];
		selectedOntologyId?: string;
		onSelect?: (payload: {
			nodeKind: string;
			typeName: string;
			payload: Record<string, unknown>;
		}) => void;
	} = $props();

	type SurfaceId = 'ontologies' | 'schema';

	let surface = $state<SurfaceId>('ontologies');
	let ontologyFilter = $state(ALL_ONTOLOGIES);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let inspects = $state<OntologyInspectPayload[]>([]);
	let registry = $state<SchemaRegistryResponse | null>(null);
	let showRelations = $state(true);
	let showImportantLabels = $state(true);
	let showIsA = $state(false);
	let showAbstract = $state(false);
	let graphNodes = $state<SchemaGraphNode[]>([]);
	let graphEdges = $state<SchemaGraphEdge[]>([]);
	let stats = $state({ classCount: 0, relationCount: 0, isACount: 0 });

	$effect(() => {
		if (workspaceId && ontologies.length > 0) void loadWorkspaceModel();
	});

	$effect(() => {
		ontologyFilter =
			selectedOntologyId === ALL_ONTOLOGIES
				? ALL_ONTOLOGIES
				: ontologyKeyFromId(selectedOntologyId, workspaceId);
	});

	$effect(() => {
		const index = schemaIndexFromInspects(
			workspaceId,
			inspects,
			ontologyFilter,
			registry?.rows ?? []
		);
		const graph = buildSchemaGraph(index, {
			hideAbstract: !showAbstract,
			showRelations,
			showIsA: showAbstract && showIsA
		});
		graphNodes = graph.nodes;
		graphEdges = graph.edges;
		stats = graph.stats;
	});

	async function loadWorkspaceModel() {
		loading = true;
		error = null;
		try {
			const rows = await Promise.all(
				ontologies.map((row) => fetchOntologyInspect(row.ontology_id, workspaceId))
			);
			inspects = rows;
			try {
				registry = await fetchSchemaRegistry(workspaceId);
			} catch (e) {
				registry = {
					workspace_id: workspaceId,
					total: 0,
					facet_definition_total: 0,
					rows: [],
					source: 'unavailable',
					error: e instanceof Error ? e.message : String(e)
				};
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			inspects = [];
			registry = null;
		} finally {
			loading = false;
		}
	}

	function ontologyKey(row: OntologyInspectPayload | OntologySummaryRow): string {
		return ontologyKeyFromId(row.ontology_id, workspaceId);
	}

	function visibleInspects(): OntologyInspectPayload[] {
		if (ontologyFilter === ALL_ONTOLOGIES) return inspects;
		return inspects.filter((row) => ontologyKey(row) === ontologyFilter);
	}

	function visibleSchemas(): SchemaRegistryRow[] {
		const rows = registry?.rows ?? [];
		if (ontologyFilter === ALL_ONTOLOGIES) return rows;
		return rows.filter((row) => row.ontology_key === ontologyFilter);
	}

	function handleNodeClick(node: SchemaGraphNode) {
		const meta = node.metadata ?? {};
		onSelect?.({
			nodeKind: 'entity',
			typeName: String(meta.native_type ?? node.typeName),
			payload: {
				...meta,
				typeName: String(meta.native_type ?? node.typeName),
				qualifiedTypeName: node.typeName,
				ontology_id: meta.ontology_id
			}
		});
	}

	function handleEdgeClick(edge: SchemaGraphEdge) {
		const meta = edge.metadata ?? {};
		onSelect?.({
			nodeKind: 'edge',
			typeName: String(meta.native_edge_type ?? edge.edgeType ?? edge.label),
			payload: {
				id: edge.id,
				source: edge.source,
				target: edge.target,
				label: edge.label,
				edgeType: String(meta.native_edge_type ?? edge.edgeType ?? edge.label),
				ontology_id: meta.ontology_id,
				native_source_type: meta.native_source_type,
				native_target_type: meta.native_target_type
			}
		});
	}
</script>

<div class="workspace-model">
	<div class="model-toolbar">
		<div class="segmented" role="tablist" aria-label="Model surface">
			<button type="button" class:active={surface === 'ontologies'} onclick={() => (surface = 'ontologies')}>
				Ontologies
			</button>
			<button type="button" class:active={surface === 'schema'} onclick={() => (surface = 'schema')}>
				Schema
			</button>
		</div>
		<label class="select-wrap">
			<span>View</span>
			<select bind:value={ontologyFilter}>
				<option value={ALL_ONTOLOGIES}>Tous</option>
				{#each ontologies as ontology}
					<option value={ontologyKey(ontology)}>{ontologyKey(ontology)}</option>
				{/each}
			</select>
		</label>
	</div>

	{#if loading}
		<p class="muted">Loading workspace model...</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if surface === 'ontologies'}
		<div class="summary-bar">
			<span>{visibleInspects().length} ontologies</span>
			<span>{stats.classCount} classes</span>
			<span>{stats.relationCount} relations</span>
			<span>{visibleInspects().reduce((sum, row) => sum + (row.dimensions?.length ?? 0), 0)} dimensions</span>
		</div>
		<div class="model-graph-panel">
			<div class="graph-toolbar">
				<label><input type="checkbox" bind:checked={showRelations} /> Relations métier</label>
				<label><input type="checkbox" bind:checked={showImportantLabels} /> Labels importants</label>
				<label><input type="checkbox" bind:checked={showAbstract} /> Abstractions</label>
				<label class:disabled={!showAbstract}>
					<input type="checkbox" bind:checked={showIsA} disabled={!showAbstract} />
					Héritage
				</label>
				<span>{stats.classCount} classes · {stats.relationCount} relations · {stats.isACount} is_a</span>
			</div>
			<SchemaGraphView
				nodes={graphNodes}
				edges={graphEdges}
				showEdgeLabels={showImportantLabels}
				onNodeClick={handleNodeClick}
				onEdgeClick={handleEdgeClick}
			/>
		</div>
	{:else}
		<div class="summary-bar">
			<span>{visibleSchemas().length} schemas</span>
			<span>{visibleSchemas().reduce((sum, row) => sum + row.facet_definition_count, 0)} facet definitions</span>
			<span>{stats.classCount} graph classes</span>
			<span>{stats.relationCount} graph relations</span>
			{#if registry?.source === 'unavailable'}
				<span>registry unavailable</span>
			{/if}
		</div>
		<div class="schema-layout">
			<aside class="schema-list" aria-label="Schema registry">
				{#if registry?.error}
					<p class="warn">{registry.error}</p>
				{/if}
				{#each visibleSchemas() as row}
					<button
						type="button"
						onclick={() =>
							onSelect?.({
								nodeKind: 'schema',
								typeName: row.entity_type,
								payload: row as unknown as Record<string, unknown>
							})}
					>
						<strong>{row.entity_type}</strong>
						<span>{row.schema_id}</span>
						<small>{row.facet_definition_count} facets</small>
					</button>
				{/each}
				{#if visibleSchemas().length === 0}
					<p class="muted">No schema registry rows for this view.</p>
				{/if}
			</aside>
			<div class="schema-graph-panel">
				<div class="graph-toolbar">
					<label><input type="checkbox" bind:checked={showRelations} /> Relations métier</label>
					<label><input type="checkbox" bind:checked={showImportantLabels} /> Labels importants</label>
					<label><input type="checkbox" bind:checked={showAbstract} /> Abstractions</label>
					<label class:disabled={!showAbstract}>
						<input type="checkbox" bind:checked={showIsA} disabled={!showAbstract} />
						Héritage
					</label>
					<span>{stats.classCount} classes · {stats.relationCount} relations · {stats.isACount} is_a</span>
				</div>
				<SchemaGraphView
					nodes={graphNodes}
					edges={graphEdges}
					showEdgeLabels={showImportantLabels}
					onNodeClick={handleNodeClick}
					onEdgeClick={handleEdgeClick}
				/>
			</div>
		</div>
	{/if}
</div>

<style>
	.workspace-model {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		background: #0b0f14;
		font-family: system-ui, sans-serif;
	}
	.model-toolbar,
	.summary-bar,
	.graph-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.55rem 0.85rem;
		padding: 0.45rem 0.75rem;
		border-bottom: 1px solid #1e293b;
		color: #94a3b8;
		font-size: 0.74rem;
	}
	.segmented {
		display: inline-flex;
		border: 1px solid #334155;
		border-radius: 6px;
		overflow: hidden;
	}
	.segmented button {
		border: 0;
		background: #111827;
		color: #cbd5e1;
		padding: 0.3rem 0.65rem;
		cursor: pointer;
	}
	.segmented button.active {
		background: #0ea5e9;
		color: #082f49;
	}
	.select-wrap {
		display: inline-flex;
		align-items: center;
		gap: 0.45rem;
	}
	.select-wrap select {
		background: #1e293b;
		color: #e2e8f0;
		border: 1px solid #334155;
		border-radius: 6px;
		padding: 0.25rem 0.5rem;
	}
	.schema-list {
		overflow: auto;
	}
	p {
		margin: 0;
	}
	.muted,
	.error {
		color: #64748b;
		font-size: 0.76rem;
	}
	.schema-list button {
		text-align: left;
		background: #0f172a;
		border: 1px solid #1e293b;
		color: #cbd5e1;
		border-radius: 6px;
		cursor: pointer;
	}
	.schema-layout {
		flex: 1;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(260px, 340px) minmax(0, 1fr);
	}
	.schema-list {
		border-right: 1px solid #1e293b;
		padding: 0.5rem;
	}
	.schema-list button {
		display: grid;
		width: 100%;
		gap: 0.15rem;
		padding: 0.45rem 0.5rem;
		margin-bottom: 0.35rem;
	}
	.schema-list strong {
		color: #e2e8f0;
		font-size: 0.78rem;
	}
	.schema-list span,
	.schema-list small {
		color: #64748b;
		font-size: 0.68rem;
	}
	.model-graph-panel,
	.schema-graph-panel {
		flex: 1 1 auto;
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.graph-toolbar label {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	.graph-toolbar label.disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.graph-toolbar input {
		accent-color: #38bdf8;
	}
	.warn,
	.error {
		color: #f87171;
		font-size: 0.76rem;
	}
	.muted,
	.error {
		padding: 0.75rem;
	}
</style>
