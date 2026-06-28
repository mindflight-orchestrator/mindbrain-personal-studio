/**
 * Graph visuals derived from the loaded payload: any namespace (CRM, ERP, wiki, …)
 * gets stable colours from schema_id / node_type. AI Act keeps semantic tiers when
 * schema_id is under the ai-act: prefix.
 */

export type GraphNodeDTO = {
	id: string;
	label: string | null;
	node_type: string | null;
	schema_id: string | null;
	/** Optional facets JSON, keyed by agent-oriented dimensions. */
	facets?: unknown | null;
};

export type GraphEdgeDTO = {
	label: string | null;
};

type GraphEdgeForFilter = {
	source: string;
	target: string;
	label?: string | null;
};

export type NodeVisualAttrs = {
	color: string;
	labelColor: string;
	size: number;
	zIndex: number;
};

/** Click-to-filter on facet legend rows (GraphCanvas). */
export type FacetFilter =
	| { kind: 'scalar'; key: string; value: string }
	| { kind: 'abstraction'; value: string }
	| { kind: 'chantier_week_neighborhood'; week: string }
	| { kind: 'audit_phase_neighborhood'; phase: string }
	| { kind: 'platform_hull'; platformId: string };

export type LegendRow = { swatch: string; label: string; facetFilter?: FacetFilter };
export type LegendSection = { title: string; rows: LegendRow[] };

/** BFS depth from a Platform node for hull highlight. */
export const PLATFORM_HULL_DEPTH = 3;
/** Neighbor expansion from week-matched nodes (chantier timelapse). */
export const CHANTIER_WEEK_GRAPH_DEPTH = 2;
/** Neighbor expansion from phase-matched audit nodes (SEO audit timeline). */
export const AUDIT_PHASE_GRAPH_DEPTH = 2;

export type GraphVisualPlan = {
	styleNode: (n: GraphNodeDTO) => NodeVisualAttrs;
	edgeColor: (label: string | null | undefined) => string;
	legendSections: LegendSection[];
};

/** AI Act–oriented tiers (0 = top); only applied to nodes with schema_id prefix `ai-act:`. */
export const TIER_PALETTES = [
	{
		name: 'Chapters',
		fills: ['#fbbf24', '#f59e0b', '#eab308', '#ca8a04'],
		label: '#fffbeb'
	},
	{
		name: 'Articles & annexes',
		fills: ['#38bdf8', '#22d3ee', '#0ea5e9', '#06b6d4'],
		label: '#ecfeff'
	},
	{
		name: 'Concepts & obligations',
		fills: ['#a78bfa', '#818cf8', '#c084fc', '#34d399', '#f472b6'],
		label: '#f5f3ff'
	},
	{
		name: 'Other (AI Act tier)',
		fills: ['#94a3b8', '#78716c', '#64748b', '#737373'],
		label: '#f8fafc'
	}
] as const;

const DEFAULT_EDGE_COLOR = '#64748b';
const MAX_NODE_TYPE_ROWS = 56;
const MAX_EDGE_TYPE_ROWS = 36;
/** Mixed-graph view: avoid listing every schema_id / edge label. */
const MAX_NAMESPACES_ALL = 40;
const MAX_EDGE_LABELS_ALL = 14;
/** Facet dimension rows in the bottom-right legend (per section). */
const MAX_FACET_VALUE_ROWS = 18;
/** Skip facet aggregation legend when the payload is huge (client-side cost). */
const MAX_NODES_FOR_FACET_LEGEND = 8000;

