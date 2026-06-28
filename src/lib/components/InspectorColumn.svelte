<script lang="ts">
	import SearchBar from '$lib/components/SearchBar.svelte';
	import GraphLegend from '$lib/components/GraphLegend.svelte';
	import InspectorPanel from '$lib/components/InspectorPanel.svelte';
	import { LAYOUT_TEMPLATES, type LayoutTemplateId } from '$lib/graph/layoutTemplates';
	import type { EdgeLinkMode } from '$lib/graph/edgeLinkModes';
	import type { FacetFilter, LegendSection } from '$lib/graph/nodeVisuals';

	type OntologyRow = { id: string; nodeCount: number; label?: string | null };

	type InspectorSelection =
		| { kind: 'entity'; entityId: number; entityType: string; label: string }
		| { kind: 'relation'; relationId: number; relationType: string }
		| { kind: 'ontology'; nodeKind: string; typeName: string; payload?: Record<string, unknown> }
		| null;

	type SectionState = {
		search: boolean;
		display: boolean;
		facets: boolean;
		legend: boolean;
		selection: boolean;
	};

	let {
		open = $bindable(false),
		sections = $bindable({
			search: true,
			display: false,
			facets: false,
			legend: false,
			selection: true
		} as SectionState),
		showGraphTools = false,
		brainOnline = false,
		selection = $bindable(null as InspectorSelection),
		ontologyId = '',
		workspaceId = '',
		onOpenType,
		ontologyKey = $bindable('all'),
		layoutTemplate = $bindable('circular_force' as LayoutTemplateId),
		edgeLinkMode = $bindable('all' as EdgeLinkMode),
		topK = $bindable('30'),
		ontologies = [] as OntologyRow[],
		ontologyLabel,
		onOntologyChange,
		filterEntityType,
		onSeeds,
		legendBlocks = [] as LegendSection[],
		facetFilter = $bindable(null as FacetFilter | null)
	}: {
		open?: boolean;
		sections?: SectionState;
		showGraphTools?: boolean;
		brainOnline?: boolean;
		selection?: InspectorSelection;
		ontologyId?: string;
		workspaceId?: string;
		onOpenType?: (typeName: string, nodeKind: string) => void;
		ontologyKey?: string;
		layoutTemplate?: LayoutTemplateId;
		edgeLinkMode?: EdgeLinkMode;
		topK?: string;
		ontologies?: OntologyRow[];
		ontologyLabel?: (id: string) => string;
		onOntologyChange?: (ev: Event) => void;
		filterEntityType?: () => string | null;
		onSeeds?: (ids: number[]) => void;
		legendBlocks?: LegendSection[];
		facetFilter?: FacetFilter | null;
	} = $props();

	function toggleSection(key: keyof SectionState) {
		sections = { ...sections, [key]: !sections[key] };
	}
</script>

