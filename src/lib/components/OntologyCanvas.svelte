<script lang="ts">
	import SchemaGraphView from '$lib/components/SchemaGraphView.svelte';
	import { buildSchemaIndex } from '$lib/brain/schemaIndex';
	import { buildSchemaGraph } from '$lib/brain/schemaGraphModel';
	import type { SchemaGraphEdge, SchemaGraphNode } from '$lib/brain/schemaGraphModel';
	import type { SchemaIndex } from '$lib/brain/schemaIndex';

	let {
		ontologyId,
		workspaceId = 'default',
		onSelect
	}: {
		ontologyId: string;
		workspaceId?: string;
		onSelect?: (payload: {
			nodeKind: string;
			typeName: string;
			payload: Record<string, unknown>;
		}) => void;
	} = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let schemaIndex = $state<SchemaIndex | null>(null);

	let showRelations = $state(true);
	let showImportantLabels = $state(true);
	let showIsA = $state(false);
	let showAbstract = $state(false);

	let graphNodes = $state<SchemaGraphNode[]>([]);
	let graphEdges = $state<SchemaGraphEdge[]>([]);
	let stats = $state({ classCount: 0, relationCount: 0, isACount: 0 });

	$effect(() => {
		if (ontologyId) void loadSchema();
	});

	$effect(() => {
		if (!schemaIndex) {
			graphNodes = [];
			graphEdges = [];
			stats = { classCount: 0, relationCount: 0, isACount: 0 };
			return;
		}
		const graph = buildSchemaGraph(schemaIndex, {
			hideAbstract: !showAbstract,
			showRelations,
			showIsA: showAbstract && showIsA
		});
		graphNodes = graph.nodes;
		graphEdges = graph.edges;
		stats = graph.stats;
	});

	async function loadSchema() {
		loading = true;
		error = null;
		try {
			schemaIndex = await buildSchemaIndex(ontologyId, workspaceId);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			schemaIndex = null;
		} finally {
			loading = false;
		}
	}

	function handleNodeClick(node: SchemaGraphNode) {
		onSelect?.({
			nodeKind: 'entity',
			typeName: node.typeName,
			payload: { typeName: node.typeName, abstract: node.abstract }
		});
	}

	function handleEdgeClick(edge: SchemaGraphEdge) {
		if (edge.kind === 'is_a') {
			onSelect?.({
				nodeKind: 'entity',
				typeName: edge.source.replace(/^entity_type:/, ''),
				payload: { edgeKind: 'is_a', parentType: edge.target.replace(/^entity_type:/, '') }
			});
			return;
		}
		onSelect?.({
			nodeKind: 'edge',
			typeName: edge.edgeType ?? edge.label,
			payload: {
				id: edge.id,
				source: edge.source,
				target: edge.target,
				label: edge.label,
				edgeType: edge.edgeType ?? edge.label
			}
		});
	}
</script>

<div class="ontology-panel">
	{#if loading}
		<p class="muted">Loading schema graph…</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else}
		<div class="toolbar">
			<label class="toggle">
				<input type="checkbox" bind:checked={showRelations} />
				Relations métier
			</label>
			<label class="toggle">
				<input type="checkbox" bind:checked={showImportantLabels} />
				Labels importants
			</label>
			<label class="toggle">
				<input type="checkbox" bind:checked={showAbstract} />
				Abstractions
			</label>
			<label class="toggle" class:disabled={!showAbstract}>
				<input type="checkbox" bind:checked={showIsA} disabled={!showAbstract} />
				Héritage
			</label>
			<span class="stats">
				{stats.classCount} classes · {stats.relationCount} relations · {stats.isACount} is_a
			</span>
		</div>
		<SchemaGraphView
			nodes={graphNodes}
			edges={graphEdges}
			showEdgeLabels={showImportantLabels}
			onNodeClick={handleNodeClick}
			onEdgeClick={handleEdgeClick}
		/>
	{/if}
</div>

<style>
	.ontology-panel {
		height: 100%;
		display: flex;
		flex-direction: column;
		min-height: 0;
		background: #0b0f14;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.65rem 1rem;
		padding: 0.45rem 0.75rem;
		border-bottom: 1px solid #1e293b;
		font-family: system-ui, sans-serif;
		font-size: 0.72rem;
		color: #94a3b8;
	}
	.toggle {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		cursor: pointer;
		user-select: none;
	}
	.toggle input {
		accent-color: #38bdf8;
	}
	.toggle.disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.stats {
		margin-left: auto;
		color: #64748b;
		font-variant-numeric: tabular-nums;
	}
	.muted,
	.error {
		padding: 1rem;
		font-family: system-ui, sans-serif;
		font-size: 0.85rem;
	}
	.muted {
		color: #64748b;
	}
	.error {
		color: #f87171;
	}
</style>
