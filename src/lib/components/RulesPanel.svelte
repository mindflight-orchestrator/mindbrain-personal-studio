<script lang="ts">
	import JsonTree from '$lib/components/JsonTree.svelte';
	import { ALL_ONTOLOGIES } from '$lib/brain/ontologyInspect';

	type GapRule = {
		rule_id: string;
		entity_type?: string;
		relation_type?: string;
		direction?: string;
		target_entity_type?: string | null;
		min_count?: number | null;
		max_count?: number | null;
		severity?: string;
		label?: string;
		enabled?: boolean;
		metadata?: Record<string, unknown>;
	};

	type RuleEvaluation = {
		rule_id: string;
		subject_entity_id: number;
		state: 'valid' | 'invalid' | string;
		observed_count?: number | null;
		expected_min?: number | null;
		expected_max?: number | null;
		last_evaluated_at_unix?: number;
		updated_at_unix?: number;
	};

	type RuleEvent = {
		event_id: string;
		rule_id: string;
		subject_entity_id: number;
		from_state?: string;
		to_state?: string;
		observed_count?: number | null;
		expected_min?: number | null;
		expected_max?: number | null;
		created_at_unix?: number;
	};

	type DiagnosticIssue = {
		kind?: string;
		severity?: string;
		label?: string;
		rule_id?: string | null;
		entity_id?: number | null;
		observed_count?: number | null;
		expected_min?: number | null;
		expected_max?: number | null;
	};

	let {
		workspaceId = 'default',
		ontologyId = '',
		active = false,
		onViewInGraph
	}: {
		workspaceId?: string;
		ontologyId?: string;
		active?: boolean;
		onViewInGraph?: (entityIds: number[]) => void;
	} = $props();

	let loading = $state(false);
	let running = $state(false);
	let error = $state<string | null>(null);
	let search = $state('');
	let stateFilter = $state<'all' | 'invalid' | 'valid'>('all');
	let severityFilter = $state('all');
	let selectedRuleId = $state('');
	let loadedWorkspace = $state('');
	let loadedOntology = $state('');
	let rules = $state<GapRule[]>([]);
	let evaluations = $state<RuleEvaluation[]>([]);
	let events = $state<RuleEvent[]>([]);
	let diagnostics = $state<Record<string, unknown> | null>(null);
	let lastRun = $state<Record<string, unknown> | null>(null);

	$effect(() => {
		const ws = effectiveWorkspace();
		const onto = effectiveOntology();
		if (active && ws && (loadedWorkspace !== ws || loadedOntology !== onto)) {
			void refreshAll();
		}
	});

	function effectiveWorkspace(): string {
		return workspaceId.trim() || 'default';
	}

	function effectiveOntology(): string {
		const value = ontologyId.trim();
		if (value && value !== ALL_ONTOLOGIES) return value;
		const ws = effectiveWorkspace();
		return ws !== 'default' ? ws : '';
	}

	function withScope(params = new URLSearchParams()): URLSearchParams {
		params.set('workspace_id', effectiveWorkspace());
		const onto = effectiveOntology();
		if (onto) params.set('ontology_id', onto);
		return params;
	}

	async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
		const res = await fetch(path, init);
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as T;
	}

	async function refreshAll() {
		loading = true;
		error = null;
		try {
			const [rulesPayload, evaluationsPayload, eventsPayload, diagnosticsPayload] =
				await Promise.all([
					fetchJson<Record<string, unknown>>(
						`/api/brain/graph/gap-rules?${withScope()}`
					),
					fetchJson<Record<string, unknown>>(
						`/api/brain/graph/rule-evaluations?${withScope(new URLSearchParams({ limit: '500' }))}`
					),
					fetchJson<Record<string, unknown>>(
						`/api/brain/graph/rule-events?${withScope(new URLSearchParams({ limit: '100' }))}`
					),
					fetchJson<Record<string, unknown>>(
						`/api/brain/graph/diagnostics?${withScope(new URLSearchParams({ limit: '500' }))}`
					)
				]);
			rules = Array.isArray(rulesPayload.rules) ? (rulesPayload.rules as GapRule[]) : [];
			evaluations = Array.isArray(evaluationsPayload.evaluations)
				? (evaluationsPayload.evaluations as RuleEvaluation[])
				: [];
			events = Array.isArray(eventsPayload.events) ? (eventsPayload.events as RuleEvent[]) : [];
			diagnostics = diagnosticsPayload;
			loadedWorkspace = effectiveWorkspace();
			loadedOntology = effectiveOntology();
			if (selectedRuleId && !rules.some((rule) => rule.rule_id === selectedRuleId)) {
				selectedRuleId = '';
			}
			if (!selectedRuleId && rules.length > 0) selectedRuleId = rules[0].rule_id;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			rules = [];
			evaluations = [];
			events = [];
			diagnostics = null;
		} finally {
			loading = false;
		}
	}

	async function runEvaluations() {
		running = true;
		error = null;
		try {
			const body: Record<string, unknown> = {
				workspace_id: effectiveWorkspace(),
				limit: 100,
				create_remediation_actions: false
			};
			const onto = effectiveOntology();
			if (onto) body.ontology_id = onto;
			lastRun = await fetchJson<Record<string, unknown>>('/api/brain/graph/rule-evaluations/run', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			await refreshAll();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			running = false;
		}
	}

	function evaluationsFor(ruleId: string): RuleEvaluation[] {
		return evaluations.filter((row) => row.rule_id === ruleId);
	}

	function issuesFor(ruleId: string): DiagnosticIssue[] {
		const issues = diagnostics?.issues;
		if (!Array.isArray(issues)) return [];
		return (issues as DiagnosticIssue[]).filter((issue) => issue.rule_id === ruleId);
	}

	function invalidCount(ruleId: string): number {
		return evaluationsFor(ruleId).filter((row) => row.state === 'invalid').length;
	}

	function validCount(ruleId: string): number {
		return evaluationsFor(ruleId).filter((row) => row.state === 'valid').length;
	}

	function impactedIds(ruleId: string, invalidOnly = true): number[] {
		const ids = new Set<number>();
		for (const row of evaluationsFor(ruleId)) {
			if (!invalidOnly || row.state === 'invalid') ids.add(Number(row.subject_entity_id));
		}
		for (const issue of issuesFor(ruleId)) {
			const id = Number(issue.entity_id);
			if (Number.isFinite(id) && id > 0) ids.add(id);
		}
		return [...ids].filter((id) => Number.isFinite(id) && id > 0);
	}

	function visibleRules(): GapRule[] {
		const q = search.trim().toLowerCase();
		return rules.filter((rule) => {
			if (severityFilter !== 'all' && rule.severity !== severityFilter) return false;
			if (stateFilter === 'invalid' && invalidCount(rule.rule_id) === 0) return false;
			if (stateFilter === 'valid' && validCount(rule.rule_id) === 0) return false;
			if (!q) return true;
			return [
				rule.rule_id,
				rule.label,
				rule.entity_type,
				rule.relation_type,
				rule.target_entity_type,
				rule.severity
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()
				.includes(q);
		});
	}

	function selectedRule(): GapRule | null {
		return rules.find((rule) => rule.rule_id === selectedRuleId) ?? visibleRules()[0] ?? null;
	}

	function severityValues(): string[] {
		return [...new Set(rules.map((rule) => rule.severity).filter((value): value is string => Boolean(value)))].sort();
	}

	function summary(): Record<string, unknown> {
		const diagSummary = diagnostics?.summary;
		return diagSummary && typeof diagSummary === 'object' ? (diagSummary as Record<string, unknown>) : {};
	}

	function allVisibleImpactedIds(): number[] {
		const ids = new Set<number>();
		for (const rule of visibleRules()) {
			for (const id of impactedIds(rule.rule_id, stateFilter !== 'valid')) ids.add(id);
		}
		return [...ids];
	}

	function focusIds(ids: number[]) {
		const clean = [...new Set(ids)].filter((id) => Number.isFinite(id) && id > 0).slice(0, 30);
		if (clean.length > 0) onViewInGraph?.(clean);
	}

	function formatCount(value: unknown): string {
		return value == null ? '0' : String(value);
	}

	function ruleMeta(rule: GapRule): string {
		const target = rule.target_entity_type ? ` -> ${rule.target_entity_type}` : '';
		return `${rule.entity_type ?? '?'} · ${rule.direction ?? '?'} ${rule.relation_type ?? '?'}${target}`;
	}
</script>

<div class="rules">
	<header class="toolbar">
		<div>
			<h2>Rules</h2>
			<p>
				{rules.length} rules · {effectiveWorkspace()}
				{#if effectiveOntology()} · {effectiveOntology()}{/if}
			</p>
		</div>
		<div class="actions">
			<label class="search">
				<span>Filter</span>
				<input
					bind:value={search}
					onkeydown={(event) => {
						if (event.key === 'Enter') void refreshAll();
					}}
				/>
			</label>
			<button type="button" onclick={refreshAll} disabled={loading || running}>Refresh</button>
			<button type="button" onclick={runEvaluations} disabled={loading || running}>
				{running ? 'Running...' : 'Run evaluations'}
			</button>
		</div>
	</header>

	<nav class="filters" aria-label="Rule filters">
		<button class:active={stateFilter === 'all'} type="button" onclick={() => (stateFilter = 'all')}>
			All <span>{rules.length}</span>
		</button>
		<button class:active={stateFilter === 'invalid'} type="button" onclick={() => (stateFilter = 'invalid')}>
			Invalid <span>{evaluations.filter((row) => row.state === 'invalid').length}</span>
		</button>
		<button class:active={stateFilter === 'valid'} type="button" onclick={() => (stateFilter = 'valid')}>
			Valid <span>{evaluations.filter((row) => row.state === 'valid').length}</span>
		</button>
		<button class:active={severityFilter === 'all'} type="button" onclick={() => (severityFilter = 'all')}>
			All severities
		</button>
		{#each severityValues() as severity}
			<button
				class:active={severityFilter === severity}
				type="button"
				onclick={() => (severityFilter = severity)}
			>
				{severity}
			</button>
		{/each}
	</nav>

	<section class="summary" aria-label="Rule diagnostics summary">
		<span>evaluated {formatCount(lastRun?.evaluated ?? summary().rules_evaluated)}</span>
		<span>invalid {formatCount(lastRun?.invalid_count ?? summary().missing_required_relations)}</span>
		<span>events {formatCount(lastRun?.events_created ?? events.length)}</span>
		<span>diagnostic issues {formatCount(summary().issues_total)}</span>
		{#if allVisibleImpactedIds().length > 0}
			<button type="button" onclick={() => focusIds(allVisibleImpactedIds())}>
				Focus impacted ({Math.min(allVisibleImpactedIds().length, 30)})
			</button>
		{/if}
	</section>

	{#if error}<p class="error">{error}</p>{/if}

	<div class="layout">
		<section class="catalog" aria-busy={loading}>
			{#if loading && rules.length === 0}
				<p class="muted">Loading rules...</p>
			{:else if rules.length === 0}
				<p class="muted">No graph gap rules found for this workspace.</p>
			{:else if visibleRules().length === 0}
				<p class="muted">No rules match this filter.</p>
			{:else}
				<ul class="rows">
					{#each visibleRules() as rule (rule.rule_id)}
						<li class:selected={selectedRuleId === rule.rule_id}>
							<button type="button" class="row-button" onclick={() => (selectedRuleId = rule.rule_id)}>
								<span class="row-title">{rule.rule_id}</span>
								<span class="content">{rule.label ?? ruleMeta(rule)}</span>
							</button>
							<div class="row-meta">
								<span class="tag severity">{rule.severity ?? 'info'}</span>
								<span class="tag">{rule.enabled === false ? 'disabled' : 'enabled'}</span>
								<span class="scope">{ruleMeta(rule)}</span>
							</div>
							<div class="row-actions">
								<span class="count invalid">invalid {invalidCount(rule.rule_id)}</span>
								<span class="count">valid {validCount(rule.rule_id)}</span>
								{#if impactedIds(rule.rule_id).length > 0}
									<button type="button" onclick={() => focusIds(impactedIds(rule.rule_id))}>
										Focus graph
									</button>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</section>

		<section class="result">
			{#if selectedRule()}
				{@const rule = selectedRule()}
				<header class="result-head">
					<div>
						<h3>{rule?.rule_id}</h3>
						<p>{rule ? ruleMeta(rule) : ''}</p>
					</div>
					<div class="result-actions">
						{#if rule && impactedIds(rule.rule_id).length > 0}
							<button type="button" onclick={() => focusIds(impactedIds(rule.rule_id))}>
								Focus invalid
							</button>
						{/if}
					</div>
				</header>

				{#if rule?.label}<p class="detail-line">{rule.label}</p>{/if}

				<div class="cards">
					<div>
						<strong>{invalidCount(rule?.rule_id ?? '')}</strong>
						<span>invalid</span>
					</div>
					<div>
						<strong>{validCount(rule?.rule_id ?? '')}</strong>
						<span>valid</span>
					</div>
					<div>
						<strong>{issuesFor(rule?.rule_id ?? '').length}</strong>
						<span>diagnostic issues</span>
					</div>
				</div>

				<h4>Invalid subjects</h4>
				{#if evaluationsFor(rule?.rule_id ?? '').filter((row) => row.state === 'invalid').length === 0}
					<p class="muted">No invalid subjects for this rule.</p>
				{:else}
					<ul class="detail-list">
						{#each evaluationsFor(rule?.rule_id ?? '').filter((row) => row.state === 'invalid').slice(0, 40) as row}
							<li>
								<button type="button" class="link-button" onclick={() => focusIds([row.subject_entity_id])}>
									#{row.subject_entity_id}
								</button>
								<span>observed {row.observed_count ?? 0}, expected min {row.expected_min ?? 0}</span>
							</li>
						{/each}
					</ul>
				{/if}

				{#if events.filter((event) => event.rule_id === rule?.rule_id).length > 0}
					<h4>Recent events</h4>
					<ul class="detail-list">
						{#each events.filter((event) => event.rule_id === rule?.rule_id).slice(0, 8) as event}
							<li>
								<button type="button" class="link-button" onclick={() => focusIds([event.subject_entity_id])}>
									#{event.subject_entity_id}
								</button>
								<span>{event.from_state ?? '?'} -> {event.to_state ?? '?'}</span>
							</li>
						{/each}
					</ul>
				{/if}

				<details>
					<summary>Technical details</summary>
					<JsonTree value={{ rule, evaluations: evaluationsFor(rule?.rule_id ?? ''), issues: issuesFor(rule?.rule_id ?? '') }} />
				</details>
			{:else}
				<p class="muted">Select a rule.</p>
			{/if}
		</section>
	</div>
</div>

<style>
	.rules {
		height: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
		background: #0b0f14;
		color: #e2e8f0;
		font-family: system-ui, sans-serif;
	}
	.toolbar,
	.filters,
	.summary {
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
	h4 {
		margin-top: 1rem;
		font-size: 0.82rem;
		color: #cbd5e1;
	}
	.toolbar p,
	.result-head p,
	.muted,
	.tag,
	.scope,
	.search span,
	.count {
		color: #94a3b8;
	}
	.toolbar p,
	.result-head p {
		margin-top: 0.2rem;
		font-size: 0.72rem;
	}
	.actions,
	.result-actions,
	.summary {
		display: flex;
		align-items: flex-end;
		gap: 0.55rem;
	}
	.actions,
	.summary,
	.filters {
		flex-wrap: wrap;
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
	.filters {
		display: flex;
		gap: 0.35rem;
		overflow-x: auto;
		padding: 0.6rem 1rem;
	}
	.filters button {
		background: #111827;
		border-color: #334155;
		color: #cbd5e1;
		white-space: nowrap;
	}
	.filters button.active {
		background: #0ea5e9;
		border-color: #0284c7;
		color: #082f49;
	}
	.filters span {
		margin-left: 0.25rem;
		font-variant-numeric: tabular-nums;
	}
	.summary {
		padding: 0.45rem 1rem;
		background: #0f172a;
		font-size: 0.74rem;
		color: #cbd5e1;
	}
	.summary span {
		font-variant-numeric: tabular-nums;
	}
	.summary button {
		margin-left: auto;
		padding-block: 0.3rem;
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
	}
	.catalog {
		border-right: 1px solid #1e293b;
	}
	.rows,
	.detail-list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.rows li {
		border-bottom: 1px solid #1e293b;
		padding: 0.75rem 1rem;
	}
	.rows li.selected {
		background: #102033;
	}
	.row-button {
		display: flex;
		width: 100%;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.25rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: inherit;
		text-align: left;
	}
	.row-title {
		font-size: 0.86rem;
		font-weight: 700;
		color: #f8fafc;
		overflow-wrap: anywhere;
	}
	.content {
		color: #cbd5e1;
		font-size: 0.75rem;
		line-height: 1.35;
	}
	.row-meta,
	.row-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
		margin-top: 0.5rem;
	}
	.tag,
	.scope,
	.count {
		font-size: 0.68rem;
	}
	.tag {
		border: 1px solid #334155;
		background: #111827;
		padding: 0.12rem 0.38rem;
		border-radius: 999px;
	}
	.severity {
		color: #facc15;
	}
	.invalid {
		color: #fca5a5;
	}
	.row-actions button,
	.link-button {
		padding: 0.22rem 0.45rem;
		font-size: 0.68rem;
		background: #111827;
		border-color: #334155;
		color: #bae6fd;
	}
	.result {
		padding: 1rem;
	}
	.result-head {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		align-items: flex-start;
		margin-bottom: 1rem;
	}
	.detail-line {
		color: #cbd5e1;
		font-size: 0.82rem;
		line-height: 1.45;
	}
	.cards {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.6rem;
		margin: 1rem 0;
	}
	.cards div {
		border: 1px solid #1e293b;
		background: #111827;
		border-radius: 6px;
		padding: 0.65rem;
	}
	.cards strong,
	.cards span {
		display: block;
	}
	.cards strong {
		font-size: 1.2rem;
		color: #f8fafc;
	}
	.cards span {
		margin-top: 0.15rem;
		font-size: 0.7rem;
		color: #94a3b8;
	}
	.detail-list {
		margin-top: 0.45rem;
		display: grid;
		gap: 0.35rem;
	}
	.detail-list li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		border: 1px solid #1e293b;
		background: #0f172a;
		border-radius: 6px;
		padding: 0.45rem 0.55rem;
		font-size: 0.75rem;
		color: #cbd5e1;
	}
	details {
		margin-top: 1rem;
		border-top: 1px solid #1e293b;
		padding-top: 0.75rem;
	}
	summary {
		cursor: pointer;
		color: #38bdf8;
		font-size: 0.78rem;
	}
	.error {
		padding: 0.5rem 1rem;
		color: #fca5a5;
		border-bottom: 1px solid #7f1d1d;
		background: #2f1518;
	}
	.muted {
		padding: 1rem;
	}
</style>
