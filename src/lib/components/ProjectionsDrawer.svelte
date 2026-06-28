<script lang="ts">
	import {
		artifactKindLabel,
		entityIdsFromUnknown,
		mapPackRows,
		rowMatchesGraphContext,
		rowTitle,
		type GraphContext,
		type ProjectionRow
	} from '$lib/brain/projectionRows';

	let {
		workspaceId = '',
		graphContext = {},
		graphFocused = false,
		onViewInGraph,
		onResetGraph,
		onOpenDetail
	}: {
		workspaceId?: string;
		graphContext?: GraphContext;
		graphFocused?: boolean;
		onViewInGraph?: (entityIds: number[]) => void;
		onResetGraph?: () => void;
		onOpenDetail?: (projectionId: string) => void;
	} = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let rows = $state<ProjectionRow[]>([]);
	let collapsed = $state(true);
	let loadedKey = $state('');
	let selectedKey = $state('');
	let nameFilter = $state('');

	$effect(() => {
		const ws = workspaceId.trim();
		const key = `${ws}:${graphContext.label ?? ''}:${graphContext.entityType ?? ''}`;
		if (ws && key !== loadedKey) void loadProjections(ws, key);
	});

	async function loadProjections(ws: string, key: string) {
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams({
				workspace_id: ws,
				limit: '8'
			});
			const res = await fetch(`/api/projections/catalog?${params}`);
			if (!res.ok) throw new Error(await res.text());
			rows = mapPackRows((await res.json()) as Record<string, unknown>);
			loadedKey = key;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			rows = [];
		} finally {
			loading = false;
		}
	}

	function viewRow(row: ProjectionRow) {
		const ids = graphIdsForRow(row);
		if (ids.length > 0) {
			selectedKey = rowKey(row);
			onViewInGraph?.(ids);
		}
	}

	function rowKey(row: ProjectionRow): string {
		return (
			row.artifact_id ??
			row.projection_id ??
			row.id ??
			(row.entity_id == null ? undefined : String(row.entity_id)) ??
			rowTitle(row)
		);
	}

	function selectRow(row: ProjectionRow) {
		selectedKey = rowKey(row);
	}

	function sourcePlanId(row: ProjectionRow): string | undefined {
		const raw = row.raw;
		const metadata =
			raw.metadata && typeof raw.metadata === 'object'
				? (raw.metadata as Record<string, unknown>)
				: null;
		const value = metadata?.source_plan_id;
		return typeof value === 'string' && value.trim() ? value.trim() : undefined;
	}

	function graphIdsForRow(row: ProjectionRow): number[] {
		const own = row.entity_id != null ? [row.entity_id] : entityIdsFromUnknown(row.raw);
		if (own.length > 0) return own;
		if (!row.artifact_id) return [];
		const linkedSnapshot = rows.find(
			(candidate) =>
				(candidate.artifact_kind ?? candidate.type) === 'answer_snapshot' &&
				sourcePlanId(candidate) === row.artifact_id
		);
		return linkedSnapshot
			? linkedSnapshot.entity_id != null
				? [linkedSnapshot.entity_id]
				: entityIdsFromUnknown(linkedSnapshot.raw)
			: [];
	}

	function rowsToShow(): ProjectionRow[] {
		const focusable = rows.filter((row) => graphIdsForRow(row).length > 0);
		const query = nameFilter.trim().toLowerCase();
		if (!query) return focusable;
		return focusable.filter((row) =>
			[rowTitle(row), row.preview, row.content, row.artifact_kind, row.state, row.status]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()
				.includes(query)
		);
	}

	function status(row: ProjectionRow): string | undefined {
		return row.state ?? row.status ?? row.lifecycle;
	}
</script>

