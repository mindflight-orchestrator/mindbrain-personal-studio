<script lang="ts">
	import {
		type FacetFilter,
		type LegendRow,
		type LegendSection,
		CHANTIER_WEEK_GRAPH_DEPTH,
		PLATFORM_HULL_DEPTH
	} from '$lib/graph/nodeVisuals';

	let {
		legendBlocks = [],
		facetFilter = $bindable(null as FacetFilter | null),
		focusDepth = 2,
		variant = 'all' as 'all' | 'facets' | 'legend'
	}: {
		legendBlocks?: LegendSection[];
		facetFilter?: FacetFilter | null;
		focusDepth?: number;
		variant?: 'all' | 'facets' | 'legend';
	} = $props();

	function isFacetBlock(block: LegendSection): boolean {
		return block.rows.some((row) => row.facetFilter);
	}

	const visibleBlocks = $derived(
		variant === 'all'
			? legendBlocks
			: variant === 'facets'
				? legendBlocks.filter(isFacetBlock)
				: legendBlocks.filter((block) => !isFacetBlock(block))
	);

	function facetFiltersEqual(a: FacetFilter | null, b: FacetFilter | null): boolean {
		if (a === b) return true;
		if (!a || !b) return false;
		if (a.kind !== b.kind) return false;
		if (a.kind === 'scalar' && b.kind === 'scalar') {
			return a.key === b.key && a.value === b.value;
		}
		if (a.kind === 'platform_hull' && b.kind === 'platform_hull') {
			return a.platformId === b.platformId;
		}
		if (a.kind === 'abstraction' && b.kind === 'abstraction') {
			return a.value === b.value;
		}
		if (a.kind === 'chantier_week_neighborhood' && b.kind === 'chantier_week_neighborhood') {
			return a.week === b.week;
		}
		if (a.kind === 'audit_phase_neighborhood' && b.kind === 'audit_phase_neighborhood') {
			return a.phase === b.phase;
		}
		return false;
	}

	function facetFilterLabel(f: FacetFilter): string {
		if (f.kind === 'scalar') return `${f.key} = ${f.value}`;
		if (f.kind === 'abstraction') return `abstraction = ${f.value}`;
		if (f.kind === 'chantier_week_neighborhood') {
			return `week_number = ${f.week} (≤${CHANTIER_WEEK_GRAPH_DEPTH} hops)`;
		}
		if (f.kind === 'audit_phase_neighborhood') return `audit_phase = ${f.phase}`;
		return `hull = ${f.platformId}`;
	}

	function rowFacetActive(row: LegendRow): boolean {
		return !!(row.facetFilter && facetFiltersEqual(facetFilter, row.facetFilter));
	}

	function onFacetRowClick(row: LegendRow) {
		if (!row.facetFilter) return;
		const f = row.facetFilter;
		if (facetFiltersEqual(facetFilter, f)) {
			facetFilter = null;
			return;
		}
		facetFilter = f;
	}

	let expandedBlocks = $state<Set<string>>(new Set());
	let lastAutoOpenedFilter = $state<FacetFilter | null>(null);

	function blockKey(block: LegendSection): string {
		return block.title;
	}

	function isBlockExpanded(key: string): boolean {
		return expandedBlocks.has(key);
	}

	function toggleBlock(block: LegendSection) {
		const key = blockKey(block);
		const next = new Set(expandedBlocks);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		expandedBlocks = next;
	}

	function blockHasActiveFilter(block: LegendSection): boolean {
		return block.rows.some((row) => rowFacetActive(row));
	}

	$effect(() => {
		if (variant !== 'facets') return;
		const filter = facetFilter;
		if (!filter) {
			lastAutoOpenedFilter = null;
			return;
		}
		if (facetFiltersEqual(filter, lastAutoOpenedFilter)) return;
		lastAutoOpenedFilter = filter;
		const keys = visibleBlocks.filter(blockHasActiveFilter).map(blockKey);
		if (keys.length === 0) return;
		expandedBlocks = new Set([...expandedBlocks, ...keys]);
	});
</script>