function hashString(input: string): number {
	let h = 2166136261;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/**
 * Sigma/WebGL only accepts #hex or rgb()/rgba() (see sigma parseColor), not hsl().
 */
function hslToHex(h: number, sPct: number, lPct: number): string {
	const hh = ((h % 360) + 360) % 360;
	const s = sPct / 100;
	const l = lPct / 100;
	const c = (1 - Math.abs(2 * l - 1)) * s;
	const hp = hh / 60;
	const x = c * (1 - Math.abs((hp % 2) - 1));
	let r1 = 0;
	let g1 = 0;
	let b1 = 0;
	if (hp >= 0 && hp < 1) [r1, g1, b1] = [c, x, 0];
	else if (hp < 2) [r1, g1, b1] = [x, c, 0];
	else if (hp < 3) [r1, g1, b1] = [0, c, x];
	else if (hp < 4) [r1, g1, b1] = [0, x, c];
	else if (hp < 5) [r1, g1, b1] = [x, 0, c];
	else [r1, g1, b1] = [c, 0, x];
	const m = l - c / 2;
	const r = Math.round((r1 + m) * 255);
	const g = Math.round((g1 + m) * 255);
	const b = Math.round((b1 + m) * 255);
	return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Stable saturated colour per key (hex, Sigma-compatible). */
export function hslForKey(key: string, salt = 0): string {
	const hue = hashString(`${salt}\0${key}`) % 360;
	const s = 58 + (hashString(key) % 12);
	const l = 52 + (hashString(key + 'L') % 10);
	return hslToHex(hue, s, l);
}

function pickFill(tier: number, id: string): string {
	const palette = TIER_PALETTES[Math.min(tier, TIER_PALETTES.length - 1)];
	const fills = palette.fills;
	let h = 0;
	for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
	return fills[h % fills.length] as string;
}

function tierForAiAct(n: GraphNodeDTO): number {
	const f = readFacetsObject(n);
	const facetType = f ? facetScalarString(f, 'entity_type') : null;
	const t = (n.node_type || facetType || '').toLowerCase();
	const s = (n.schema_id || '').toLowerCase();

	if (t === 'document' || t === 'chapter' || t === 'section' || s.includes('chapter')) return 0;
	if (
		t === 'article' ||
		t === 'paragraph' ||
		t === 'recital' ||
		t === 'annex' ||
		t === 'annex-entry' ||
		t === 'definition' ||
		s.includes(':article') ||
		s.includes(':annex')
	) return 1;
	if (
		[
			'concept',
			'role',
			'obligation',
			'risk-level',
			'deadline',
			'domain',
			'penalty',
			'penalty-tier',
			'risk-level',
			'ai-system-category',
			'stakeholder-role',
			'obligation-type',
			'sector',
			'fundamental-right',
			'exemption',
			'usecase',
			'classification',
			'intent-pattern',
			'user-profile',
			'project-stage',
			'facet-vector',
			'answer-template',
			'query-example',
			'decision',
			'task',
			'constraint',
			'source',
			'note',
			'integration',
			'environment'
		].some((k) => t === k || t.includes(k)) ||
		/ai-act:(concept|obligation|role|risk|deadline|domain|penalty|recital|usecase)/.test(s)
	) {
		return 2;
	}
	return 3;
}

function isAiActSchema(n: GraphNodeDTO): boolean {
	const s = (n.schema_id || '').trim().toLowerCase();
	if (s.startsWith('ai-act:')) return true;
	const f = readFacetsObject(n);
	if (!f) return false;
	const workspace = facetScalarString(f, 'workspace_id') ?? facetScalarString(f, 'workspace');
	const recordId = facetScalarString(f, 'record_id') ?? facetScalarString(f, 'source_ref');
	const ontologyLayer = facetScalarString(f, 'ontology_layer');
	if (
		workspace?.toLowerCase() === 'ai-act' &&
		(ontologyLayer || (recordId && !recordId.toLowerCase().startsWith('workspace:ai-act:loadout')))
	) return true;
	if (recordId?.toLowerCase().startsWith('ai-act:')) return true;
	const celex = facetScalarString(f, 'celex');
	if (celex === '32024R1689') return true;
	const legalVersion = facetScalarString(f, 'legal_version');
	if (legalVersion?.toLowerCase().includes('ai act')) return true;
	const sourceRef = facetScalarString(f, 'source_ref');
	return Boolean(
		ontologyLayer &&
		(sourceRef?.includes('L_202401689') || sourceRef?.toLowerCase().includes('ai_act'))
	);
}

/**
 * Stable category for colouring: prefer schema_id, else node_type, else untyped.
 */
export function categoryKeyForNode(n: GraphNodeDTO): string {
	const sid = (n.schema_id || '').trim();
	if (sid !== '') return sid;
	const nt = (n.node_type || '').trim();
	if (nt !== '') return `type:${nt}`;
	return '(no schema / type)';
}

/**
 * Ontology prefix for mixed-graph colouring / summary legend (before first ':').
 * AI Act nodes are still styled by tier; their namespace is not used for this key.
 */
export function namespaceKeyForNode(n: GraphNodeDTO): string {
	const sid = (n.schema_id || '').trim();
	if (sid === '') {
		const nt = (n.node_type || '').trim();
		return nt !== '' ? `(type: ${nt})` : '(no namespace)';
	}
	const i = sid.indexOf(':');
	return i === -1 ? sid : sid.slice(0, i);
}

function styleAiActNode(n: GraphNodeDTO): NodeVisualAttrs {
	const tier = tierForAiAct(n);
	const baseSizes = [11, 9, 7, 5.5];
	const baseZ = [12, 9, 6, 3];
	const palette = TIER_PALETTES[Math.min(tier, TIER_PALETTES.length - 1)];
	return {
		color: pickFill(tier, n.id),
		labelColor: palette.label,
		size: baseSizes[tier] ?? 6,
		zIndex: baseZ[tier] ?? 0
	};
}

function legendWithCount(base: string, n: number): string {
	return `${base} (${n})`;
}

function countAiActNodesPerTier(nodes: GraphNodeDTO[]): [number, number, number, number] {
	const c: [number, number, number, number] = [0, 0, 0, 0];
	for (const n of nodes) {
		if (!isAiActSchema(n)) continue;
		const t = Math.min(Math.max(tierForAiAct(n), 0), 3);
		c[t]++;
	}
	return c;
}

function countByKey(nodes: GraphNodeDTO[], keyFn: (n: GraphNodeDTO) => string): Map<string, number> {
	const m = new Map<string, number>();
	for (const n of nodes) {
		const k = keyFn(n);
		m.set(k, (m.get(k) ?? 0) + 1);
	}
	return m;
}

function countEdgesByLabel(edges: GraphEdgeDTO[]): Map<string, number> {
	const m = new Map<string, number>();
	for (const e of edges) {
		const l = (e.label ?? '').trim();
		if (l === '') continue;
		m.set(l, (m.get(l) ?? 0) + 1);
	}
	return m;
}

function readFacetsObject(n: GraphNodeDTO): Record<string, unknown> | null {
	const f = n.facets;
	if (f == null || typeof f !== 'object' || Array.isArray(f)) return null;
	return f as Record<string, unknown>;
}

function facetScalarString(f: Record<string, unknown>, key: string): string | null {
	const v = f[key];
	if (v == null) return null;
	const s = String(v).trim();
	return s === '' ? null : s;
}

const ABSTRACTION_TAG_PREFIX = 'abstraction_level:';

function facetAbstractionLevels(f: Record<string, unknown>): string[] {
	const tags = f.facet_tags;
	if (!Array.isArray(tags)) return [];
	const out: string[] = [];
	for (const t of tags) {
		if (typeof t !== 'string' || !t.startsWith(ABSTRACTION_TAG_PREFIX)) continue;
		const rest = t.slice(ABSTRACTION_TAG_PREFIX.length).trim();
		if (rest !== '') out.push(rest);
	}
	return out;
}

function countFacetScalarDimension(
	nodes: GraphNodeDTO[],
	key: string
): { counts: Map<string, number>; covered: number } {
	const counts = new Map<string, number>();
	let covered = 0;
	for (const n of nodes) {
		const f = readFacetsObject(n);
		if (!f) continue;
		const v = facetScalarString(f, key);
		if (v == null) continue;
		covered++;
		counts.set(v, (counts.get(v) ?? 0) + 1);
	}
	return { counts, covered };
}

function countFacetAbstractionTags(nodes: GraphNodeDTO[]): { counts: Map<string, number>; covered: number } {
	const counts = new Map<string, number>();
	let covered = 0;
	for (const n of nodes) {
		const f = readFacetsObject(n);
		if (!f) continue;
		const levels = facetAbstractionLevels(f);
		if (levels.length === 0) continue;
		covered++;
		for (const lv of levels) {
			counts.set(lv, (counts.get(lv) ?? 0) + 1);
		}
	}
	return { counts, covered };
}

type FacetLegendRowMode =
	| { mode: 'scalar'; key: string }
	| { mode: 'abstraction' }
	| { mode: 'chantier_week' }
	| { mode: 'audit_phase' };

function buildUndirectedAdj(edges: GraphEdgeForFilter[]): Map<string, Set<string>> {
	const adj = new Map<string, Set<string>>();
	for (const e of edges) {
		if (!adj.has(e.source)) adj.set(e.source, new Set());
		if (!adj.has(e.target)) adj.set(e.target, new Set());
		adj.get(e.source)!.add(e.target);
		adj.get(e.target)!.add(e.source);
	}
	return adj;
}

/** All nodes within `hops` undirected steps from any seed (matches ego-depth style in neighborhood.ts). */
function nodesWithinUndirectedHops(
	seeds: Set<string>,
	edges: GraphEdgeForFilter[],
	hops: number,
	canVisit?: (id: string) => boolean
): Set<string> {
	if (seeds.size === 0) return new Set();
	const adj = buildUndirectedAdj(edges);
	const result = new Set<string>(seeds);
	let frontier = [...seeds];
	for (let d = 0; d < hops; d++) {
		const next: string[] = [];
		for (const n of frontier) {
			for (const m of adj.get(n) ?? []) {
				if (canVisit && !canVisit(m)) continue;
				if (!result.has(m)) {
					result.add(m);
					next.push(m);
				}
			}
		}
		frontier = next;
	}
	return result;
}

function auditPhaseForNode(n: GraphNodeDTO): string | null {
	const f = readFacetsObject(n);
	if (!f) return null;
	return facetScalarString(f, 'audit_phase') ?? facetScalarString(f, 'run_stage');
}

/**
 * Resolve which node ids match a facet legend filter (scalar / abstraction / chantier week / platform hull).
 */
export function computeNodeIdsMatchingFilter(
	nodes: GraphNodeDTO[],
	edges: GraphEdgeForFilter[],
	filter: FacetFilter
): Set<string> {
	if (filter.kind === 'scalar') {
		const out = new Set<string>();
		for (const n of nodes) {
			const f = readFacetsObject(n);
			if (!f) continue;
			if (facetScalarString(f, filter.key) === filter.value) out.add(n.id);
		}
		return out;
	}
	if (filter.kind === 'abstraction') {
		const out = new Set<string>();
		for (const n of nodes) {
			const f = readFacetsObject(n);
			if (!f) continue;
			if (facetAbstractionLevels(f).includes(filter.value)) out.add(n.id);
		}
		return out;
	}
	if (filter.kind === 'chantier_week_neighborhood') {
		const seeds = new Set<string>();
		for (const n of nodes) {
			const f = readFacetsObject(n);
			if (!f) continue;
			const w = facetScalarString(f, 'week_number');
			if (w === filter.week) seeds.add(n.id);
		}
		return nodesWithinUndirectedHops(seeds, edges, CHANTIER_WEEK_GRAPH_DEPTH);
	}
	if (filter.kind === 'audit_phase_neighborhood') {
		const seeds = new Set<string>();
		const nodeById = new Map(nodes.map((n) => [n.id, n]));
		for (const n of nodes) {
			const phase = auditPhaseForNode(n);
			if (phase === filter.phase) seeds.add(n.id);
		}
		return nodesWithinUndirectedHops(seeds, edges, AUDIT_PHASE_GRAPH_DEPTH, (id) => {
			const n = nodeById.get(id);
			if (!n) return false;
			const phase = auditPhaseForNode(n);
			return phase == null || phase === filter.phase;
		});
	}
	// platform_hull
	return nodesWithinUndirectedHops(new Set([filter.platformId]), edges, PLATFORM_HULL_DEPTH);
}

function facetLegendSection(
	dimensionLabel: string,
	counts: Map<string, number>,
	covered: number,
	maxRows: number,
	hslSalt: number,
	rowMode: FacetLegendRowMode
): LegendSection | null {
	if (counts.size === 0 || covered === 0) return null;
	const sorted = [...counts.entries()].sort(
		(a, b) => b[1] - a[1] || a[0].localeCompare(b[0], undefined, { sensitivity: 'base' })
	);
	const shown = sorted.slice(0, maxRows);
	const rows: LegendRow[] = shown.map(([value, c]) => {
		let facetFilter: FacetFilter | undefined;
		if (rowMode.mode === 'scalar') {
			facetFilter = { kind: 'scalar', key: rowMode.key, value };
		} else if (rowMode.mode === 'abstraction') {
			facetFilter = { kind: 'abstraction', value };
		} else if (rowMode.mode === 'chantier_week') {
			facetFilter = { kind: 'chantier_week_neighborhood', week: value };
		} else {
			facetFilter = { kind: 'audit_phase_neighborhood', phase: value };
		}
		return {
			swatch: hslForKey(`facet:${dimensionLabel}:${value}`, hslSalt),
			label: legendWithCount(value, c),
			facetFilter
		};
	});
	if (sorted.length > maxRows) {
		const hidden = sorted.slice(maxRows);
		const hiddenCount = hidden.reduce((s, [, c]) => s + c, 0);
		rows.push({
			swatch: '#64748b',
			label: `… +${sorted.length - maxRows} more values (${hiddenCount} counts)`
		});
	}
	return {
		title: `${dimensionLabel} (${covered})`,
		rows
	};
}

/**
 * Legend blocks for facet dimensions (agent-oriented attributes), when nodes carry `facets` from the API.
 */
export function buildFacetLegendSections(nodes: GraphNodeDTO[]): LegendSection[] {
	if (nodes.length === 0 || nodes.length > MAX_NODES_FOR_FACET_LEGEND) return [];

	const withFacets = nodes.filter((n) => {
		const f = readFacetsObject(n);
		return f != null && Object.keys(f).length > 0;
	});
	if (withFacets.length === 0) return [];

	type DimSpec = { kind: 'scalar'; label: string; key: string } | { kind: 'abstraction' };

	const order: DimSpec[] = [
		{ kind: 'scalar', label: 'AI layer', key: 'ontology_layer' },
		{ kind: 'scalar', label: 'AI entity type', key: 'entity_type' },
		{ kind: 'scalar', label: 'risk level', key: 'risk_level' },
		{ kind: 'scalar', label: 'stakeholder role', key: 'stakeholder_role' },
		{ kind: 'scalar', label: 'obligation type', key: 'obligation_type' },
		{ kind: 'scalar', label: 'sector', key: 'sector' },
		{ kind: 'scalar', label: 'penalty tier', key: 'penalty_tier' },
		{ kind: 'scalar', label: 'deadline', key: 'deadline' },
		{ kind: 'scalar', label: 'fundamental right', key: 'fundamental_right' },
		{ kind: 'scalar', label: 'intent', key: 'intent_primary' },
		{ kind: 'scalar', label: 'answer granularity', key: 'answer_granularity' },
		{ kind: 'scalar', label: 'geo scope', key: 'geo_scope' },
		{ kind: 'scalar', label: 'validation', key: 'validation_status' },
		{ kind: 'scalar', label: 'audit phase', key: 'audit_phase' },
		{ kind: 'scalar', label: 'graph layer', key: 'graph_layer' },
		{ kind: 'scalar', label: 'semantic group', key: 'semantic_group' },
		{ kind: 'scalar', label: 'severity', key: 'severity' },
		{ kind: 'scalar', label: 'status', key: 'status' },
		{ kind: 'scalar', label: 'issue category', key: 'issue_category' },
		{ kind: 'scalar', label: 'page tier', key: 'page_tier' },
		{ kind: 'scalar', label: 'device', key: 'device' },
		{ kind: 'scalar', label: 'channel', key: 'channel' },
		{ kind: 'scalar', label: 'position bucket', key: 'position_bucket' },
		{ kind: 'scalar', label: 'domain', key: 'domain' },
		{ kind: 'scalar', label: 'week (chantier)', key: 'week_number' },
		{ kind: 'scalar', label: 'provider', key: 'provider' },
		{ kind: 'scalar', label: 'tier', key: 'tier' },
		{ kind: 'scalar', label: 'complexity', key: 'complexity' },
		{ kind: 'abstraction' },
		{ kind: 'scalar', label: 'action verb', key: 'action_verb' },
		{ kind: 'scalar', label: 'composability', key: 'composability' },
		{ kind: 'scalar', label: 'specificity', key: 'specificity' },
		{ kind: 'scalar', label: 'input type', key: 'input_type' },
		{ kind: 'scalar', label: 'output format', key: 'output_format' },
		{ kind: 'scalar', label: 'dependency type', key: 'dependency_type' },
		{ kind: 'scalar', label: 'interaction mode', key: 'interaction_mode' }
	];

	const sections: LegendSection[] = [];
	let salt = 11;

	for (const spec of order) {
		if (spec.kind === 'scalar') {
			const { counts, covered } = countFacetScalarDimension(nodes, spec.key);
			const rowMode: FacetLegendRowMode =
				spec.key === 'week_number'
					? { mode: 'chantier_week' }
					: spec.key === 'audit_phase'
						? { mode: 'audit_phase' }
					: { mode: 'scalar', key: spec.key };
			const sec = facetLegendSection(
				spec.label,
				counts,
				covered,
				MAX_FACET_VALUE_ROWS,
				salt++,
				rowMode
			);
			if (sec) sections.push(sec);
		} else {
			const abs = countFacetAbstractionTags(nodes);
			const absSec = facetLegendSection(
				'abstraction (from tags)',
				abs.counts,
				abs.covered,
				MAX_FACET_VALUE_ROWS,
				salt++,
				{ mode: 'abstraction' }
			);
			if (absSec) sections.push(absSec);
		}
	}

	return sections;
}

function buildPlatformHullLegendSection(nodes: GraphNodeDTO[]): LegendSection | null {
	const platforms = nodes.filter((n) => (n.node_type || '').trim() === 'Platform');
	if (platforms.length === 0) return null;
	const rows: LegendRow[] = platforms.map((n) => {
		const title = (n.label || n.id).trim();
		return {
			swatch: hslForKey(`platform-hull:${n.id}`, 42),
			label: `Ship · ${title}`,
			facetFilter: { kind: 'platform_hull', platformId: n.id } as const
		};
	});
	return { title: `Ship hull (≤${PLATFORM_HULL_DEPTH} hops)`, rows };
}

/**
 * Build node/edge styling and legend from the current graph payload (no hardcoded ontology list).
 *
 * Legend scope:
 * - Filtered ontology (not `all`): only this subgraph — full `schema_id` / type rows + edge labels;
 *   AI Act tier block only if the filter is `ai-act` and the payload contains AI Act nodes.
 * - `all`: compact legend — AI Act tiers when such nodes exist; other nodes = one row per namespace
 *   (node colour matches prefix); edge labels capped; tip to narrow the ontology filter.
 */
export function buildGraphVisualPlan(
	nodes: GraphNodeDTO[],
	edges: GraphEdgeDTO[],
	ontologyKey: string
): GraphVisualPlan {
	const isAllView = ontologyKey === 'all';
	const aiActNodes = nodes.filter(isAiActSchema);
	const genericNodes = nodes.filter((n) => !isAiActSchema(n));

	const tierCounts = countAiActNodesPerTier(aiActNodes);
	const edgeCountByLabel = countEdgesByLabel(edges);

	const stylingKeys = isAllView
		? [...new Set(genericNodes.map(namespaceKeyForNode))].sort((a, b) =>
				a.localeCompare(b, undefined, { sensitivity: 'base' })
			)
		: [...new Set(genericNodes.map(categoryKeyForNode))].sort((a, b) =>
				a.localeCompare(b, undefined, { sensitivity: 'base' })
			);

	const colorByKey = new Map<string, string>();
	const keyIndex = new Map<string, number>();
	stylingKeys.forEach((k, i) => {
		colorByKey.set(k, hslForKey(k));
		keyIndex.set(k, i);
	});

	const edgeLabels = [
		...new Set(
			edges
				.map((e) => (e.label ?? '').trim())
				.filter((l) => l.length > 0)
		)
	].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

	const edgeColorByLabel = new Map<string, string>();
	for (const lab of edgeLabels) {
		edgeColorByLabel.set(lab, hslForKey(lab, 7));
	}

	const nodeCountByStylingKey = countByKey(
		genericNodes,
		isAllView ? namespaceKeyForNode : categoryKeyForNode
	);

	function genericCategoryForStyle(n: GraphNodeDTO): string {
		return isAllView ? namespaceKeyForNode(n) : categoryKeyForNode(n);
	}

	function styleNode(n: GraphNodeDTO): NodeVisualAttrs {
		if (isAiActSchema(n)) return styleAiActNode(n);
		const key = genericCategoryForStyle(n);
		const color = colorByKey.get(key) ?? hslForKey(key);
		const idx = keyIndex.get(key) ?? 0;
		let size = 6.6 + (hashString(key) % 5) * 0.55;
		let zIndex = 4 + (idx % 8);
		const nt = (n.node_type || '').trim();
		// Make sparse “anchor” entities readable in dense runtime graphs (ships, key assets).
		if (nt === 'Platform') {
			size = Math.max(size, 17);
			zIndex = Math.max(zIndex, 24);
		} else if (nt === 'OTSystem' || nt === 'ITSystem' || nt === 'Emitter' || nt === 'Network') {
			size = Math.max(size, 11);
			zIndex = Math.max(zIndex, 14);
		}
		return {
			color,
			labelColor: '#f8fafc',
			size,
			zIndex
		};
	}

	function edgeColor(label: string | null | undefined): string {
		if (label == null) return DEFAULT_EDGE_COLOR;
		const t = label.trim();
		if (t === '') return DEFAULT_EDGE_COLOR;
		return edgeColorByLabel.get(t) ?? hslForKey(t, 7);
	}

	const sections: LegendSection[] = [];
	const facetSections = buildFacetLegendSections(nodes);
	const facetSectionsPlacedEarly = facetSections.length > 0 && aiActNodes.length > 0;

	if (aiActNodes.length > 0 && (ontologyKey === 'ai-act' || ontologyKey === 'all')) {
		sections.push({
			title: legendWithCount('AI Act (node tiers)', aiActNodes.length),
			rows: TIER_PALETTES.map((row, i) => ({
				swatch: row.fills[0],
				label: legendWithCount(row.name, tierCounts[i] ?? 0)
			}))
		});
	}
	if (facetSectionsPlacedEarly) {
		sections.push(...facetSections);
	}

	if (isAllView) {
		if (stylingKeys.length > 0) {
			const totalGeneric = genericNodes.length;
			const shown = stylingKeys.slice(0, MAX_NAMESPACES_ALL);
			const rows: LegendRow[] = shown.map((k) => ({
				swatch: colorByKey.get(k) ?? hslForKey(k),
				label: legendWithCount(k, nodeCountByStylingKey.get(k) ?? 0)
			}));
			if (stylingKeys.length > MAX_NAMESPACES_ALL) {
				const hiddenKeys = stylingKeys.slice(MAX_NAMESPACES_ALL);
				const hiddenCount = hiddenKeys.reduce((s, k) => s + (nodeCountByStylingKey.get(k) ?? 0), 0);
				rows.push({
					swatch: '#64748b',
					label: `… +${stylingKeys.length - MAX_NAMESPACES_ALL} more namespaces (${hiddenCount} nodes)`
				});
			}
			sections.push({
				title: legendWithCount('Ontologies (node colour = prefix)', totalGeneric),
				rows
			});
		}

		if (edgeLabels.length > 0) {
			const totalEdges = edges.length;
			const shownE = edgeLabels.slice(0, MAX_EDGE_LABELS_ALL);
			const rows: LegendRow[] = shownE.map((l) => ({
				swatch: edgeColorByLabel.get(l) ?? hslForKey(l, 7),
				label: legendWithCount(l, edgeCountByLabel.get(l) ?? 0)
			}));
			const rest = edgeLabels.length - shownE.length;
			if (rest > 0) {
				rows.push({
					swatch: '#64748b',
					label: `… +${rest} more relation types — pick one ontology to list only those`
				});
			}
			sections.push({
				title: legendWithCount(`Relations (sample of ${edgeLabels.length} types)`, totalEdges),
				rows
			});
		}

		sections.push({
			title: 'Tip',
			rows: [
				{
					swatch: '#334155',
					label: 'Choose an ontology in the header for full types & relations'
				}
			]
		});
	} else {
		if (stylingKeys.length > 0) {
			const totalGeneric = genericNodes.length;
			const shown = stylingKeys.slice(0, MAX_NODE_TYPE_ROWS);
			const rows: LegendRow[] = shown.map((k) => ({
				swatch: colorByKey.get(k) ?? hslForKey(k),
				label: legendWithCount(k, nodeCountByStylingKey.get(k) ?? 0)
			}));
			if (stylingKeys.length > MAX_NODE_TYPE_ROWS) {
				const hiddenKeys = stylingKeys.slice(MAX_NODE_TYPE_ROWS);
				const hiddenCount = hiddenKeys.reduce((s, k) => s + (nodeCountByStylingKey.get(k) ?? 0), 0);
				rows.push({
					swatch: '#64748b',
					label: `… +${stylingKeys.length - MAX_NODE_TYPE_ROWS} more schema / type keys (${hiddenCount} nodes)`
				});
			}
			const baseTitle =
				ontologyKey === '_none'
					? 'Nodes (schema / type)'
					: `Nodes — ${ontologyKey} (schema_id / type)`;
			sections.push({ title: legendWithCount(baseTitle, totalGeneric), rows });
		}

		if (edgeLabels.length > 0) {
			const totalEdges = edges.length;
			const shownE = edgeLabels.slice(0, MAX_EDGE_TYPE_ROWS);
			const rows: LegendRow[] = shownE.map((l) => ({
				swatch: edgeColorByLabel.get(l) ?? hslForKey(l, 7),
				label: legendWithCount(l, edgeCountByLabel.get(l) ?? 0)
			}));
			if (edgeLabels.length > MAX_EDGE_TYPE_ROWS) {
				const hiddenLabels = edgeLabels.slice(MAX_EDGE_TYPE_ROWS);
				const hiddenEdgeCount = hiddenLabels.reduce(
					(s, lab) => s + (edgeCountByLabel.get(lab) ?? 0),
					0
				);
				rows.push({
					swatch: '#64748b',
					label: `… +${edgeLabels.length - MAX_EDGE_TYPE_ROWS} more edge labels (${hiddenEdgeCount} edges)`
				});
			}
			sections.push({
				title: legendWithCount('Relations (edge labels)', totalEdges),
				rows
			});
		}
	}

	const platformSec = buildPlatformHullLegendSection(nodes);
	if (platformSec) {
		if (isAllView) {
			const tipIdx = sections.findIndex((s) => s.title === 'Tip');
			if (tipIdx >= 0) sections.splice(tipIdx, 0, platformSec);
			else sections.push(platformSec);
		} else {
			sections.push(platformSec);
		}
	}

	if (facetSections.length > 0 && !facetSectionsPlacedEarly) {
		if (isAllView) {
			const tipIdx = sections.findIndex((s) => s.title === 'Tip');
			if (tipIdx >= 0) sections.splice(tipIdx, 0, ...facetSections);
			else sections.push(...facetSections);
		} else {
			sections.push(...facetSections);
		}
	}

	return { styleNode, edgeColor, legendSections: sections };
}