<aside class="drawer" class:collapsed>
	<header>
		<button type="button" class="toggle" onclick={() => (collapsed = !collapsed)}>
			{collapsed ? '▲' : '▼'} Projections
		</button>
		<span class="hint">
			{#if loading}
				Loading…
			{:else if graphContext.label}
				Context: {graphContext.label}
			{:else}
				{workspaceId || 'workspace'}
			{/if}
		</span>
		{#if graphFocused}
			<button type="button" class="reset" onclick={() => onResetGraph?.()}>Reset graph</button>
		{/if}
	</header>
	{#if !collapsed}
		<div class="filter-row">
			<input bind:value={nameFilter} placeholder="Filter projections" aria-label="Filter projections" />
			<span>{rowsToShow().length}</span>
		</div>
		{#if error}
			<p class="error">{error}</p>
		{:else if rowsToShow().length === 0}
			<p class="muted">No graph-focusable projections for this workspace.</p>
		{:else}
			<ul>
				{#each rowsToShow() as row}
					<li
						class:highlight={rowMatchesGraphContext(row, graphContext)}
						class:selected={selectedKey === rowKey(row)}
					>
						<button type="button" class="row-select" onclick={() => viewRow(row)}>
							<span class="row-head">
								<strong>{rowTitle(row)}</strong>
								<span class="tag">{artifactKindLabel(row.artifact_kind ?? row.type)}</span>
								{#if status(row)}
									<span class="tag">{status(row)}</span>
								{/if}
							</span>
							{#if row.preview || row.content}
								<span class="content">{row.preview ?? row.content}</span>
							{/if}
						</button>
						<div class="actions">
							{#if row.artifact_kind === 'answer_snapshot' && row.projection_id}
								<button
									type="button"
									onclick={() => {
										selectRow(row);
										onOpenDetail?.(row.projection_id!);
									}}
								>
									Open snapshot
								</button>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</aside>

<style>
	.drawer {
		flex: 0 0 auto;
		max-height: 40%;
		border-top: 1px solid #1e293b;
		background: #0f172a;
		display: flex;
		flex-direction: column;
		min-height: 0;
		font-family: system-ui, sans-serif;
	}
	.drawer.collapsed {
		max-height: 2.2rem;
		overflow: hidden;
	}
	header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.35rem 0.75rem;
		border-bottom: 1px solid #1e293b;
	}
	.toggle {
		background: transparent;
		border: none;
		color: #38bdf8;
		cursor: pointer;
		font-size: 0.78rem;
		font-weight: 600;
	}
	.hint {
		flex: 1 1 auto;
		font-size: 0.68rem;
		color: #64748b;
	}
	.reset {
		background: #1e293b;
		border: 1px solid #334155;
		color: #e2e8f0;
		border-radius: 4px;
		padding: 0.2rem 0.45rem;
		font-size: 0.68rem;
		cursor: pointer;
	}
	.filter-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0.75rem;
		border-bottom: 1px solid #1e293b;
	}
	.filter-row input {
		flex: 1 1 auto;
		min-width: 0;
		background: #111827;
		border: 1px solid #334155;
		color: #e2e8f0;
		border-radius: 4px;
		padding: 0.25rem 0.4rem;
		font: inherit;
		font-size: 0.7rem;
	}
	.filter-row span {
		color: #64748b;
		font-size: 0.68rem;
		font-variant-numeric: tabular-nums;
	}
	ul {
		list-style: none;
		margin: 0;
		padding: 0.35rem 0.75rem 0.75rem;
		overflow: auto;
	}
	li {
		border: 1px solid #1e293b;
		border-radius: 6px;
		padding: 0.45rem 0.55rem;
		background: #0b0f14;
	}
	li + li {
		margin-top: 0.35rem;
	}
	li.highlight {
		border-color: #0ea5e9;
		box-shadow: 0 0 0 1px rgba(14, 165, 233, 0.25);
	}
	li.selected {
		border-color: #38bdf8;
		background: #102033;
	}
	.row-select {
		display: block;
		width: 100%;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}
	.row-head {
		display: flex;
		flex-wrap: wrap;
		gap: 0.45rem;
		align-items: center;
		font-size: 0.78rem;
	}
	.row-head strong {
		overflow-wrap: anywhere;
	}
	.tag {
		font-size: 0.65rem;
		color: #94a3b8;
	}
	.content {
		display: block;
		margin: 0.25rem 0;
		font-size: 0.72rem;
		color: #cbd5e1;
		overflow-wrap: anywhere;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.actions button {
		background: #1e293b;
		border: 1px solid #334155;
		color: #e2e8f0;
		border-radius: 4px;
		padding: 0.2rem 0.45rem;
		font-size: 0.68rem;
		cursor: pointer;
	}
	.muted,
	.error {
		padding: 0.5rem 0.75rem;
		font-size: 0.72rem;
	}
	.muted {
		color: #64748b;
	}
	.error {
		color: #f87171;
	}
</style>