<div class="legend" aria-label={variant === 'facets' ? 'Graph facets' : 'Graph legend'}>
	{#if variant === 'all' || variant === 'legend'}
		<div class="legend-hint">
			<p class="legend-hint-line">
				<strong>Node</strong>: neighborhood ≤{focusDepth} hops · <strong>Background</strong>: reset selection
			</p>
			{#if variant === 'all'}
				<p class="legend-hint-line">
					<strong>Facet row</strong>: filter graph — chantier weeks use <code>week_number</code> + neighbors
					≤{CHANTIER_WEEK_GRAPH_DEPTH} hops; click the same row again to clear
				</p>
			{/if}
			<p class="legend-hint-line">
				{#if variant === 'all'}
					<strong>Ship</strong>: hull ≤{PLATFORM_HULL_DEPTH} hops ·
				{/if}
				<strong>Links</strong>: edge mode + composition when a node is focused
			</p>
		</div>
	{/if}
	{#if variant === 'all' || variant === 'facets'}
		{#if variant === 'facets'}
			<div class="legend-hint">
				<p class="legend-hint-line">
					<strong>Facet row</strong>: filter graph — chantier weeks use <code>week_number</code> + neighbors
					≤{CHANTIER_WEEK_GRAPH_DEPTH} hops; click the same row again to clear
				</p>
				<p class="legend-hint-line">
					<strong>Ship</strong>: hull ≤{PLATFORM_HULL_DEPTH} hops
				</p>
			</div>
		{/if}
		{#if facetFilter}
			<div class="legend-active" role="status" aria-label="Active facet filter">
				<span>Active filter</span>
				<strong>{facetFilterLabel(facetFilter)}</strong>
				<button type="button" onclick={() => { facetFilter = null; }}>clear</button>
			</div>
		{/if}
	{/if}
	{#if visibleBlocks.length === 0}
		<p class="legend-empty">
			{#if variant === 'facets'}
				No facet dimensions in this graph.
			{:else if variant === 'legend'}
				Load a graph to see ontology and relation colours.
			{:else}
				Load a graph to see ontology and relation facets.
			{/if}
		</p>
	{:else}
		{#each visibleBlocks as block (blockKey(block))}
			<div class="legend-block">
				<button
					type="button"
					class="legend-block-toggle"
					class:legend-block-toggle--active={blockHasActiveFilter(block)}
					aria-expanded={isBlockExpanded(blockKey(block))}
					onclick={() => toggleBlock(block)}
				>
					<span
						class="block-chevron"
						class:expanded={isBlockExpanded(blockKey(block))}
						aria-hidden="true"
					>›</span>
					<span class="legend-block-title">{block.title}</span>
				</button>
				{#if isBlockExpanded(blockKey(block))}
					<div class="legend-block-rows">
						{#each block.rows as row}
							{#if row.facetFilter}
								<button
									type="button"
									class="legend-row legend-row--clickable"
									class:legend-row--active={rowFacetActive(row)}
									onclick={() => onFacetRowClick(row)}
								>
									<span class="swatch" style:background={row.swatch}></span>
									<span class="legend-label">{row.label}</span>
								</button>
							{:else}
								<div class="legend-row">
									<span class="swatch" style:background={row.swatch}></span>
									<span class="legend-label">{row.label}</span>
								</div>
							{/if}
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	{/if}
</div>

<style>
	.legend {
		font-family: system-ui, sans-serif;
		font-size: 0.62rem;
		color: #cbd5e1;
		line-height: 1.35;
	}

	.legend-hint {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		margin: 0 0 0.35rem;
		padding-bottom: 0.35rem;
		border-bottom: 1px solid #334155;
		color: #94a3b8;
		font-size: 0.58rem;
		line-height: 1.35;
	}

	.legend-hint-line {
		margin: 0;
		overflow-wrap: break-word;
		word-break: break-word;
	}

	.legend-hint code {
		font-family: ui-monospace, monospace;
		font-size: 0.85em;
		color: #a5b4fc;
	}

	.legend-empty {
		margin: 0.35rem 0 0;
		color: #64748b;
		font-size: 0.65rem;
	}

	.legend-active {
		display: grid;
		gap: 0.2rem;
		margin: 0 0 0.45rem;
		padding: 0.35rem 0.4rem;
		border-radius: 6px;
		background: rgba(37, 99, 235, 0.18);
		border: 1px solid rgba(96, 165, 250, 0.45);
		color: #bfdbfe;
	}

	.legend-active span {
		font-size: 0.56rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #93c5fd;
	}

	.legend-active strong {
		font-size: 0.64rem;
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	.legend-active button {
		justify-self: start;
		border: none;
		border-radius: 4px;
		padding: 0.12rem 0.35rem;
		background: rgba(15, 23, 42, 0.55);
		color: #dbeafe;
		font: inherit;
		font-size: 0.58rem;
		cursor: pointer;
	}

	.legend-active button:hover {
		background: rgba(30, 41, 59, 0.9);
	}

	.legend-block {
		margin-top: 0.2rem;
	}

	.legend-block-toggle {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		width: 100%;
		margin: 0 -0.15rem;
		padding: 0.2rem 0.15rem;
		border: none;
		border-radius: 4px;
		background: transparent;
		font: inherit;
		text-align: left;
		color: inherit;
		cursor: pointer;
	}

	.legend-block-toggle:hover {
		background: rgba(51, 65, 85, 0.45);
	}

	.legend-block-toggle--active .legend-block-title {
		color: #93c5fd;
	}

	.block-chevron {
		display: inline-block;
		flex-shrink: 0;
		transition: transform 0.15s ease;
		color: #64748b;
		font-size: 0.7rem;
	}

	.block-chevron.expanded {
		transform: rotate(90deg);
	}

	.legend-block-rows {
		padding-left: 0.85rem;
	}

	.legend-block-title {
		font-weight: 600;
		font-size: 0.58rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: #94a3b8;
		margin-bottom: 0.2rem;
	}

	.legend-block-toggle .legend-block-title {
		margin-bottom: 0;
		flex: 1 1 auto;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.legend-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		border-radius: 4px;
		margin: 0 -0.15rem;
		padding: 0.1rem 0.15rem;
		width: 100%;
		box-sizing: border-box;
		border: none;
		background: transparent;
		font: inherit;
		text-align: left;
		color: inherit;
	}

	button.legend-row--clickable {
		cursor: pointer;
		user-select: none;
	}

	.legend-row--clickable:hover {
		background: rgba(51, 65, 85, 0.55);
	}

	.legend-row--active {
		background: rgba(59, 130, 246, 0.2);
		outline: 1px solid rgba(96, 165, 250, 0.55);
	}

	.swatch {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		flex-shrink: 0;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35);
	}

	.legend-label {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
