<script lang="ts">
	import { onMount } from 'svelte';
	import GraphCanvas from '$lib/components/GraphCanvas.svelte';
	import ModelePanel from '$lib/components/ModelePanel.svelte';
	import InspectorColumn from '$lib/components/InspectorColumn.svelte';
	import ProjectionsPanel from '$lib/components/ProjectionsPanel.svelte';
	import ProjectionsDrawer from '$lib/components/ProjectionsDrawer.svelte';
	import RulesPanel from '$lib/components/RulesPanel.svelte';
	import type { GraphContext } from '$lib/brain/projectionRows';
	import type { FacetFilter, LegendSection } from '$lib/graph/nodeVisuals';
	import { type LayoutTemplateId } from '$lib/graph/layoutTemplates';
	import type { EdgeLinkMode } from '$lib/graph/edgeLinkModes';
	import { pickWorkspaceGraphOntologyId } from '$lib/brain/workspaceGraphOntology';
	import { ALL_ONTOLOGIES } from '$lib/brain/ontologyInspect';

	type TabId = 'modele' | 'donnees' | 'projections' | 'rules';
	type OntologyRow = { id: string; nodeCount: number; label?: string | null };
	type GraphWorkspaceRow = {
		id: string;
		entityCount: number;
		label?: string | null;
		defaultOntologyId?: string | null;
	};
	type InspectorSelection =
		| { kind: 'entity'; entityId: number; entityType: string; label: string }
		| { kind: 'relation'; relationId: number; relationType: string }
		| { kind: 'ontology'; nodeKind: string; typeName: string; payload?: Record<string, unknown> }
		| null;

	let activeTab = $state<TabId>('donnees');
	let ontologyKey = $state('all');
	let layoutTemplate = $state<LayoutTemplateId>('circular_force');
	let edgeLinkMode = $state<EdgeLinkMode>('all');
	let workspaceId = $state('');
	let ontologyId = $state('');
	let topK = $state('30');
	let graphWorkspaces = $state<GraphWorkspaceRow[]>([]);
	let ontologies = $state<OntologyRow[]>([]);
	let brainOntologies = $state<
		Array<{ ontology_id: string; name: string; source_kind?: string }>
	>([]);
	let ontologiesError = $state<string | null>(null);
	let brainOnline = $state<boolean | null>(null);
	let dataSource = $state<'brain' | 'sqlite-demo'>('brain');
	let inspectorSelection = $state<InspectorSelection>(null);
	let brainSeedIds = $state<number[]>([]);
	let projectionDetailId = $state('');
	let inspectorOpen = $state(false);
	let inspectorSections = $state({
		search: true,
		display: false,
		facets: false,
		legend: false,
		selection: true
	});
	let graphFacetFilter = $state<FacetFilter | null>(null);
	let graphLegendBlocks = $state<LegendSection[]>([]);

	let effectiveTopK = $derived(topK === 'none' ? null : Number(topK));
	let effectiveGraphDataSource = $derived(
		workspaceId.trim() === 'immeuble-demo' ? 'sqlite-demo' : dataSource
	);
	let effectiveInspectorOntologyId = $derived.by(() => {
		const sel = inspectorSelection;
		if (sel?.kind === 'ontology' && sel.payload?.ontology_id) {
			return String(sel.payload.ontology_id);
		}
		return ontologyId === ALL_ONTOLOGIES ? '' : ontologyId;
	});

	let graphContext = $derived.by((): GraphContext => {
		const sel = inspectorSelection;
		if (!sel) return {};
		if (sel.kind === 'entity') {
			return { entityId: sel.entityId, entityType: sel.entityType, label: sel.label };
		}
		if (sel.kind === 'relation') {
			return { relationType: sel.relationType };
		}
		return {};
	});

	async function loadBrainHealth() {
		try {
			const r = await fetch('/api/brain/health');
			if (!r.ok) throw new Error(r.statusText);
			const d = (await r.json()) as { online: boolean; mode: 'brain' | 'sqlite-demo' };
			brainOnline = d.online;
			dataSource = d.mode;
			if (dataSource === 'brain' && d.online) {
				await loadBrainWorkspaceState();
			} else {
				await loadOntologies();
			}
		} catch {
			brainOnline = false;
			await loadOntologies();
		}
	}

	async function loadOntologies() {
		ontologiesError = null;
		try {
			const q = new URLSearchParams();
			if (workspaceId) q.set('workspace', workspaceId);
			const r = await fetch(`/api/graph/ontologies?${q}`);
			if (!r.ok) throw new Error(r.statusText);
			const d = (await r.json()) as {
				ontologies: OntologyRow[];
				graphWorkspaces?: GraphWorkspaceRow[];
			};
			ontologies = d.ontologies ?? [];
			graphWorkspaces = d.graphWorkspaces ?? [];
			if (workspaceId && !graphWorkspaces.some((w) => w.id === workspaceId)) {
				workspaceId = '';
			}
			if (ontologyKey !== 'all' && !ontologies.some((o) => o.id === ontologyKey)) {
				ontologyKey = 'all';
			}
		} catch (e) {
			ontologiesError = e instanceof Error ? e.message : String(e);
		}
	}

	function pickPreferredWorkspace(
		rows: GraphWorkspaceRow[],
		current: string
	): string {
		if (current && rows.some((w) => w.id === current)) return current;
		const withOntology = rows.filter((w) => w.defaultOntologyId);
		const byEntities = [...rows].sort((a, b) => b.entityCount - a.entityCount);
		return (
			rows.find((w) => w.id === 'immeuble-demo')?.id ??
			withOntology.find((w) => w.entityCount > 0)?.id ??
			byEntities.find((w) => w.entityCount > 0)?.id ??
			withOntology[0]?.id ??
			rows.find((w) => w.id !== 'default')?.id ??
			rows[0]?.id ??
			''
		);
	}

	async function fetchBrainOntologyPicker(ws: string) {
		const r = await fetch(`/api/graph/ontologies?workspace=${encodeURIComponent(ws)}`);
		if (!r.ok) throw new Error(await r.text());
		const d = (await r.json()) as {
			ontologies: OntologyRow[];
			graphWorkspaces?: GraphWorkspaceRow[];
		};
		ontologies = d.ontologies ?? [];
		if (d.graphWorkspaces?.length) graphWorkspaces = d.graphWorkspaces;
	}

	async function loadBrainOntologies() {
		if (brainOnline !== true) {
			brainOntologies = [];
			ontologyId = '';
			return;
		}
		try {
			const ws = workspaceId.trim();
			if (!ws) {
				brainOntologies = [];
				ontologyId = '';
				return;
			}
			const r = await fetch(
				`/api/brain/ontology/list?workspace_id=${encodeURIComponent(ws)}`
			);
			if (!r.ok) throw new Error(await r.text());
			const d = (await r.json()) as {
				default_ontology_id?: string | null;
				ontologies: Array<{ ontology_id: string; name: string; source_kind?: string }>;
			};
			const workspacePrefix = `${ws}::`;
			brainOntologies = (d.ontologies ?? []).filter(
				(row) => row.ontology_id === ws || row.ontology_id.startsWith(workspacePrefix)
			);
			const configuredDefault =
				(d.default_ontology_id === ws || d.default_ontology_id?.startsWith(workspacePrefix)
					? d.default_ontology_id
					: null) ??
				graphWorkspaces.find((w) => w.id === ws)?.defaultOntologyId ??
				null;
			const preferred = pickWorkspaceGraphOntologyId(
				ws,
				brainOntologies,
				configuredDefault
			);
			ontologyId =
				ontologyId === ALL_ONTOLOGIES || brainOntologies.some((o) => o.ontology_id === ontologyId)
					? ontologyId || ALL_ONTOLOGIES
					: brainOntologies.length > 1
						? ALL_ONTOLOGIES
						: preferred;
		} catch {
			brainOntologies = [];
			ontologyId = '';
		}
	}

	async function loadBrainWorkspaceState() {
		ontologiesError = null;
		try {
			const r = await fetch('/api/graph/ontologies');
			if (!r.ok) throw new Error(await r.text());
			const d = (await r.json()) as {
				ontologies: OntologyRow[];
				graphWorkspaces?: GraphWorkspaceRow[];
			};
			graphWorkspaces = d.graphWorkspaces ?? [];
			const next = pickPreferredWorkspace(graphWorkspaces, workspaceId.trim());
			if (next && workspaceId !== next) workspaceId = next;
			if (next) await fetchBrainOntologyPicker(next);
			else ontologies = d.ontologies ?? [];
			await loadBrainOntologies();
		} catch (e) {
			ontologiesError = e instanceof Error ? e.message : String(e);
			graphWorkspaces = [];
			ontologies = [];
			brainOntologies = [];
			ontologyId = '';
		}
	}

	function onWorkspaceChange(ev: Event) {
		const el = ev.currentTarget as HTMLSelectElement;
		workspaceId = el.value;
		ontologyKey = 'all';
		brainSeedIds = [];
		inspectorSelection = null;
		if (dataSource === 'brain' && brainOnline === true) {
			void (async () => {
				await fetchBrainOntologyPicker(workspaceId);
				await loadBrainOntologies();
			})();
		} else {
			void loadOntologies();
		}
	}

	function onOntologyChange(ev: Event) {
		const el = ev.currentTarget as HTMLSelectElement;
		ontologyKey = el.value;
	}

	function onBrainOntologyChange(ev: Event) {
		const el = ev.currentTarget as HTMLSelectElement;
		ontologyId = el.value;
	}

	function ontologyLabel(id: string): string {
		if (id === 'all') return 'All entity types';
		const known = ontologies.find((o) => o.id === id);
		if (known?.label) return known.label;
		if (id.toLowerCase().startsWith('type:')) return id.slice(5);
		return id;
	}

	function filterEntityType(): string | null {
		if (ontologyKey === 'all') return null;
		return ontologyLabel(ontologyKey);
	}

	function focusInspectorSelection(next: InspectorSelection) {
		inspectorSelection = next;
		inspectorOpen = true;
		if (next) {
			inspectorSections = { ...inspectorSections, selection: true };
		}
	}

	function openTypeInModele(typeName: string, nodeKind: string) {
		activeTab = 'modele';
		focusInspectorSelection({ kind: 'ontology', nodeKind, typeName });
	}

	function viewProjectionInGraph(entityIds: number[]) {
		activeTab = 'donnees';
		brainSeedIds = entityIds;
	}

	function viewRulesInGraph(entityIds: number[]) {
		activeTab = 'donnees';
		brainSeedIds = entityIds;
	}

	function resetProjectionGraph() {
		brainSeedIds = [];
		inspectorSelection = null;
	}

	function openProjectionDetail(id: string) {
		projectionDetailId = id;
		activeTab = 'projections';
	}

	onMount(() => {
		void loadBrainHealth();
	});
