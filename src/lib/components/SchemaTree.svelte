<script lang="ts">
	import { Tree } from '@keenmate/svelte-treeview';
	import type { ContextMenuEntry, LTreeNode } from '@keenmate/svelte-treeview';
	import '@keenmate/svelte-treeview/styles.css';
	import { buildSchemaIndex } from '$lib/brain/schemaIndex';
	import { toLTreeRows, type SchemaTreeRow } from '$lib/brain/schemaTreeAdapter';

	let {
		ontologyId,
		workspaceId = '',
		onSelectType,
		onAddProperty,
		onAddRelation
	}: {
		ontologyId: string;
		workspaceId?: string;
		onSelectType?: (typeName: string, payload: Record<string, unknown>) => void;
		onAddProperty?: (classTypeName: string) => void;
		onAddRelation?: (classTypeName: string) => void;
	} = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let rows = $state.raw<SchemaTreeRow[]>([]);

	$effect(() => {
		if (ontologyId) void loadTree();
	});

	async function loadTree() {
		loading = true;
		error = null;
		try {
			const index = await buildSchemaIndex(ontologyId, workspaceId);
			rows = toLTreeRows(index);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			rows = [];
		} finally {
			loading = false;
		}
	}

	function handleNodeClick(node: LTreeNode<SchemaTreeRow>) {
		const row = node.data;
		if (!row) return;
		if (row.kind === 'relation' && row.edgeType) {
			onSelectType?.(row.edgeType, {
				...row,
				nodeKind: 'edge',
				sourceType: row.typeName,
				targetType: row.targetType
			});
			return;
		}
		if (row.kind === 'class') {
			onSelectType?.(row.typeName, { ...row, nodeKind: 'entity' });
		}
	}

	function contextMenuCallback(
		node: LTreeNode<SchemaTreeRow>,
		closeMenu: () => void
	): ContextMenuEntry[] {
		const row = node.data;
		if (!row || row.kind !== 'class') return [];
		return [
			{
				label: 'Add property',
				onclick: () => {
					onAddProperty?.(row.typeName);
					closeMenu();
				}
			},
			{
				label: 'Add relation',
				onclick: () => {
					onAddRelation?.(row.typeName);
					closeMenu();
				}
			}
		];
	}

	export function reload() {
		void loadTree();
	}
</script>

<div class="schema-tree">
	{#if loading}
		<p class="muted">Loading schema tree…</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if rows.length === 0}
		<p class="muted">No schema nodes for this ontology.</p>
	{:else}
		<Tree
			data={rows}
			idMember="id"
			pathMember="path"
			displayValueMember="name"
			expandLevel={2}
			clickBehavior="expand-and-focus"
			getContextMenuItemsCallback={contextMenuCallback}
			onNodeClick={handleNodeClick}
		>
			{#snippet nodeTemplate(node: import('@keenmate/svelte-treeview').LTreeNode<SchemaTreeRow>)}
				{@const row = node.data}
				{#if row}
					<div
						class="node-row"
						class:abstract={row.abstract}
						class:relation={row.kind === 'relation'}
					>
						<span class="node-label">{row.name}</span>
						{#if row.kind === 'relation'}
							<span class="badge badge-relation">edge</span>
						{:else if row.abstract}
							<span class="badge badge-abstract">abstract</span>
						{/if}
					</div>
				{/if}
			{/snippet}
		</Tree>
	{/if}
</div>

<style>
	.schema-tree {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 0.35rem 0.5rem;
		font-family: system-ui, sans-serif;
		color: #e2e8f0;
		--ltree-body-color: #e2e8f0;
		--ltree-light: #1e293b;
		--ltree-border: #334155;
		--ltree-primary: #6366f1;
		--ltree-primary-rgb: 99, 102, 241;
		--ltree-highlight-bg: #312e81;
		--ltree-highlight-color: #eef2ff;
	}
	.schema-tree :global(.ltree-tree) {
		color: #e2e8f0;
	}
	.schema-tree :global(.ltree-node-content:hover) {
		background-color: #1e293b;
	}
	.schema-tree :global(.ltree-node-content) {
		padding: 2px 6px;
	}
	.schema-tree :global(.ltree-children) {
		margin-top: 0;
	}
	:global(.schema-tree .ltree-node) {
		font-size: 0.78rem;
	}
	.node-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
		color: #e2e8f0;
	}
	.node-row.relation .node-label {
		color: #c4b5fd;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.72rem;
	}
	.node-row.abstract .node-label {
		color: #94a3b8;
		font-style: italic;
	}
	.node-label {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		color: #e2e8f0;
	}
	.badge {
		font-size: 0.62rem;
		padding: 0.05rem 0.35rem;
		border-radius: 999px;
		border: 1px solid #334155;
		flex-shrink: 0;
	}
	.badge-relation {
		color: #c4b5fd;
		border-color: #7c3aed;
	}
	.badge-abstract {
		color: #94a3b8;
		border-color: #475569;
	}
	.muted {
		padding: 0.75rem;
		color: #64748b;
		font-size: 0.82rem;
	}
	.error {
		padding: 0.75rem;
		color: #f87171;
		font-size: 0.82rem;
	}
</style>
