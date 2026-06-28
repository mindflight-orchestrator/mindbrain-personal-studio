/**
 * Edge semantics for skill graphs: "composition" matches how an agent assembles work
 * (domains, parts, tools, prerequisites); "discovery" matches similarity / alternatives.
 */
export const COMPOSITION_EDGE_LABELS = [
	'BELONGS_TO_DOMAIN',
	'PART_OF',
	'BELONGS_TO',
	'REQUIRES_TOOL',
	'HAS_SKILL',
	'IMPLEMENTS_PATTERN'
] as const;

export const DISCOVERY_EDGE_LABELS = [
	'SUBSTITUTES',
	'SHARES_PATTERN',
	'PRODUCES_INPUT_FOR'
] as const;

/** Navy cyber-threat topology: ships, systems, networks, monitoring. */
export const NAVY_TOPOLOGY_LABELS = [
	'PART_OF',
	'CONNECTED_TO',
	'DEPENDS_ON',
	'SHARES_NETWORK',
	'MONITORS'
] as const;

/** Navy SOC / pipeline: signal → alert → escalation → incident. */
export const NAVY_PIPELINE_LABELS = [
	'EMITS',
	'PROMOTED_TO',
	'OBSERVED_ON',
	'MAPS_TTP',
	'ESCALATES_TO',
	'TARGETS_PLATFORM',
	'CONTAINS',
	'TRIGGERED_ACTION',
	'ACTED_ON'
] as const;

/** Navy TTP ↔ threat actor attribution. */
export const NAVY_ATTRIBUTION_LABELS = ['ATTRIBUTED_TO'] as const;

export type EdgeLinkMode =
	| 'all'
	| 'composition'
	| 'discovery'
	| 'navy_topology'
	| 'navy_pipeline'
	| 'navy_attribution';

const COMPOSITION_SET = new Set<string>(COMPOSITION_EDGE_LABELS);

export function edgeLabelsForLinkMode(mode: EdgeLinkMode): string[] | null {
	if (mode === 'all') return null;
	if (mode === 'composition') return [...COMPOSITION_EDGE_LABELS];
	if (mode === 'discovery') return [...DISCOVERY_EDGE_LABELS];
	if (mode === 'navy_topology') return [...NAVY_TOPOLOGY_LABELS];
	if (mode === 'navy_pipeline') return [...NAVY_PIPELINE_LABELS];
	return [...NAVY_ATTRIBUTION_LABELS];
}

export function sanitizeEdgeLinkModeParam(raw: string | null | undefined): EdgeLinkMode {
	if (
		raw === 'composition' ||
		raw === 'discovery' ||
		raw === 'navy_topology' ||
		raw === 'navy_pipeline' ||
		raw === 'navy_attribution'
	) {
		return raw;
	}
	return 'all';
}

export function isCompositionEdgeLabel(label: string | null | undefined): boolean {
	const l = (label ?? '').trim();
	return COMPOSITION_SET.has(l);
}
