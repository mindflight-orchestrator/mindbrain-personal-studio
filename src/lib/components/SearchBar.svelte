<script lang="ts">
	type Mode = 'graph' | 'bm25';

	type SearchResult = {
		key: string;
		label: string;
		subtitle?: string;
		entityId?: number;
		raw: Record<string, unknown>;
	};

	let {
		workspaceId = 'default',
		entityType = null,
		onSeeds
	}: {
		workspaceId?: string;
		entityType?: string | null;
		onSeeds?: (ids: number[]) => void;
	} = $props();

	let mode = $state<Mode>('graph');
	let query = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let results = $state<SearchResult[]>([]);
	let focusedKey = $state('');

	function resultEntityId(row: Record<string, unknown>): number | null {
		const id = Number(row.entity_id ?? row.id);
		return Number.isFinite(id) && id > 0 ? id : null;
	}

	function mapGraphRows(rows: Array<Record<string, unknown>>): SearchResult[] {
		return rows.map((row) => {
			const entityId = resultEntityId(row);
			return {
				key: String(entityId ?? row.name ?? crypto.randomUUID()),
				label: String(row.name ?? row.entity_type ?? entityId ?? 'result'),
				subtitle: row.score == null ? String(row.entity_type ?? '') : `score ${Number(row.score).toFixed(2)}`,
				entityId: entityId ?? undefined,
				raw: row
			};
		});
	}

	function mapBm25Rows(rows: Array<Record<string, unknown>>): SearchResult[] {
		return rows.map((row) => {
			const entityId = resultEntityId(row);
			const score = row.score ?? row.rank;
			const excerpt = String(row.excerpt ?? row.content ?? row.snippet ?? '').slice(0, 120);
			return {
				key: String(row.doc_id ?? entityId ?? crypto.randomUUID()),
				label: String(row.title ?? row.doc_id ?? row.name ?? 'document'),
				subtitle: [
					score == null ? null : `score ${Number(score).toFixed(2)}`,
					excerpt || null
				]
					.filter(Boolean)
					.join(' · '),
				entityId: entityId ?? undefined,
				raw: row
			};
		});
	}

	async function runSearch() {
		loading = true;
		error = null;
		results = [];
		focusedKey = '';
		try {
			const ws = workspaceId.trim() || 'default';
			if (mode === 'graph') {
				const params = new URLSearchParams({ workspace_id: ws, query, limit: '20' });
				if (entityType) params.set('entity_type', entityType);
				const res = await fetch(`/api/brain/ghostcrab/graph-search?${params}`);
				if (!res.ok) throw new Error(await res.text());
				const data = (await res.json()) as { rows?: Array<Record<string, unknown>> };
				results = mapGraphRows(data.rows ?? []);
				onSeeds?.(results.map((r) => r.entityId).filter((id): id is number => id != null));
			} else {
				const res = await fetch('/api/brain/ghostcrab/search', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						workspace_id: ws,
						query,
						embedding: [],
						vector_weight: 0,
						limit: 20
					})
				});
				if (!res.ok) throw new Error(await res.text());
				const data = (await res.json()) as { matches?: Array<Record<string, unknown>> };
				results = mapBm25Rows(data.matches ?? []);
				onSeeds?.(results.map((r) => r.entityId).filter((id): id is number => id != null));
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}

	function focusResult(result: SearchResult) {
		if (result.entityId == null) return;
		focusedKey = result.key;
		onSeeds?.([result.entityId]);
	}

	function clearResultFocus() {
		focusedKey = '';
		onSeeds?.([]);
	}
</script>

<section class="search" aria-label="Graph search">
	<form
		class="search-form"
		onsubmit={(e) => {
			e.preventDefault();
			void runSearch();
		}}
	>
	<select bind:value={mode} aria-label="Search mode">
		<option value="graph">Graph</option>
		<option value="bm25">BM25</option>
	</select>
	<input bind:value={query} placeholder="Search graph" aria-label="Search query" />
	<button type="submit" disabled={loading}>
		{loading ? 'Searching' : 'Search'}
	</button>
	</form>
</section>
{#if error}
	<p class="search-error">{error}</p>
{/if}
{#if results.length > 0}
	<div class="results">
		{#each results.slice(0, 8) as result}
			<div class="result-wrap" class:focused={focusedKey === result.key}>
				<button type="button" class="result" onclick={() => focusResult(result)} disabled={result.entityId == null}>
					<span class="result-label">{result.label}</span>
					{#if result.subtitle}
						<span class="result-sub">{result.subtitle}</span>
					{/if}
				</button>
				{#if focusedKey === result.key}
					<button
						type="button"
						class="clear-result"
						aria-label={`Clear search focus for ${result.label}`}
						title="Clear search focus"
						onclick={clearResultFocus}
					>
						×
					</button>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.search,
	.search-form,
	.results {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
	}

	.search-form {
		flex: 1 1 auto;
		min-width: 0;
	}
	.search {
		padding: 0.45rem 0.75rem;
		border-bottom: 1px solid #1e293b;
		background: #0f172a;
	}
	select,
	input {
		background: #1e293b;
		border: 1px solid #334155;
		color: #e2e8f0;
		border-radius: 6px;
		padding: 0.35rem 0.5rem;
		font-size: 0.78rem;
	}
	input {
		min-width: 12rem;
	}
	button {
		background: #0ea5e9;
		border: 0;
		border-radius: 6px;
		color: #082f49;
		cursor: pointer;
		padding: 0.38rem 0.65rem;
		font-size: 0.78rem;
	}
	button:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	.search-error {
		margin: 0;
		padding: 0.35rem 0.75rem;
		color: #f87171;
		background: #0f172a;
		font-size: 0.75rem;
	}
	.results {
		padding: 0.35rem 0.75rem;
		background: #0f172a;
		border-bottom: 1px solid #1e293b;
	}
	.result {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		background: #1e293b;
		color: #e2e8f0;
		max-width: 14rem;
	}
	.result-wrap {
		position: relative;
		display: inline-flex;
		align-items: stretch;
	}
	.result-wrap.focused .result {
		padding-right: 1.85rem;
		border: 1px solid #38bdf8;
	}
	.clear-result {
		position: absolute;
		top: 0.18rem;
		right: 0.18rem;
		width: 1.2rem;
		height: 1.2rem;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: 1px solid #334155;
		border-radius: 999px;
		background: #020617;
		color: #cbd5e1;
		font-size: 0.85rem;
		line-height: 1;
	}
	.clear-result:hover {
		background: #1e293b;
		color: #f8fafc;
	}
	.result-label {
		font-weight: 600;
	}
	.result-sub {
		font-size: 0.68rem;
		color: #94a3b8;
		text-align: left;
	}
</style>
