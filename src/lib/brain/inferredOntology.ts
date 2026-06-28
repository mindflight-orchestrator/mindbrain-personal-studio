export type InferredClassNode = {
	id: string;
	typeName: string;
	label: string;
	count?: number;
	source: 'ontology' | 'inferred';
	payload: Record<string, unknown>;
};

export type InferredRelationEdge = {
	id: string;
	typeName: string;
	label: string;
	source: string;
	target: string;
	sourceKind: 'ontology' | 'inferred';
	payload: Record<string, unknown>;
};

export async function fetchOntologyGraph(
	ontologyId: string,
	workspaceId: string
): Promise<{
	nodes: Array<Record<string, unknown>>;
	edges: Array<Record<string, unknown>>;
	seed_nodes?: Array<Record<string, unknown>>;
	seed_edges?: Array<Record<string, unknown>>;
}> {
	const params = new URLSearchParams({ ontology_id: ontologyId });
	if (workspaceId.trim()) params.set('workspace_id', workspaceId.trim());
	const res = await fetch(`/api/brain/ontology/graph?${params}`);
	if (!res.ok) throw new Error(await res.text());
	const data = (await res.json()) as {
		nodes?: Array<Record<string, unknown>>;
		edges?: Array<Record<string, unknown>>;
		seed_nodes?: Array<Record<string, unknown>>;
		seed_edges?: Array<Record<string, unknown>>;
	};
	return {
		nodes: data.nodes ?? [],
		edges: data.edges ?? [],
		seed_nodes: data.seed_nodes ?? [],
		seed_edges: data.seed_edges ?? []
	};
}

export async function fetchInferredClasses(workspaceId: string): Promise<InferredClassNode[]> {
	const ws = workspaceId.trim() || 'default';
	const res = await fetch(`/api/brain/graph/type-counts?workspace_id=${encodeURIComponent(ws)}`);
	if (!res.ok) throw new Error(await res.text());
	const data = (await res.json()) as {
		types?: Array<{ entity_type: string; count: number; label?: string | null }>;
	};
	const types = data.types ?? [];
	if (types.length > 0) {
		return types.map((row) => ({
			id: `type:${row.entity_type}`,
			typeName: row.entity_type,
			label: row.label ?? row.entity_type,
			count: Number(row.count ?? 0),
			source: 'inferred' as const,
			payload: row as unknown as Record<string, unknown>
		}));
	}

	const search = await fetch(
		`/api/brain/ghostcrab/graph-search?workspace_id=${encodeURIComponent(ws)}&limit=40`
	);
	if (!search.ok) throw new Error(await search.text());
	const searchData = (await search.json()) as { rows?: Array<Record<string, unknown>> };
	const typeSet = new Map<string, number>();
	for (const row of searchData.rows ?? []) {
		const t = String(row.entity_type ?? 'entity');
		typeSet.set(t, (typeSet.get(t) ?? 0) + 1);
	}
	return [...typeSet.entries()].map(([typeName, count]) => ({
		id: `type:${typeName}`,
		typeName,
		label: `${typeName} (${count})`,
		count,
		source: 'inferred' as const,
		payload: { entity_type: typeName, count }
	}));
}

export async function fetchInferredRelations(
	workspaceId: string
): Promise<InferredRelationEdge[]> {
	const ws = workspaceId.trim() || 'default';
	const search = await fetch(
		`/api/brain/ghostcrab/graph-search?workspace_id=${encodeURIComponent(ws)}&limit=40`
	);
	if (!search.ok) throw new Error(await search.text());
	const searchData = (await search.json()) as { rows?: Array<{ entity_id: number }> };
	const seeds = (searchData.rows ?? [])
		.map((row) => Number(row.entity_id))
		.filter((id) => Number.isFinite(id))
		.slice(0, 12);
	if (seeds.length === 0) return [];

	const sub = await fetch(
		`/api/brain/graph/subgraph?workspace_id=${encodeURIComponent(ws)}&seed_ids=${seeds.join(',')}&hops=1&format=json`
	);
	if (!sub.ok) throw new Error(await sub.text());
	const events = (await sub.json()) as Array<{ payload?: Record<string, unknown> }>;
	const relTypes = new Map<
		string,
		{ source: string; target: string; label: string; payload: Record<string, unknown> }
	>();

	for (const event of events) {
		const payload = event.payload ?? {};
		const relation = payload.relation as Record<string, unknown> | undefined;
		if (!relation) continue;
		const relType = String(relation.relation_type ?? 'relation');
		const sourceEntity = payload.source as Record<string, unknown> | undefined;
		const targetEntity = payload.target as Record<string, unknown> | undefined;
		const sourceType = String(sourceEntity?.entity_type ?? 'entity');
		const targetType = String(targetEntity?.entity_type ?? 'entity');
		if (!relTypes.has(relType)) {
			relTypes.set(relType, {
				source: sourceType,
				target: targetType,
				label: relType,
				payload: relation
			});
		}
	}

	return [...relTypes.entries()].map(([typeName, edge]) => ({
		id: `edge:${typeName}`,
		typeName,
		label: edge.label,
		source: edge.source,
		target: edge.target,
		sourceKind: 'inferred' as const,
		payload: edge.payload
	}));
}

export function mapOntologyClassNodes(
	nodes: Array<Record<string, unknown>>
): InferredClassNode[] {
	return nodes
		.filter((node) => {
			const kind = String(node.kind ?? node.node_kind ?? 'entity_type');
			return kind === 'entity_type' || kind === 'class' || kind.includes('entity');
		})
		.map((node) => {
			const id = String(node.id ?? '');
			const typeName = String(
				node.type ?? id.replace(/^entity_type:/, '').replace(/^class:/, '')
			);
			return {
				id,
				typeName,
				label: String(node.label ?? typeName),
				source: 'ontology' as const,
				payload: node
			};
		})
		.sort((a, b) => a.label.localeCompare(b.label));
}

export function mapOntologyRelationEdges(
	edges: Array<Record<string, unknown>>
): InferredRelationEdge[] {
	return edges.map((edge) => {
		const typeName = String(edge.type ?? edge.label ?? edge.id ?? 'relation');
		return {
			id: String(edge.id ?? typeName),
			typeName,
			label: String(edge.label ?? typeName),
			source: String(edge.source ?? edge.source_type ?? '?'),
			target: String(edge.target ?? edge.target_type ?? '?'),
			sourceKind: 'ontology' as const,
			payload: edge
		};
	});
}
