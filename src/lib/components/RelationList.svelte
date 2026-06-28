<script lang="ts">
	import {
		fetchInferredRelations,
		fetchOntologyGraph,
		mapOntologyRelationEdges,
		type InferredRelationEdge
	} from '$lib/brain/inferredOntology';

	let {
		ontologyId,
		workspaceId = '',
		onSelectRelation
	}: {
		ontologyId: string;
		workspaceId?: string;
		onSelectRelation?: (typeName: string, payload: Record<string, unknown>) => void;
	} = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let relations = $state<InferredRelationEdge[]>([]);
	let dataSource = $state<'ontology' | 'inferred'>('ontology');

	$effect(() => {
		if (ontologyId || workspaceId) void loadRelations();
	});

	async function loadRelations() {
		loading = true;
		error = null;
		try {
			if (ontologyId) {
				const graph = await fetchOntologyGraph(ontologyId, workspaceId);
				const formal = mapOntologyRelationEdges(graph.edges);
				if (formal.length > 0) {
					relations = formal;
					dataSource = 'ontology';
					return;
				}
			}
			relations = await fetchInferredRelations(workspaceId);
			dataSource = 'inferred';
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			relations = [];
		} finally {
			loading = false;
		}
	}
</script>

<div class="relation-list">
	{#if loading}
		<p class="muted">Loading relations…</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if relations.length === 0}
		<p class="muted">No relation types found for this workspace.</p>
	{:else}
		{#if dataSource === 'inferred'}
			<p class="hint">Inferred from instance subgraph (formal ontology edges are empty).</p>
		{/if}
		<ul>
			{#each relations as rel}
				<li>
					<button type="button" onclick={() => onSelectRelation?.(rel.typeName, rel.payload)}>
						<span class="label">{rel.label}</span>
						<span class="endpoints">{rel.source} → {rel.target}</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.relation-list {
		flex: 1;
		overflow: auto;
		padding: 0.5rem 0.75rem;
		font-family: system-ui, sans-serif;
	}
	.hint {
		margin: 0 0 0.5rem;
		font-size: 0.72rem;
		color: #64748b;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li + li {
		margin-top: 0.35rem;
	}
	button {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		width: 100%;
		background: #0f172a;
		border: 1px solid #1e293b;
		border-radius: 6px;
		padding: 0.45rem 0.6rem;
		cursor: pointer;
		color: #e2e8f0;
		text-align: left;
	}
	button:hover {
		border-color: #a855f7;
	}
	.label {
		font-size: 0.82rem;
		font-weight: 600;
	}
	.endpoints {
		font-size: 0.68rem;
		color: #64748b;
	}
	.muted {
		color: #64748b;
		font-size: 0.82rem;
	}
	.error {
		color: #f87171;
		font-size: 0.82rem;
	}
</style>
