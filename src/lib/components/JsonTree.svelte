<script lang="ts">
	import { Tree } from '@keenmate/svelte-treeview';
	import '@keenmate/svelte-treeview/styles.css';

	type JsonTreeRow = {
		id: string;
		path: string;
		key: string;
		value: string;
		type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
		count?: number;
	};

	let { value, expandLevel = 2 }: { value: unknown; expandLevel?: number } = $props();

	function typeOf(value: unknown): JsonTreeRow['type'] {
		if (value === null) return 'null';
		if (Array.isArray(value)) return 'array';
		if (typeof value === 'object') return 'object';
		if (typeof value === 'string') return 'string';
		if (typeof value === 'number') return 'number';
		if (typeof value === 'boolean') return 'boolean';
		return 'string';
	}

	function pathPart(part: string): string {
		return part.replaceAll('.', '\\.');
	}

	function scalarLabel(value: unknown): string {
		if (typeof value === 'string') return JSON.stringify(value);
		if (value === undefined) return 'undefined';
		return String(value);
	}

	function branchLabel(value: unknown): { value: string; count: number } {
		if (Array.isArray(value)) return { value: value.length === 0 ? '[]' : `Array(${value.length})`, count: value.length };
		if (value && typeof value === 'object') {
			const count = Object.keys(value).length;
			return { value: count === 0 ? '{}' : `Object(${count})`, count };
		}
		return { value: scalarLabel(value), count: 0 };
	}

	function appendRows(rows: JsonTreeRow[], key: string, value: unknown, path: string) {
		const type = typeOf(value);
		const branch = branchLabel(value);
		rows.push({
			id: path,
			path,
			key,
			value: type === 'object' || type === 'array' ? branch.value : scalarLabel(value),
			type,
			count: branch.count
		});

		if (Array.isArray(value)) {
			value.forEach((item, index) => appendRows(rows, `[${index}]`, item, `${path}.${index}`));
			return;
		}
		if (value && typeof value === 'object') {
			for (const [childKey, childValue] of Object.entries(value)) {
				appendRows(rows, childKey, childValue, `${path}.${pathPart(childKey)}`);
			}
		}
	}

	function toRows(value: unknown): JsonTreeRow[] {
		const rows: JsonTreeRow[] = [];
		appendRows(rows, 'root', value, 'root');
		return rows;
	}

	let rows = $derived(toRows(value));
</script>

<div class="json-tree">
	<Tree
		data={rows}
		idMember="id"
		pathMember="path"
		displayValueMember="key"
		{expandLevel}
		clickBehavior="expand-and-focus"
		dragDropMode="none"
	>
		{#snippet nodeTemplate(node: import('@keenmate/svelte-treeview').LTreeNode<JsonTreeRow>)}
			{@const row = node.data}
			{#if row}
				<div class="json-row" class:branch={row.type === 'object' || row.type === 'array'}>
					<span class="json-key">{row.key}</span>
					<span class="json-separator">:</span>
					<span class="json-value" class:type-string={row.type === 'string'} class:type-number={row.type === 'number'} class:type-boolean={row.type === 'boolean'} class:type-null={row.type === 'null'}>
						{row.value}
					</span>
				</div>
			{/if}
		{/snippet}
	</Tree>
</div>

<style>
	.json-tree {
		margin-top: 0.75rem;
		border: 1px solid #1e293b;
		border-radius: 8px;
		background: #0f172a;
		padding: 0.45rem;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		color: #e2e8f0;
		--ltree-body-color: #e2e8f0;
		--ltree-light: #1e293b;
		--ltree-border: #334155;
		--ltree-primary: #0ea5e9;
		--ltree-primary-rgb: 14, 165, 233;
		--ltree-highlight-bg: #102033;
		--ltree-highlight-color: #e0f2fe;
	}
	.json-tree :global(.ltree-tree) {
		color: #e2e8f0;
	}
	.json-tree :global(.ltree-node-content) {
		padding: 2px 5px;
	}
	.json-tree :global(.ltree-node-content:hover) {
		background-color: #172033;
	}
	.json-tree :global(.ltree-children) {
		margin-top: 0;
	}
	:global(.json-tree .ltree-node) {
		font-size: 0.7rem;
		line-height: 1.45;
	}
	.json-row {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.json-key {
		color: #93c5fd;
		font-weight: 650;
	}
	.json-separator,
	.json-row.branch .json-value {
		color: #64748b;
	}
	.json-value {
		color: #cbd5e1;
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.type-string {
		color: #86efac;
	}
	.type-number {
		color: #fbbf24;
	}
	.type-boolean {
		color: #f0abfc;
	}
	.type-null {
		color: #94a3b8;
		font-style: italic;
	}
</style>
