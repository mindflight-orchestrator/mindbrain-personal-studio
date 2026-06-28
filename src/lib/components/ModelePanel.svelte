<script lang="ts">
	import WorkspaceModelView from '$lib/components/WorkspaceModelView.svelte';
	import { ALL_ONTOLOGIES, type OntologySummaryRow } from '$lib/brain/ontologyInspect';

	let {
		ontologyId,
		workspaceId = '',
		ontologies = [],
		onSelect
	}: {
		ontologyId: string;
		workspaceId?: string;
		ontologies?: OntologySummaryRow[];
		onSelect?: (payload: {
			nodeKind: string;
			typeName: string;
			payload: Record<string, unknown>;
		}) => void;
	} = $props();
</script>

<div class="modele-panel">
	<div class="body">
		{#if !ontologyId || ontologies.length === 0}
			<p class="muted">Select an ontology to explore the model.</p>
		{:else}
			<WorkspaceModelView
				{workspaceId}
				{ontologies}
				selectedOntologyId={ontologyId || ALL_ONTOLOGIES}
				{onSelect}
			/>
		{/if}
	</div>
</div>

<style>
	.modele-panel {
		height: 100%;
		display: flex;
		flex-direction: column;
		min-height: 0;
		background: #0b0f14;
	}
	.body {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}
	.muted {
		padding: 1rem;
		color: #64748b;
		font-family: system-ui, sans-serif;
		font-size: 0.82rem;
	}
</style>
