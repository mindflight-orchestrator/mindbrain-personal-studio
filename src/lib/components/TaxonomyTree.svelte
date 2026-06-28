<script lang="ts">
	type TaxonomyDimension = {
		namespace: string;
		dimension: string;
		value_type: string;
		hierarchy_kind: string;
	};

	type TaxonomyValue = {
		namespace: string;
		dimension: string;
		value_id: number;
		value: string;
		parent_value_id?: number | null;
		label?: string | null;
	};

	let {
		ontologyId,
		workspaceId = '',
		onSelectValue
	}: {
		ontologyId: string;
		workspaceId?: string;
		onSelectValue?: (payload: {
			namespace: string;
			dimension: string;
			value: TaxonomyValue;
		}) => void;
	} = $props();

	let loading = $state(true);
	let error = $state<string | null>(null);
	let dimensions = $state<TaxonomyDimension[]>([]);
	let values = $state<TaxonomyValue[]>([]);
	let expanded = $state<Record<string, boolean>>({});
	let editingKey = $state<string | null>(null);
	let editLabel = $state('');
	let saving = $state(false);

	$effect(() => {
		if (ontologyId) void loadTaxonomy();
	});

	async function loadTaxonomy() {
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams({ ontology_id: ontologyId });
			if (workspaceId.trim()) params.set('workspace_id', workspaceId.trim());
			const res = await fetch(`/api/brain/ontology/taxonomy?${params}`);
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as {
				dimensions?: TaxonomyDimension[];
				values?: TaxonomyValue[];
			};
			dimensions = data.dimensions ?? [];
			values = data.values ?? [];
			for (const dim of dimensions) {
				const key = dimKey(dim.namespace, dim.dimension);
				if (expanded[key] === undefined) expanded[key] = true;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			dimensions = [];
			values = [];
		} finally {
			loading = false;
		}
	}

	function dimKey(namespace: string, dimension: string): string {
		return `${namespace}.${dimension}`;
	}

	function valuesForDimension(namespace: string, dimension: string): TaxonomyValue[] {
		return values.filter((v) => v.namespace === namespace && v.dimension === dimension);
	}

	function buildTree(
		all: TaxonomyValue[],
		parentId: number | null = null,
		depth = 0
	): Array<{ value: TaxonomyValue; depth: number }> {
		const rows: Array<{ value: TaxonomyValue; depth: number }> = [];
		for (const value of all) {
			const parent = value.parent_value_id ?? null;
			if (parent !== parentId) continue;
			rows.push({ value, depth });
			rows.push(...buildTree(all, value.value_id, depth + 1));
		}
		return rows;
	}

	function toggleDimension(key: string) {
		expanded[key] = !expanded[key];
	}

	function startEdit(value: TaxonomyValue) {
		editingKey = `${value.namespace}.${value.dimension}.${value.value_id}`;
		editLabel = value.label ?? value.value;
	}

	async function saveEdit(value: TaxonomyValue) {
		saving = true;
		error = null;
		try {
			const res = await fetch('/api/brain/ontology/taxonomy/value', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					ontology_id: ontologyId,
					namespace: value.namespace,
					dimension: value.dimension,
					value_id: value.value_id,
					value: value.value,
					parent_value_id: value.parent_value_id ?? null,
					label: editLabel.trim() || value.value
				})
			});
			if (!res.ok) throw new Error(await res.text());
			editingKey = null;
			await loadTaxonomy();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	async function addValue(namespace: string, dimension: string) {
		const existing = valuesForDimension(namespace, dimension);
		const nextId =
			existing.reduce((max, v) => Math.max(max, Number(v.value_id) || 0), 0) + 1;
		const raw = window.prompt('New taxonomy value:');
		if (!raw?.trim()) return;
		saving = true;
		error = null;
		try {
			const res = await fetch('/api/brain/ontology/taxonomy/value', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					ontology_id: ontologyId,
					namespace,
					dimension,
					value_id: nextId,
					value: raw.trim(),
					label: raw.trim()
				})
			});
			if (!res.ok) throw new Error(await res.text());
			await loadTaxonomy();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}
