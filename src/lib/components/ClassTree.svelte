<script lang="ts">
	import SchemaTree from '$lib/components/SchemaTree.svelte';
	import SchemaPropertyEditor from '$lib/components/SchemaPropertyEditor.svelte';

	let {
		ontologyId,
		workspaceId = '',
		onSelectType
	}: {
		ontologyId: string;
		workspaceId?: string;
		onSelectType?: (typeName: string, payload: Record<string, unknown>) => void;
	} = $props();

	let treeRef = $state<{ reload?: () => void } | null>(null);
	let editorClass = $state<string | null>(null);
	let editorKind = $state<'datatype' | 'object'>('datatype');

	function openEditor(classType: string, kind: 'datatype' | 'object' = 'datatype') {
		editorClass = classType;
		editorKind = kind;
	}

	function closeEditor() {
		editorClass = null;
	}

	function handleSaved() {
		closeEditor();
		treeRef?.reload?.();
	}
</script>

<div class="class-tree">
	{#if editorClass}
		<SchemaPropertyEditor
			{ontologyId}
			domainClass={editorClass}
			kind={editorKind}
			onSaved={handleSaved}
			onCancel={closeEditor}
		/>
	{/if}
	<SchemaTree
		bind:this={treeRef}
		{ontologyId}
		{workspaceId}
		{onSelectType}
		onAddProperty={(classType) => openEditor(classType, 'datatype')}
		onAddRelation={(classType) => openEditor(classType, 'object')}
	/>
</div>

<style>
	.class-tree {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
</style>
