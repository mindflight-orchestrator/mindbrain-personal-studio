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
	import JsonTree from '$lib/components/JsonTree.svelte';

	type ProjectionBundle = {
		projection_results?: Array<Record<string, unknown>>;
		linked_evidence?: Array<Record<string, unknown>>;
		deltas?: Array<Record<string, unknown>>;
		report?: Record<string, unknown>;
		has_projection?: unknown;
		[key: string]: unknown;
	};

	type ExecutionResult =
		| {
				kind: 'artifact';
				row: ProjectionRow;
				title: string;
				raw: Record<string, unknown>;
		  }
		| {
				kind: 'snapshot';
				row: ProjectionRow | null;
				title: string;
				raw: Record<string, unknown>;
		  }
		| {
				kind: 'pack';
				row: ProjectionRow;
				title: string;
				raw: Record<string, unknown>;
		  };

	const KIND_ORDER = ['analysis_plan', 'answer_snapshot', 'live_answer_view', 'evidence_pack'];
	const ANALYSIS_PROJ_TYPES = ['FACT', 'GOAL', 'STEP', 'CONSTRAINT'];

	let {
		workspaceId = '',
		graphContext = {},
		active = false,
		initialProjectionId = '',
		onViewInGraph
	}: {
		workspaceId?: string;
		graphContext?: GraphContext;
		active?: boolean;
		initialProjectionId?: string;
		onViewInGraph?: (entityIds: number[]) => void;
	} = $props();

	let search = $state('');
	let selectedKind = $state('all');
	let selectedProjType = $state('all');
	let loading = $state(false);
	let refreshing = $state(false);
	let error = $state<string | null>(null);
	let rows = $state<ProjectionRow[]>([]);
	let selectedKey = $state('');
	let execution = $state<ExecutionResult | null>(null);
	let loadedWorkspace = $state('');
	let loadedSearch = $state('');
	let pendingProjectionId = $state('');
	let openKinds = $state<Record<string, boolean>>({
		analysis_plan: false,
		answer_snapshot: true,
		live_answer_view: true,
		evidence_pack: true
	});

	$effect(() => {
		const ws = effectiveWorkspace();
		if (active && ws && (loadedWorkspace !== ws || loadedSearch !== search.trim())) {
			void refreshCatalog();
		}
	});

	$effect(() => {
		if (initialProjectionId && initialProjectionId !== pendingProjectionId) {
			pendingProjectionId = initialProjectionId;
			void executeProjectionId(initialProjectionId, null);
		}
	});

	function effectiveWorkspace(): string {
		return workspaceId.trim() || 'default';
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

	function kindOf(row: ProjectionRow): string {
		return row.artifact_kind ?? row.type ?? 'artifact';
	}

	function visibleRows(): ProjectionRow[] {
		return rows.filter((row) => {
			if (selectedProjType !== 'all') {
				return kindOf(row) === 'analysis_plan' && row.proj_type === selectedProjType;
			}
			if (selectedKind !== 'all' && kindOf(row) !== selectedKind) return false;
			return true;
		});
	}

	function groupedRows(): Array<[string, ProjectionRow[]]> {
		const groups = new Map<string, ProjectionRow[]>();
		for (const kind of KIND_ORDER) groups.set(kind, []);
		for (const row of visibleRows()) {
			const kind = kindOf(row);
			groups.set(kind, [...(groups.get(kind) ?? []), row]);
		}
		return [...groups.entries()].filter(([, groupRows]) => groupRows.length > 0);
	}

	function kindCount(kind: string): number {
		return rows.filter((row) => kindOf(row) === kind).length;
	}

	function projTypeCount(projType: string): number {
		return rows.filter((row) => kindOf(row) === 'analysis_plan' && row.proj_type === projType).length;
	}

	function kindOpen(kind: string): boolean {
		return openKinds[kind] ?? true;
	}

	function toggleKind(kind: string) {
		openKinds = { ...openKinds, [kind]: !kindOpen(kind) };
	}

	function selectKind(kind: string) {
		selectedKind = kind;
		selectedProjType = 'all';
		if (kind !== 'all') openKinds = { ...openKinds, [kind]: true };
	}

	function selectAnalysisProjType(projType: string) {
		selectedKind = 'analysis_plan';
		selectedProjType = projType;
		openKinds = { ...openKinds, analysis_plan: true };
	}

	async function refreshCatalog() {
		const ws = effectiveWorkspace();
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams({
				workspace_id: ws,
				limit: '1000'
			});
			if (search.trim()) params.set('search', search.trim());
			const res = await fetch(`/api/projections/catalog?${params}`);
			if (!res.ok) throw new Error(await res.text());
			const data = (await res.json()) as Record<string, unknown>;
			rows = mapPackRows(data);
			loadedWorkspace = ws;
			loadedSearch = search.trim();
			const selected = selectedKey ? rows.find((row) => rowKey(row) === selectedKey) : null;
			const pending = pendingProjectionId
				? rows.find((row) => row.projection_id === pendingProjectionId)
				: null;
			if (pending && !selected) {
				selectedKey = rowKey(pending);
			} else if (!selected) {
				const first = rows[0];
				selectedKey = first ? rowKey(first) : '';
				execution = null;
				if (first) void executeRow(first);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			rows = [];
			execution = null;
		} finally {
			loading = false;
		}
	}

	async function executeRow(row: ProjectionRow) {
		selectedKey = rowKey(row);
		if (kindOf(row) === 'answer_snapshot' && row.projection_id) {
			await executeProjectionId(row.projection_id, row);
			return;
		}
		if (row.artifact_id) {
			await executeArtifact(row);
			return;
		}
		execution = {
			kind: 'artifact',
			row,
			title: rowTitle(row),
			raw: row.raw
		};
	}

	async function executePack(row: ProjectionRow) {
		const scope = row.scope?.trim();
		if (!scope) return;
		selectedKey = rowKey(row);
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams({
				agent_id: 'agent:self',
				workspace_id: effectiveWorkspace(),
				scope,
				query: rowTitle(row),
				limit: '12'
			});
			const res = await fetch(`/api/brain/ghostcrab/pack-projections?${params}`);
			if (!res.ok) throw new Error(await res.text());
			execution = {
				kind: 'pack',
				row,
				title: `${rowTitle(row)} context`,
				raw: (await res.json()) as Record<string, unknown>
			};
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	async function executeArtifact(row: ProjectionRow) {
		if (!row.artifact_id) return;
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams({ workspace_id: effectiveWorkspace() });
			const res = await fetch(
				`/api/brain/ghostcrab/artifact/${encodeURIComponent(row.artifact_id)}?${params}`
			);
			if (!res.ok) {
				execution = {
					kind: 'artifact',
					row,
					title: rowTitle(row),
					raw: row.raw
				};
				return;
			}
			execution = {
				kind: 'artifact',
				row,
				title: rowTitle(row),
				raw: (await res.json()) as Record<string, unknown>
			};
		} catch {
			execution = {
				kind: 'artifact',
				row,
				title: rowTitle(row),
				raw: row.raw
			};
		} finally {
			loading = false;
		}
	}

	async function executeProjectionId(id: string, row: ProjectionRow | null) {
		const projection = id.trim();
		if (!projection) return;
		loading = true;
		error = null;
		try {
			const params = new URLSearchParams({
				workspace_id: effectiveWorkspace(),
				projection_id: projection,
				include_evidence: 'true',
				include_deltas: 'true'
			});
			const res = await fetch(`/api/brain/ghostcrab/projection-get?${params}`);
			if (!res.ok) throw new Error(await res.text());
			execution = {
				kind: 'snapshot',
				row,
				title: row ? rowTitle(row) : projection,
				raw: (await res.json()) as Record<string, unknown>
			};
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			execution = row
				? {
						kind: 'artifact',
						row,
						title: rowTitle(row),
						raw: row.raw
					}
				: null;
		} finally {
			loading = false;
		}
	}

	async function refreshLiveAnswer(row: ProjectionRow) {
		if (!row.artifact_id || kindOf(row) !== 'live_answer_view') return;
		refreshing = true;
		error = null;
		try {
			const params = new URLSearchParams({ workspace_id: effectiveWorkspace() });
			const res = await fetch(
				`/api/brain/ghostcrab/artifact/${encodeURIComponent(row.artifact_id)}/refresh?${params}`,
				{ method: 'POST' }
			);
			if (!res.ok) throw new Error(await res.text());
			await refreshCatalog();
			const refreshed = rows.find((candidate) => candidate.artifact_id === row.artifact_id) ?? row;
			await executeRow(refreshed);
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			refreshing = false;
		}
	}

	function refreshSelectedLiveAnswer() {
		const row = execution?.row;
		if (row) void refreshLiveAnswer(row);
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
				kindOf(candidate) === 'answer_snapshot' && sourcePlanId(candidate) === row.artifact_id
		);
		return linkedSnapshot
			? linkedSnapshot.entity_id != null
				? [linkedSnapshot.entity_id]
				: entityIdsFromUnknown(linkedSnapshot.raw)
			: [];
	}

	function viewRowInGraph(row: ProjectionRow) {
		const ids = graphIdsForRow(row);
		if (ids.length > 0) onViewInGraph?.(ids);
	}

	function viewExecutionInGraph() {
		if (!execution) return;
		const ids =
			execution.kind === 'snapshot'
				? entityIdsFromUnknown(execution.raw)
				: graphIdsForRow(execution.row);
		if (ids.length > 0) onViewInGraph?.(ids);
	}

	function executionGraphIds(): number[] {
		if (!execution) return [];
		return execution.kind === 'snapshot' ? entityIdsFromUnknown(execution.raw) : graphIdsForRow(execution.row);
	}

	function projectionDetailBundle(): ProjectionBundle {
		return execution?.kind === 'snapshot' ? (execution.raw as ProjectionBundle) : {};
	}

	function packRows(): unknown[] {
		const rowsValue = execution?.kind === 'pack' ? execution.raw.rows : null;
		return Array.isArray(rowsValue) ? rowsValue : [];
	}

	function reportHasProjection(): unknown {
		const detail = projectionDetailBundle();
		return detail.report?.has_projection ?? detail.has_projection;
	}

	function badges(row: ProjectionRow): string[] {
		return [
			row.proj_type,
			row.lifecycle,
			row.state ?? row.status,
			row.current_version == null ? undefined : `v${row.current_version}`,
			row.source === 'legacy_projection' ? 'legacy' : undefined
		].filter((value): value is string => Boolean(value));
	}

	function preview(row: ProjectionRow): string {
		return row.preview ?? row.content ?? row.public_label ?? '';
	}

	function previewJson(value: unknown, max = 320): string {
		const text = typeof value === 'object' ? (JSON.stringify(value) ?? String(value)) : String(value);
		return text.length > max ? `${text.slice(0, max)}...` : text;
	}

	function actionLabel(row: ProjectionRow): string {
		switch (kindOf(row)) {
			case 'answer_snapshot':
				return 'Open snapshot';
			case 'live_answer_view':
				return 'Open live answer';
			case 'analysis_plan':
				return 'Open plan';
			case 'evidence_pack':
				return 'Open evidence';
			default:
				return 'Open';
		}
	}