</script>

<div class="taxonomy-tree">
	{#if loading}
		<p class="muted">Loading taxonomy…</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else if dimensions.length === 0}
		<p class="muted">
			No SKOS taxonomy dimensions for ontology <code>{ontologyId}</code>.
			{#if workspaceId && workspaceId !== 'immeuble-demo'}
				Try workspace <strong>immeuble-demo</strong> (<code>pnpm load:demo</code> then
				<code>pnpm studio</code>) for a domain with facet dimensions.
			{/if}
		</p>
	{:else}
		{#each dimensions as dim}
			{@const key = dimKey(dim.namespace, dim.dimension)}
			<section class="dimension">
				<button type="button" class="dim-head" onclick={() => toggleDimension(key)}>
					<span class="chevron" class:open={expanded[key]}>▸</span>
					<strong>{key}</strong>
					<span class="meta">{dim.value_type} · {dim.hierarchy_kind}</span>
				</button>
				{#if expanded[key]}
					<ul class="values">
						{#each buildTree(valuesForDimension(dim.namespace, dim.dimension)) as row}
							{@const value = row.value}
							{@const editKey = `${value.namespace}.${value.dimension}.${value.value_id}`}
							<li style="padding-left: {row.depth}rem">
								{#if editingKey === editKey}
									<input bind:value={editLabel} disabled={saving} />
									<button type="button" onclick={() => saveEdit(value)} disabled={saving}>Save</button>
									<button type="button" onclick={() => (editingKey = null)}>Cancel</button>
								{:else}
									<button
										type="button"
										class="value-btn"
										onclick={() =>
											onSelectValue?.({
												namespace: value.namespace,
												dimension: value.dimension,
												value
											})}
									>
										{value.label ?? value.value}
									</button>
									<button type="button" class="icon" onclick={() => startEdit(value)} title="Edit label">
										✎
									</button>
								{/if}
							</li>
						{/each}
						<li>
							<button
								type="button"
								class="add"
								disabled={saving}
								onclick={() => addValue(dim.namespace, dim.dimension)}
							>
								+ Add value
							</button>
						</li>
					</ul>
				{/if}
			</section>
		{/each}
	{/if}
</div>

<style>
	.taxonomy-tree {
		flex: 1;
		overflow: auto;
		padding: 0.5rem 0.75rem;
		font-family: system-ui, sans-serif;
		font-size: 0.82rem;
	}
	.muted {
		color: #64748b;
	}
	.error {
		color: #f87171;
	}
	.dimension + .dimension {
		margin-top: 0.5rem;
	}
	.dim-head {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		width: 100%;
		background: #0f172a;
		border: 1px solid #1e293b;
		color: #e2e8f0;
		border-radius: 6px;
		padding: 0.45rem 0.55rem;
		cursor: pointer;
		text-align: left;
	}
	.chevron {
		transition: transform 0.15s;
		color: #64748b;
	}
	.chevron.open {
		transform: rotate(90deg);
	}
	.meta {
		margin-left: auto;
		font-size: 0.68rem;
		color: #64748b;
	}
	.values {
		list-style: none;
		margin: 0.35rem 0 0;
		padding: 0;
	}
	.values li {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin: 0.2rem 0;
	}
	.value-btn {
		background: transparent;
		border: none;
		color: #cbd5e1;
		cursor: pointer;
		padding: 0.15rem 0;
		text-align: left;
	}
	.value-btn:hover {
		color: #38bdf8;
	}
	.icon,
	.add {
		background: #1e293b;
		border: 1px solid #334155;
		color: #94a3b8;
		border-radius: 4px;
		padding: 0.15rem 0.4rem;
		cursor: pointer;
		font-size: 0.72rem;
	}
	input {
		flex: 1;
		background: #1e293b;
		border: 1px solid #334155;
		color: #e2e8f0;
		border-radius: 4px;
		padding: 0.2rem 0.4rem;
	}
</style>
