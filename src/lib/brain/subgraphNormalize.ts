import type { GraphNodeDTO } from '$lib/graph/nodeVisuals';

export type BrainEdgeDTO = {
	id: string;
	source: string;
	target: string;
	label: string | null;
	weight: number | null;
	properties?: Record<string, unknown>;
	relationMeta?: Record<string, unknown>;
};

export type BrainPayload = {
	nodes: GraphNodeDTO[];
	edges: BrainEdgeDTO[];
	sourceUsed?: 'graph';
};

export type SubgraphEvent = {
	kind?: string;
	payload?: Record<string, unknown>;
};

function parseJsonObject(raw: unknown): Record<string, unknown> {
	if (!raw) return {};
	if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
	if (typeof raw !== 'string') return {};
	try {
		const value = JSON.parse(raw);
		return value && typeof value === 'object' && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function unwrapEntity(raw: Record<string, unknown>): Record<string, unknown> {
	if (raw.entity && typeof raw.entity === 'object') return raw.entity as Record<string, unknown>;
	return raw;
}

export function nodeFromBrain(raw: Record<string, unknown>): GraphNodeDTO {
	const entity = unwrapEntity(raw);
	const id = String(entity.entity_id ?? entity.id ?? entity.node_id ?? '');
	const metadata = parseJsonObject(entity.metadata ?? entity.metadata_json);
	const facets = parseJsonObject(entity.facets ?? entity.facets_json);
	const entityType = String(entity.entity_type ?? entity.node_type ?? entity.type ?? '');
	return {
		id,
		label: String(entity.name ?? entity.label ?? metadata.label ?? id),
		node_type: entityType || null,
		schema_id: entityType || null,
		facets: {
			...metadata,
			...facets,
			workspace_id: entity.workspace_id ?? metadata.workspace_id,
			entity_type: entityType
		}
	};
}

function formatUnixDate(unix: unknown): string | null {
	const n = Number(unix);
	if (!Number.isFinite(n) || n <= 0) return null;
	return new Date(n * 1000).toISOString().slice(0, 10);
}

export function edgeLabelFromBrain(
	relation: Record<string, unknown>,
	properties: Record<string, unknown>[] = []
): string {
	const base = String(relation.relation_type ?? relation.label ?? 'relation');
	const parts = [base];
	for (const prop of properties) {
		const key = String(prop.property_key ?? prop.key ?? '');
		const value = prop.property_value ?? prop.value;
		if (key && value != null && value !== '') parts.push(`${key}=${value}`);
	}
	const meta = parseJsonObject(relation.metadata_json);
	if (meta.quotePart != null) parts.push(`quote=${meta.quotePart}`);
	if (meta.status != null) parts.push(String(meta.status));
	const from = formatUnixDate(relation.valid_from_unix);
	if (from) parts.push(`from ${from}`);
	return parts.join(' · ');
}

export function edgeFromBrain(
	raw: Record<string, unknown>,
	payload?: Record<string, unknown>
): BrainEdgeDTO {
	const relationRaw =
		raw.relation && typeof raw.relation === 'object'
			? (raw.relation as Record<string, unknown>)
			: raw;
	const id = String(relationRaw.relation_id ?? relationRaw.id ?? relationRaw.edge_id ?? '');
	const source = String(
		relationRaw.source_id ?? relationRaw.source ?? relationRaw.source_entity_id ?? ''
	);
	const target = String(
		relationRaw.target_id ?? relationRaw.target ?? relationRaw.target_entity_id ?? ''
	);
	const propertyList = Array.isArray(payload?.properties)
		? (payload!.properties as Record<string, unknown>[])
		: Array.isArray(relationRaw.properties)
			? (relationRaw.properties as Record<string, unknown>[])
			: [];
	const propertyMap: Record<string, unknown> = {};
	for (const prop of propertyList) {
		const key = String(prop.property_key ?? prop.key ?? '');
		if (key) propertyMap[key] = prop.property_value ?? prop.value;
	}
	return {
		id,
		source,
		target,
		label: edgeLabelFromBrain(relationRaw, propertyList),
		weight: relationRaw.confidence == null ? null : Number(relationRaw.confidence),
		properties: Object.keys(propertyMap).length > 0 ? propertyMap : undefined,
		relationMeta: relationRaw
	};
}

function eventKind(event: SubgraphEvent): string {
	const kind = event.kind;
	if (typeof kind === 'string' && kind.length > 0 && !kind.startsWith('.')) return kind;
	const payload = event.payload ?? {};
	if (payload.relation) return 'edge';
	if (payload.entity) return payload.depth == null ? 'seed_node' : 'node';
	if (payload.kind === 'subgraph') return 'done';
	return '';
}

export function normalizeBrainSubgraph(events: SubgraphEvent[]): BrainPayload {
	const nodesById = new Map<string, GraphNodeDTO>();
	const edgesById = new Map<string, BrainEdgeDTO>();

	for (const event of events) {
		const payload = event.payload ?? {};
		const kind = eventKind(event);
		if (kind === 'done') continue;

		if (kind === 'seed_node' || kind === 'node') {
			const node = nodeFromBrain(payload);
			if (node.id) nodesById.set(node.id, node);
			continue;
		}

		if (kind === 'edge') {
			const edge = edgeFromBrain(payload, payload);
			if (edge.id && edge.source && edge.target) edgesById.set(edge.id, edge);
			for (const key of ['source', 'target'] as const) {
				const value = payload[key];
				if (value && typeof value === 'object') {
					const node = nodeFromBrain(value as Record<string, unknown>);
					if (node.id) nodesById.set(node.id, node);
				}
			}
		}
	}

	const nodes = [...nodesById.values()];
	const liveNodeIds = new Set(nodes.map((n) => n.id));
	const edges = [...edgesById.values()].filter(
		(e) => liveNodeIds.has(e.source) && liveNodeIds.has(e.target)
	);
	return { nodes, edges, sourceUsed: 'graph' };
}