</script>

<main class="page">
	<header class="bar">
		<div class="bar-top">
			<div class="title-block">
				<h1>GhostCrab Graph Explorer</h1>
				<span class="hint">
					<span
						class="health-badge"
						class:online={brainOnline === true}
						class:offline={brainOnline === false}
						class:demo={dataSource === 'sqlite-demo'}
					></span>
					{#if dataSource === 'sqlite-demo'}
						Demo SQLite · read-only
					{:else if brainOnline === true}
						MindBrain live · dual view
					{:else}
						Brain offline · demo fallback recommended
					{/if}
				</span>
			</div>
			<div class="tabs">
				<button class:active={activeTab === 'modele'} onclick={() => (activeTab = 'modele')}>Modèle</button>
				<button class:active={activeTab === 'donnees'} onclick={() => (activeTab = 'donnees')}>Données</button>
				<button class:active={activeTab === 'projections'} onclick={() => (activeTab = 'projections')}>
					Projections
				</button>
				<button class:active={activeTab === 'rules'} onclick={() => (activeTab = 'rules')}>Rules</button>
			</div>
			<div class="controls">
				<label class="field field-workspace">
					<span class="field-label">Workspace</span>
					<select class="select" value={workspaceId} onchange={onWorkspaceChange} aria-label="Workspace">
						{#if dataSource !== 'brain' || brainOnline !== true}
							<option value="">All workspaces</option>
						{/if}
						{#each graphWorkspaces as w}
							<option value={w.id}>{w.label ? `${w.label} · ${w.id}` : w.id} ({w.entityCount})</option>
						{/each}
					</select>
				</label>
				{#if activeTab === 'modele'}
					<label class="field">
						<span class="field-label">Ontology</span>
						<select
							class="select"
							value={ontologyId}
							onchange={onBrainOntologyChange}
							aria-label="Ontology model"
						>
							{#if brainOntologies.length > 1}
								<option value={ALL_ONTOLOGIES}>Tous · {brainOntologies.length} ontologies</option>
							{/if}
							{#each brainOntologies as o}
								<option value={o.ontology_id}>{o.name} · {o.ontology_id}</option>
							{/each}
						</select>
					</label>
				{/if}
			</div>
		</div>
		{#if ontologiesError}
			<p class="ontologies-warn" role="status">Ontology list unavailable: {ontologiesError}</p>
		{/if}
	</header>
	<div class="workspace" class:with-inspector={activeTab !== 'projections' && activeTab !== 'rules'}>
		<div class="stage">
			{#if activeTab === 'modele'}
				{#if brainOnline}
					<ModelePanel
						{ontologyId}
						workspaceId={workspaceId.trim() || 'default'}
						ontologies={brainOntologies}
						onSelect={(payload) => {
							focusInspectorSelection({
								kind: 'ontology',
								nodeKind: payload.nodeKind,
								typeName: payload.typeName,
								payload: payload.payload
							});
						}}
					/>
				{:else}
					<p class="panel-message">Modèle view requires MindBrain online.</p>
				{/if}
			{:else if activeTab === 'donnees'}
				<div class="donnees-stage">
					<GraphCanvas
						ontologyKey={ontologyKey}
						{layoutTemplate}
						{edgeLinkMode}
						workspaceId={workspaceId.trim() || (dataSource === 'brain' ? 'default' : null)}
						topK={effectiveTopK}
						dataSource={effectiveGraphDataSource}
						{brainSeedIds}
						bind:facetFilter={graphFacetFilter}
						bind:legendBlocks={graphLegendBlocks}
						onSelect={(selection) => {
							focusInspectorSelection(selection);
						}}
					/>
					{#if dataSource === 'brain' && brainOnline}
						<ProjectionsDrawer
							workspaceId={workspaceId.trim() || 'default'}
							{graphContext}
							graphFocused={brainSeedIds.length > 0}
							onViewInGraph={viewProjectionInGraph}
							onResetGraph={resetProjectionGraph}
							onOpenDetail={openProjectionDetail}
						/>
					{/if}
				</div>
			{:else if activeTab === 'projections'}
				{#if dataSource === 'sqlite-demo' || brainOnline !== true}
					<p class="panel-message">Projections require MindBrain online (brain mode).</p>
				{:else}
					<ProjectionsPanel
						workspaceId={workspaceId.trim() || 'default'}
						{graphContext}
						active={activeTab === 'projections'}
						initialProjectionId={projectionDetailId}
						onViewInGraph={viewProjectionInGraph}
					/>
				{/if}
			{:else}
				{#if dataSource === 'sqlite-demo' || brainOnline !== true}
					<p class="panel-message">Rules require MindBrain online (brain mode).</p>
				{:else}
					<RulesPanel
						workspaceId={workspaceId.trim() || 'default'}
						ontologyId={ontologyId}
						active={activeTab === 'rules'}
						onViewInGraph={viewRulesInGraph}
					/>
				{/if}
			{/if}
		</div>
		{#if activeTab !== 'projections' && activeTab !== 'rules'}
			<InspectorColumn
				bind:open={inspectorOpen}
				bind:sections={inspectorSections}
				showGraphTools={activeTab === 'donnees' && dataSource === 'brain' && brainOnline === true}
				brainOnline={brainOnline === true}
				bind:selection={inspectorSelection}
				ontologyId={effectiveInspectorOntologyId}
				workspaceId={workspaceId.trim()}
				onOpenType={openTypeInModele}
				bind:ontologyKey
				bind:layoutTemplate
				bind:edgeLinkMode
				bind:topK
				{ontologies}
				{ontologyLabel}
				{onOntologyChange}
				filterEntityType={filterEntityType}
				onSeeds={(ids) => {
					brainSeedIds = ids;
				}}
				legendBlocks={graphLegendBlocks}
				bind:facetFilter={graphFacetFilter}
			/>
		{/if}
	</div>
</main>

<style>
	:global(html, body) {
		height: 100%;
		margin: 0;
	}

	.page {
		display: flex;
		flex-direction: column;
		height: 100vh;
		width: 100vw;
		background: #0b0f14;
		color: #e2e8f0;
	}

	.bar {
		flex: 0 0 auto;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid #1e293b;
		font-family: system-ui, sans-serif;
	}

	.bar-top {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 0.75rem 1.5rem;
	}

	.title-block h1 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
	}

	.hint {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.2rem;
		font-size: 0.75rem;
		color: #64748b;
	}

	.health-badge {
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 999px;
		background: #64748b;
		flex: 0 0 auto;
	}

	.health-badge.online {
		background: #22c55e;
		box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.25);
	}

	.health-badge.offline {
		background: #ef4444;
	}

	.health-badge.demo {
		background: #f59e0b;
	}

	.tabs {
		display: flex;
		gap: 0.35rem;
	}

	.tabs button {
		background: #1e293b;
		border: 1px solid #334155;
		color: #cbd5e1;
		border-radius: 6px;
		padding: 0.35rem 0.75rem;
		cursor: pointer;
	}

	.tabs button.active {
		background: #0ea5e9;
		border-color: #0284c7;
		color: #082f49;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: 0.75rem 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		min-width: 12rem;
	}

	.field-label {
		font-size: 0.65rem;
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
		padding: 0.35rem 2rem 0.35rem 0.5rem;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.field-workspace {
		min-width: 15rem;
	}

	.ontologies-warn {
		margin: 0.5rem 0 0;
		font-size: 0.72rem;
		color: #fbbf24;
	}

	.workspace {
		flex: 1 1 auto;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
	}

	.workspace.with-inspector {
		grid-template-columns: minmax(0, 1fr) auto;
	}

	.stage {
		min-height: 0;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.donnees-stage {
		flex: 1 1 auto;
		min-height: 0;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.panel-message {
		padding: 1rem;
		color: #94a3b8;
		font-family: system-ui, sans-serif;
	}
</style>