</script>

<div class="projections">
	<header class="toolbar">
		<div>
			<h2>Projections</h2>
			<p>{rows.length} artifacts · {effectiveWorkspace()}</p>
		</div>
		<div class="actions">
			<label class="search">
				<span>Filter</span>
				<input
					bind:value={search}
					onkeydown={(event) => {
						if (event.key === 'Enter') void refreshCatalog();
					}}
				/>
			</label>
			<button type="button" onclick={refreshCatalog} disabled={loading}>Refresh</button>
		</div>
	</header>

	<nav class="kind-tabs" aria-label="Projection artifact type">
		<button
			class:active={selectedKind === 'all' && selectedProjType === 'all'}
			type="button"
			onclick={() => selectKind('all')}
		>
			All <span>{rows.length}</span>
		</button>
		{#each KIND_ORDER as kind}
			<button
				class:active={selectedKind === kind && selectedProjType === 'all'}
				type="button"
				onclick={() => selectKind(kind)}
				disabled={kindCount(kind) === 0}
			>
				{artifactKindLabel(kind)} <span>{kindCount(kind)}</span>
			</button>
		{/each}
	</nav>

	{#if kindCount('analysis_plan') > 0}
		<nav class="proj-type-tabs" aria-label="Analysis plan subtype">
			<button
				class:active={selectedProjType === 'all'}
				type="button"
				onclick={() => selectKind('analysis_plan')}
			>
				All plan types <span>{kindCount('analysis_plan')}</span>
			</button>
			{#each ANALYSIS_PROJ_TYPES as projType}
				<button
					class:active={selectedProjType === projType}
					type="button"
					onclick={() => selectAnalysisProjType(projType)}
					disabled={projTypeCount(projType) === 0}
				>
					{projType} <span>{projTypeCount(projType)}</span>
				</button>
			{/each}
		</nav>
	{/if}

	{#if error}<p class="error">{error}</p>{/if}

	<div class="layout">
		<section class="catalog" aria-busy={loading}>
			{#if loading && rows.length === 0}
				<p class="muted">Loading workspace artifacts...</p>
			{:else if rows.length === 0}
				<p class="muted">No projection artifacts found for workspace {effectiveWorkspace()} in this SQLite runtime.</p>
			{:else if visibleRows().length === 0}
				<p class="muted">No artifacts match this filter.</p>
			{:else}
				{#each groupedRows() as [kind, kindRows]}
					<section class="type-group">
						<header>
							<button type="button" class="group-toggle" onclick={() => toggleKind(kind)}>
								<span>{kindOpen(kind) ? '▼' : '▶'} {artifactKindLabel(kind)}</span>
								<small>{kindRows.length}</small>
							</button>
						</header>
						{#if kindOpen(kind)}
							<ul class="rows">
								{#each kindRows as row (rowKey(row))}
									<li
										class:highlight={rowMatchesGraphContext(row, graphContext)}
										class:selected={selectedKey === rowKey(row)}
									>
										<button type="button" class="row-button" onclick={() => executeRow(row)}>
											<span class="row-title">
												{#if kindOf(row) === 'analysis_plan'}
													<span class="title-prefix">Analysis plan:</span>
												{/if}
												{rowTitle(row)}
											</span>
											{#if preview(row)}
												<span class="content">{preview(row)}</span>
											{/if}
										</button>
										<div class="row-meta">
											{#each badges(row) as badge}
												<span class="tag">{badge}</span>
											{/each}
											{#if row.scope}<span class="scope">{row.scope}</span>{/if}
										</div>
										<div class="row-actions">
											<button type="button" onclick={() => executeRow(row)}>{actionLabel(row)}</button>
											{#if kindOf(row) === 'analysis_plan' && row.scope}
												<button type="button" onclick={() => executePack(row)}>Pack context</button>
											{/if}
											{#if graphIdsForRow(row).length > 0}
												<button type="button" onclick={() => viewRowInGraph(row)}>Focus graph</button>
											{/if}
											{#if kindOf(row) === 'live_answer_view'}
												<button type="button" onclick={() => refreshLiveAnswer(row)} disabled={refreshing}>
													Refresh live
												</button>
											{/if}
										</div>
									</li>
								{/each}
							</ul>
						{/if}
					</section>
				{/each}
			{/if}
		</section>

		<section class="result">
			{#if execution}
				<header class="result-head">
					<div>
						<h3>{execution.title}</h3>
						<p>
							{execution.row ? artifactKindLabel(kindOf(execution.row)) : 'Snapshot'} · {execution.kind}
						</p>
					</div>
					<div class="result-actions">
						{#if execution.row && kindOf(execution.row) === 'live_answer_view'}
							<button type="button" onclick={refreshSelectedLiveAnswer} disabled={refreshing}>
								Refresh live
							</button>
						{/if}
						{#if executionGraphIds().length > 0}
							<button type="button" onclick={viewExecutionInGraph}>Focus graph</button>
						{/if}
					</div>
				</header>

				{#if execution.kind === 'artifact'}
					{#if execution.row?.preview || execution.row?.content}
						<p class="detail-line">{execution.row.preview ?? execution.row.content}</p>
					{/if}
				{:else if execution.kind === 'pack'}
					{#if packRows().length > 0}
						<h4>Context rows ({packRows().length})</h4>
						<ul class="detail-list">
							{#each packRows().slice(0, 12) as result}
								<li>{previewJson(result)}</li>
							{/each}
						</ul>
					{:else}
						<p class="detail-line">No packed context rows returned for this scope.</p>
					{/if}
				{:else}
					{#if reportHasProjection() != null}
						<p class="detail-line">has_projection: {String(reportHasProjection())}</p>
					{/if}
					{#if projectionDetailBundle().projection_results?.length}
						<h4>Snapshot results ({projectionDetailBundle().projection_results?.length})</h4>
						<ul class="detail-list">
							{#each projectionDetailBundle().projection_results?.slice(0, 8) ?? [] as result}
								<li>
									<strong>{String(result.name ?? result.entity_type ?? 'ProjectionResult')}</strong>
									<p>{previewJson(result.metadata ?? result.metadata_json ?? result)}</p>
								</li>
							{/each}
						</ul>
					{/if}
					{#if projectionDetailBundle().linked_evidence?.length}
						<h4>Evidence ({projectionDetailBundle().linked_evidence?.length})</h4>
						<ul class="detail-list">
							{#each projectionDetailBundle().linked_evidence?.slice(0, 8) ?? [] as ev}
								<li>{previewJson(ev)}</li>
							{/each}
						</ul>
					{/if}
					{#if projectionDetailBundle().deltas?.length}
						<h4>Deltas ({projectionDetailBundle().deltas?.length})</h4>
						<ul class="detail-list">
							{#each projectionDetailBundle().deltas?.slice(0, 8) ?? [] as delta}
								<li>
									<strong>{String(delta.name ?? delta.entity_type ?? 'DeltaFinding')}</strong>
									<p>{previewJson(delta.metadata ?? delta.metadata_json ?? delta)}</p>
								</li>
							{/each}
						</ul>
					{/if}
				{/if}

				<details>
					<summary>Technical details</summary>
					<JsonTree value={execution.raw} />
				</details>
			{:else}
				<p class="muted">Select an artifact.</p>
			{/if}
		</section>
	</div>
</div>

<style>
	.projections {
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background: #0b0f14;
		color: #e2e8f0;
		font-family: system-ui, sans-serif;
	}
	.toolbar,
	.kind-tabs,
	.proj-type-tabs {
		flex: 0 0 auto;
		border-bottom: 1px solid #1e293b;
	}
	.toolbar {
		display: flex;
		align-items: flex-end;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.85rem 1rem;
	}
	h2,
	h3,
	h4,
	p {
		margin: 0;
	}
	h2 {
		font-size: 1rem;
	}
	.toolbar p,
	.result-head p,
	.muted,
	.tag,
	.scope,
	.search span {
		color: #94a3b8;
	}
	.toolbar p,
	.result-head p {
		margin-top: 0.2rem;
		font-size: 0.72rem;
	}
	.actions,
	.result-actions {
		display: flex;
		align-items: flex-end;
		gap: 0.55rem;
	}
	.search {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.68rem;
	}
	input {
		width: 15rem;
		min-width: 0;
		background: #111827;
		border: 1px solid #334155;
		color: #e2e8f0;
		border-radius: 6px;
		padding: 0.4rem 0.5rem;
		font: inherit;
	}
	button {
		background: #38bdf8;
		color: #082f49;
		border: 1px solid #38bdf8;
		border-radius: 6px;
		padding: 0.42rem 0.7rem;
		cursor: pointer;
		font-size: 0.78rem;
		font-weight: 650;
	}
	button:disabled {
		opacity: 0.55;
		cursor: default;
	}
	.kind-tabs,
	.proj-type-tabs {
		display: flex;
		gap: 0.35rem;
		overflow-x: auto;
	}
	.kind-tabs {
		padding: 0.6rem 1rem;
	}
	.proj-type-tabs {
		padding: 0.45rem 1rem;
		background: #0f172a;
	}
	.kind-tabs button,
	.proj-type-tabs button {
		background: #111827;
		border-color: #334155;
		color: #cbd5e1;
		white-space: nowrap;
	}
	.kind-tabs button.active,
	.proj-type-tabs button.active {
		background: #0ea5e9;
		border-color: #0284c7;
		color: #082f49;
	}
	.kind-tabs span,
	.proj-type-tabs span {
		margin-left: 0.25rem;
		font-variant-numeric: tabular-nums;
	}
	.layout {
		min-height: 0;
		flex: 1 1 auto;
		display: grid;
		grid-template-columns: minmax(24rem, 1.15fr) minmax(20rem, 0.85fr);
	}
	.catalog,
	.result {
		min-height: 0;
		overflow: auto;
		padding: 1rem;
	}
	.catalog {
		border-right: 1px solid #1e293b;
	}
	.type-group + .type-group {
		margin-top: 1rem;
	}
	.result-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.type-group > header {
		margin-bottom: 0.45rem;
	}
	.group-toggle {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.25rem 0;
		background: transparent;
		border: 0;
		color: #e2e8f0;
		text-align: left;
	}
	.group-toggle small {
		color: #64748b;
		font-size: 0.75rem;
		font-variant-numeric: tabular-nums;
	}
	.result h3 {
		font-size: 0.88rem;
	}
	.type-group > header span {
		color: #64748b;
		font-size: 0.75rem;
	}
	.rows,
	.detail-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.rows {
		display: grid;
		gap: 0.5rem;
	}
	.rows li,
	.detail-list li {
		border: 1px solid #1e293b;
		border-radius: 8px;
		background: #0f172a;
		padding: 0.65rem;
	}
	.rows li.highlight {
		border-color: #0ea5e9;
	}
	.rows li.selected {
		border-color: #38bdf8;
		background: #102033;
	}
	.row-button {
		display: block;
		width: 100%;
		padding: 0;
		background: transparent;
		border: 0;
		color: inherit;
		text-align: left;
	}
	.row-title {
		display: block;
		overflow-wrap: anywhere;
		font-size: 0.82rem;
		font-weight: 700;
	}
	.title-prefix {
		margin-right: 0.25rem;
		color: #94a3b8;
		font-size: 0.72rem;
		font-weight: 650;
	}
	.content {
		display: block;
		margin-top: 0.4rem;
		color: #cbd5e1;
		font-size: 0.78rem;
		font-weight: 400;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}
	.row-meta,
	.row-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.55rem;
	}
	.tag,
	.scope {
		font-size: 0.68rem;
	}
	.scope {
		overflow-wrap: anywhere;
	}
	.row-actions button,
	.result-actions button {
		background: #1e293b;
		color: #e2e8f0;
		border-color: #334155;
	}
	.result-head {
		margin-bottom: 0.75rem;
	}
	.detail-line {
		margin-bottom: 0.75rem;
		color: #cbd5e1;
		font-size: 0.78rem;
		line-height: 1.4;
	}
	.detail-list {
		display: grid;
		gap: 0.5rem;
		margin: 0.5rem 0 1rem;
	}
	.detail-list li {
		color: #cbd5e1;
		font-size: 0.74rem;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}
	details {
		margin-top: 1rem;
		border-top: 1px solid #1e293b;
		padding-top: 0.75rem;
	}
	summary {
		cursor: pointer;
		color: #38bdf8;
		font-size: 0.76rem;
	}
	.error {
		margin: 0;
		padding: 0.65rem 1rem;
		border-bottom: 1px solid #7f1d1d;
		color: #fca5a5;
		background: #2a1114;
		font-size: 0.76rem;
	}
	@media (max-width: 900px) {
		.toolbar,
		.actions {
			align-items: stretch;
			flex-direction: column;
		}
		input {
			width: 100%;
		}
		.layout {
			grid-template-columns: 1fr;
		}
		.catalog {
			border-right: 0;
			border-bottom: 1px solid #1e293b;
		}
	}
</style>