<aside class="shell" class:open aria-label="Inspector sidebar">
	<button
		type="button"
		class="rail"
		class:active={open}
		onclick={() => (open = !open)}
		aria-expanded={open}
		aria-controls="inspector-panel"
	>
		<span class="rail-label">Inspector</span>
		<span class="rail-chevron" aria-hidden="true">{open ? '▸' : '◂'}</span>
	</button>

	{#if open}
		<div id="inspector-panel" class="panel">
			<div class="sections">
		<div class="sections-upper">
		{#if showGraphTools && brainOnline}
			<section class="collapsible">
				<button type="button" class="section-toggle" onclick={() => toggleSection('search')}>
					<span class="chevron" class:expanded={sections.search} aria-hidden="true">›</span>
					Search
				</button>
				{#if sections.search}
					<div class="section-body">
						<SearchBar
							workspaceId={workspaceId.trim() || 'default'}
							entityType={filterEntityType?.() ?? null}
							{onSeeds}
						/>
					</div>
				{/if}
			</section>

			<section class="collapsible">
				<button type="button" class="section-toggle" onclick={() => toggleSection('display')}>
					<span class="chevron" class:expanded={sections.display} aria-hidden="true">›</span>
					Display
				</button>
				{#if sections.display}
					<div class="section-body display-fields">
						<label class="field">
							<span class="field-label">Filter type</span>
							<select
								class="select"
								value={ontologyKey}
								onchange={onOntologyChange}
								aria-label="Filter type"
							>
								<option value="all">{ontologyLabel?.('all') ?? 'All entity types'}</option>
								{#each ontologies as o}
									<option value={o.id}>{ontologyLabel?.(o.id) ?? o.id} ({o.nodeCount})</option>
								{/each}
							</select>
						</label>
						<label class="field">
							<span class="field-label">Layout</span>
							<select class="select" bind:value={layoutTemplate} aria-label="Graph layout template">
								{#each LAYOUT_TEMPLATES as t}
									<option value={t.id}>{t.label}</option>
								{/each}
							</select>
						</label>
						<label class="field">
							<span class="field-label">Links</span>
							<select class="select" bind:value={edgeLinkMode} aria-label="Edge link semantics">
								<option value="all">All edge types</option>
								<option value="composition">Composition</option>
								<option value="discovery">Discovery</option>
							</select>
						</label>
						<label class="field">
							<span class="field-label">TopK</span>
							<select class="select" bind:value={topK} aria-label="Maximum links per source node">
								<option value="10">10 per source</option>
								<option value="30">30 per source</option>
								<option value="100">100 per source</option>
								<option value="none">All links</option>
							</select>
						</label>
					</div>
				{/if}
			</section>

			<section class="collapsible">
				<button type="button" class="section-toggle" onclick={() => toggleSection('legend')}>
					<span class="chevron" class:expanded={sections.legend} aria-hidden="true">›</span>
					Legend
				</button>
				{#if sections.legend}
					<div class="section-body">
						<GraphLegend {legendBlocks} bind:facetFilter variant="legend" />
					</div>
				{/if}
			</section>
		{/if}

		<section class="collapsible">
			<button type="button" class="section-toggle" onclick={() => toggleSection('selection')}>
				<span class="chevron" class:expanded={sections.selection} aria-hidden="true">›</span>
				Selection
			</button>
			{#if sections.selection}
				<div class="section-body selection-body">
					<InspectorPanel embedded bind:selection {ontologyId} {workspaceId} {onOpenType} />
				</div>
			{/if}
		</section>
		</div>

		{#if showGraphTools && brainOnline}
			<section class="collapsible collapsible-grow" class:expanded={sections.facets}>
				<button type="button" class="section-toggle" onclick={() => toggleSection('facets')}>
					<span class="chevron" class:expanded={sections.facets} aria-hidden="true">›</span>
					Facets
				</button>
				{#if sections.facets}
					<div class="section-body grow-body">
						<GraphLegend {legendBlocks} bind:facetFilter variant="facets" />
					</div>
				{/if}
			</section>
		{/if}
			</div>
		</div>
	{/if}
</aside>

<style>
	.shell {
		display: flex;
		flex-direction: row;
		height: 100%;
		min-height: 0;
		min-width: 0;
		font-family: system-ui, sans-serif;
		color: #e2e8f0;
	}

	.rail {
		flex: 0 0 2.25rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: flex-start;
		gap: 0.35rem;
		padding: 0.65rem 0.2rem;
		border: none;
		border-left: 1px solid #1e293b;
		background: #0f172a;
		cursor: pointer;
		color: #94a3b8;
		font-size: 0.68rem;
		font-weight: 600;
		writing-mode: vertical-rl;
		text-orientation: mixed;
	}

	.rail:hover,
	.rail.active {
		background: #1e293b;
		color: #e2e8f0;
	}

	.rail-label {
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.rail-chevron {
		font-size: 0.75rem;
		color: #64748b;
		writing-mode: horizontal-tb;
	}

	.panel {
		width: 22rem;
		min-width: 22rem;
		display: flex;
		flex-direction: column;
		min-height: 0;
		border-left: 1px solid #1e293b;
		background: #0f172a;
	}

	.sections {
		flex: 1 1 auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sections-upper {
		flex: 0 1 auto;
		min-height: 0;
		overflow: auto;
	}

	.collapsible + .collapsible,
	.sections-upper + .collapsible {
		border-top: 1px solid #1e293b;
	}

	.collapsible-grow {
		flex: 1 1 auto;
		min-height: 0;
		display: flex;
		flex-direction: column;
	}

	.collapsible-grow:not(.expanded) {
		flex: 0 0 auto;
	}

	.section-toggle {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		width: 100%;
		padding: 0.55rem 0.75rem;
		border: none;
		background: transparent;
		color: #94a3b8;
		font-size: 0.72rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		cursor: pointer;
		text-align: left;
	}

	.section-toggle:hover {
		background: rgba(30, 41, 59, 0.55);
		color: #cbd5e1;
	}

	.chevron {
		display: inline-block;
		transition: transform 0.15s ease;
		color: #64748b;
	}

	.chevron.expanded {
		transform: rotate(90deg);
	}

	.section-body {
		padding: 0 0.75rem 0.75rem;
	}

	.section-body :global(.search) {
		padding: 0;
		border-bottom: none;
		background: transparent;
	}

	.section-body :global(.search input) {
		min-width: 0;
		flex: 1 1 8rem;
	}

	.section-body :global(.results),
	.section-body :global(.search-error) {
		padding-left: 0;
		padding-right: 0;
		background: transparent;
	}

	.display-fields {
		display: flex;
		flex-direction: column;
		gap: 0.55rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.field-label {
		font-size: 0.62rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: #64748b;
	}

	.select {
		appearance: none;
		background: #1e293b;
		color: #e2e8f0;
		border: 1px solid #334155;
		border-radius: 6px;
		padding: 0.35rem 0.5rem;
		font-size: 0.78rem;
		cursor: pointer;
		width: 100%;
		box-sizing: border-box;
	}

	.grow-body {
		flex: 1 1 auto;
		min-height: 0;
		overflow: auto;
	}

	.selection-body :global(.inspector) {
		padding: 0;
		border-left: none;
		background: transparent;
	}
</style>
