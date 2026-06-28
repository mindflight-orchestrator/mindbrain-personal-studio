import type {
	SchemaClassNode,
	SchemaIndex,
	SchemaRelationRow
} from '$lib/brain/schemaIndex';

export const ALL_ONTOLOGIES = '__all__';

export type OntologySummaryRow = {
	ontology_id: string;
	name: string;
	source_kind?: string;
};

export type OntologyInspectNamespace = {
	namespace: string;
	label?: string | null;
	parent_namespace?: string | null;
};

export type OntologyInspectDimension = {
	namespace: string;
	dimension: string;
	value_type: string;
	hierarchy_kind: string;
	is_multi?: boolean;
};

export type OntologyInspectValue = {
	namespace: string;
	dimension: string;
	value: string;
	label?: string | null;
	parent_value_id?: number | null;
};

export type OntologyInspectEntityType = {
	entity_type: string;
	label?: string | null;
	metadata?: Record<string, unknown>;
};

export type OntologyInspectEdgeType = {
	edge_type: string;
	source_entity_type?: string | null;
	target_entity_type?: string | null;
	directed?: boolean;
	metadata?: Record<string, unknown>;
};

export type OntologyInspectPayload = {
	ontology_id: string;
	workspace_id?: string | null;
	name: string;
	version?: string;
	source_kind?: string;
	frozen?: boolean;
	namespaces?: OntologyInspectNamespace[];
	dimensions?: OntologyInspectDimension[];
	values?: OntologyInspectValue[];
	entity_types?: OntologyInspectEntityType[];
	edge_types?: OntologyInspectEdgeType[];
	integrity?: {
		ok?: boolean;
		missing_namespace_dimensions?: number;
		missing_dimension_values?: number;
	};
};

export type SchemaRegistryRow = {
	id: string;
	schema_id: string;
	ontology_key: string;
	entity_type: string;
	class_name?: string | null;
	target?: string | null;
	version?: number | null;
	description?: string | null;
	facet_definition_count: number;
	fields?: SchemaRegistryField[];
};

export type SchemaRegistryField = {
	name: string;
	type?: string | null;
	range?: string | null;
	required?: boolean;
	multivalued?: boolean;
	description?: string | null;
};

export type SchemaRegistryResponse = {
	workspace_id: string;
	total: number;
	facet_definition_total: number;
	rows: SchemaRegistryRow[];
	source: 'sqlite' | 'unavailable';
	error?: string;
};

export function ontologyKeyFromId(ontologyId: string, workspaceId: string): string {
	const prefix = `${workspaceId}::`;
	if (ontologyId.startsWith(prefix)) return ontologyId.slice(prefix.length);
	const colon = ontologyId.indexOf('::');
	return colon >= 0 ? ontologyId.slice(colon + 2) : ontologyId;
}

export function schemaOntologyKey(schemaId: string, workspaceId: string): string {
	const ontologyPrefix = `${workspaceId}::`;
	if (schemaId.startsWith(ontologyPrefix)) {
		return schemaId.slice(ontologyPrefix.length).split(':')[0] || 'other';
	}
	const prefix = `${workspaceId}:`;
	if (!schemaId.startsWith(prefix)) return 'other';
	return schemaId.slice(prefix.length).split(':')[0] || 'other';
}

export async function fetchOntologyInspect(
	ontologyId: string,
	workspaceId: string
): Promise<OntologyInspectPayload> {
	return fetchOntologyInspectFallback(ontologyId, workspaceId);
}

async function fetchOntologyInspectFallback(
	ontologyId: string,
	workspaceId: string
): Promise<OntologyInspectPayload> {
	const params = new URLSearchParams({ ontology_id: ontologyId });
	if (workspaceId.trim()) params.set('workspace_id', workspaceId.trim());
	const graphRes = await fetch(`/api/brain/ontology/graph?${params}`);
	if (!graphRes.ok) throw new Error(await graphRes.text());

	const graph = (await graphRes.json()) as {
		nodes?: Array<Record<string, unknown>>;
		edges?: Array<Record<string, unknown>>;
	};
	const graphNodes = graph.nodes ?? [];
	const relationClassEdges: OntologyInspectEdgeType[] = [];
	for (const node of graphNodes) {
		const metadata = parseMetadata(node.metadata ?? node.metadata_json);
		const ghost = ghostcrabMetadata(metadata);
		if (ghost['ghostcrab.native_edge_type'] !== 'true') continue;
		const edgeType = stringOrNull(ghost['ghostcrab.native_edge_label']);
		const sourceType = stringOrNull(ghost['ghostcrab.source_entity_type']);
		const targetType = stringOrNull(ghost['ghostcrab.target_entity_type']);
		if (!edgeType || !sourceType || !targetType) continue;
		relationClassEdges.push({
			edge_type: edgeType,
			source_entity_type: sourceType,
			target_entity_type: targetType,
			directed: true,
			metadata: {
				...metadata,
				native_relation_class: String(node.type ?? node.id ?? edgeType)
			}
		});
	}
	return {
		ontology_id: ontologyId,
		workspace_id: workspaceId,
		name: ontologyId,
		namespaces: [],
		dimensions: [],
		values: [],
		entity_types: graphNodes
			.filter((node) => {
				const kind = String(node.kind ?? node.node_kind ?? '');
				return kind === 'entity_type' || kind === 'class';
			})
			.map((node) => {
				const id = String(node.id ?? '');
				const entityType = String(
					node.type ?? id.replace(/^entity_type:/, '').replace(/^class:/, '')
				);
				return {
					entity_type: entityType,
					label: node.label == null ? null : String(node.label),
						metadata: parseMetadata(node.metadata ?? node.metadata_json)
					};
				})
			.filter((row) => {
				const ghost = ghostcrabMetadata(parseMetadata(row.metadata));
				return (
					isBusinessEntityType(row.entity_type) && ghost['ghostcrab.native_edge_type'] !== 'true'
				);
			}),
		edge_types: [
			...(graph.edges ?? []).map((edge) => {
				const sourceType = edge.source_entity_type ?? edge.source_type;
				const targetType = edge.target_entity_type ?? edge.target_type;
				return {
					edge_type: String(edge.edge_type ?? edge.type ?? edge.label ?? edge.id ?? 'relation'),
					source_entity_type: sourceType == null ? null : String(sourceType),
					target_entity_type: targetType == null ? null : String(targetType),
					directed: edge.directed !== false,
					metadata: parseMetadata(edge.metadata ?? edge.metadata_json)
				};
			}),
			...relationClassEdges
		],
		integrity: { ok: true }
	};
}

function namespaceRows(dimensions: OntologyInspectDimension[]): OntologyInspectNamespace[] {
	const namespaces = new Map<string, OntologyInspectNamespace>();
	for (const dim of dimensions) {
		if (!dim.namespace) continue;
		if (!namespaces.has(dim.namespace)) {
			namespaces.set(dim.namespace, {
				namespace: dim.namespace,
				label: dim.namespace,
				parent_namespace: null
			});
		}
	}
	return [...namespaces.values()].sort((a, b) => a.namespace.localeCompare(b.namespace));
}

export async function fetchSchemaRegistry(workspaceId: string): Promise<SchemaRegistryResponse> {
	const params = new URLSearchParams({ workspace: workspaceId });
	const res = await fetch(`/api/graph/schema-registry?${params}`);
	if (!res.ok) throw new Error(await res.text());
	return (await res.json()) as SchemaRegistryResponse;
}

function parseMetadata(raw: unknown): Record<string, unknown> {
	if (!raw) return {};
	if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
	if (typeof raw !== 'string') return {};
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function stringOrNull(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function qualifiedType(ontologyId: string, typeName: string): string {
	return `${ontologyId}:${typeName}`;
}

function isBusinessEntityType(entityType: string): boolean {
	return !new Set(['owl_blank_node', 'owl_class', 'owl_object_property', 'owl_resource']).has(
		entityType
	);
}

function ghostcrabMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
	return metadata.ghostcrab && typeof metadata.ghostcrab === 'object' && !Array.isArray(metadata.ghostcrab)
		? (metadata.ghostcrab as Record<string, unknown>)
		: {};
}

function ownerOntologyId(
	workspaceId: string,
	fallbackOntologyId: string,
	metadata: Record<string, unknown>
): string {
	const family = ghostcrabMetadata(metadata)['ghostcrab.schema_family'];
	if (typeof family !== 'string') return fallbackOntologyId;
	const prefix = `${workspaceId}:`;
	if (!family.startsWith(prefix)) return fallbackOntologyId;
	const ownerKey = family.slice(prefix.length).split(':')[0]?.trim();
	return ownerKey ? `${workspaceId}::${ownerKey}` : fallbackOntologyId;
}

function classLabel(row: OntologyInspectEntityType, ontologyKey: string): string {
	void ontologyKey;
	return row.entity_type;
}

export function schemaIndexFromInspects(
	workspaceId: string,
	inspects: OntologyInspectPayload[],
	ontologyFilter = ALL_ONTOLOGIES,
	schemaRows: SchemaRegistryRow[] = []
): SchemaIndex {
	const classes = new Map<string, SchemaClassNode>();
	const allRelations: SchemaRelationRow[] = [];
	const nativeTypeOwners = new Map<string, Set<string>>();
	const classNameOwners = new Map<string, Set<string>>();
	const pendingParents = new Map<string, string>();
	const selected = inspects.filter((inspect) => {
		if (ontologyFilter === ALL_ONTOLOGIES) return true;
		return ontologyKeyFromId(inspect.ontology_id, workspaceId) === ontologyFilter;
	});

	for (const inspect of selected) {
		for (const row of inspect.entity_types ?? []) {
			const metadata = parseMetadata(row.metadata);
			const ontologyId = ownerOntologyId(workspaceId, inspect.ontology_id, metadata);
			const ontologyKey = ontologyKeyFromId(ontologyId, workspaceId);
			const nativeParent =
				typeof metadata.is_a === 'string' && metadata.is_a.trim()
					? metadata.is_a.trim()
					: null;
			const typeName = qualifiedType(ontologyId, row.entity_type);
			if (!nativeTypeOwners.has(row.entity_type)) nativeTypeOwners.set(row.entity_type, new Set());
			nativeTypeOwners.get(row.entity_type)?.add(ontologyId);
			const linkmlClass = typeof metadata.linkml_class === 'string' ? metadata.linkml_class : '';
			if (linkmlClass) {
				if (!classNameOwners.has(linkmlClass)) classNameOwners.set(linkmlClass, new Set());
				classNameOwners.get(linkmlClass)?.add(ontologyId);
			}
			if (nativeParent) pendingParents.set(typeName, nativeParent);
			classes.set(typeName, {
				typeName,
				label: classLabel(row, ontologyKey),
				parentTypeName: null,
				metadata: {
					...metadata,
					source_ontology_id: inspect.ontology_id,
					ontology_id: ontologyId,
					ontology_key: ontologyKey,
					native_type: row.entity_type
				},
				properties: [],
				outgoingRelations: [],
				incomingRelations: []
			});
		}
	}

	function resolveNativeType(nativeType: string, preferredOntologyId: string): string | null {
		const preferred = qualifiedType(preferredOntologyId, nativeType);
		if (classes.has(preferred)) return preferred;
		const core = qualifiedType(`${workspaceId}::core`, nativeType);
		if (classes.has(core)) return core;
		const owners = nativeTypeOwners.get(nativeType);
		if (!owners || owners.size === 0) return null;
		if (owners.size === 1) return qualifiedType([...owners][0], nativeType);
		return null;
	}

	function resolveClassName(className: string, preferredOntologyId: string): string | null {
		const owners = classNameOwners.get(className);
		if (!owners || owners.size === 0) return null;
		const preferredOwner = owners.has(preferredOntologyId) ? preferredOntologyId : null;
		const coreOwner = owners.has(`${workspaceId}::core`) ? `${workspaceId}::core` : null;
		const owner = preferredOwner ?? coreOwner ?? (owners.size === 1 ? [...owners][0] : null);
		if (!owner) return null;
		for (const cls of classes.values()) {
			if (cls.metadata.linkml_class === className && cls.metadata.ontology_id === owner) {
				return cls.typeName;
			}
		}
		return null;
	}

	function ensureSyntheticParent(nativeType: string): string {
		const typeName = qualifiedType(`${workspaceId}::core`, nativeType);
		if (!classes.has(typeName)) {
			classes.set(typeName, {
				typeName,
				label: nativeType,
				parentTypeName: null,
				metadata: {
					abstract: true,
					synthetic: true,
					ontology_id: `${workspaceId}::core`,
					ontology_key: 'core',
					native_type: nativeType
				},
				properties: [],
				outgoingRelations: [],
				incomingRelations: []
			});
		}
		return typeName;
	}

	for (const [typeName, nativeParent] of pendingParents) {
		const cls = classes.get(typeName);
		if (!cls) continue;
		const ontologyId =
			typeof cls.metadata.ontology_id === 'string' ? cls.metadata.ontology_id : '';
		cls.parentTypeName = resolveNativeType(nativeParent, ontologyId) ?? ensureSyntheticParent(nativeParent);
	}

	for (const inspect of selected) {
		for (const edge of inspect.edge_types ?? []) {
			if (!edge.source_entity_type || !edge.target_entity_type) continue;
			const metadata = parseMetadata(edge.metadata);
			const sourceType = resolveNativeType(edge.source_entity_type, inspect.ontology_id);
			const targetType = resolveNativeType(edge.target_entity_type, inspect.ontology_id);
			if (!sourceType || !targetType) continue;
			const sourceMeta = classes.get(sourceType)?.metadata ?? {};
			const ontologyId =
				typeof sourceMeta.ontology_id === 'string' ? sourceMeta.ontology_id : inspect.ontology_id;
			const rel: SchemaRelationRow = {
				edgeType: edge.edge_type,
				sourceType,
				targetType,
				label: edge.edge_type,
				directed: edge.directed !== false,
				metadata: {
					...metadata,
					source_ontology_id: inspect.ontology_id,
					ontology_id: ontologyId,
					ontology_key: ontologyKeyFromId(ontologyId, workspaceId),
					native_edge_type: edge.edge_type,
					native_source_type: edge.source_entity_type,
					native_target_type: edge.target_entity_type
				}
			};
			allRelations.push(rel);
			classes.get(rel.sourceType)?.outgoingRelations.push(rel);
			classes.get(rel.targetType)?.incomingRelations.push(rel);
		}
	}

	const primitiveRanges = new Set([
		'boolean',
		'date',
		'datetime',
		'decimal',
		'double',
		'euro',
		'float',
		'integer',
		'list<string>',
		'string',
		'time',
		'uri'
	]);
	const relationKeys = new Set(
		allRelations.map((rel) => `${rel.sourceType}|${rel.edgeType}|${rel.targetType}`)
	);
	for (const row of schemaRows) {
		if (ontologyFilter !== ALL_ONTOLOGIES && row.ontology_key !== ontologyFilter) continue;
		const sourceOntologyId = `${workspaceId}::${row.ontology_key}`;
		const sourceType = resolveNativeType(row.entity_type, sourceOntologyId);
		if (!sourceType) continue;
		for (const field of row.fields ?? []) {
			const range = field.range?.trim();
			if (!range || primitiveRanges.has(range) || range.endsWith('Enum')) continue;
			const targetType = resolveClassName(range, sourceOntologyId) ?? resolveNativeType(range, sourceOntologyId);
			if (!targetType) continue;
			const key = `${sourceType}|${field.name}|${targetType}`;
			if (relationKeys.has(key)) continue;
			relationKeys.add(key);
			const rel: SchemaRelationRow = {
				edgeType: field.name,
				sourceType,
				targetType,
				label: field.name,
				directed: true,
				metadata: {
					ontology_id: sourceOntologyId,
					ontology_key: row.ontology_key,
					schema_id: row.schema_id,
					native_edge_type: field.name,
					native_source_type: row.entity_type,
					native_target_range: range,
					field
				}
			};
			allRelations.push(rel);
			classes.get(sourceType)?.outgoingRelations.push(rel);
			classes.get(targetType)?.incomingRelations.push(rel);
		}
	}

	for (const cls of classes.values()) {
		cls.outgoingRelations.sort((a, b) => a.edgeType.localeCompare(b.edgeType));
		cls.incomingRelations.sort((a, b) => a.edgeType.localeCompare(b.edgeType));
	}

	return {
		ontologyId: ontologyFilter,
		classes,
		roots: [...classes.values()]
			.filter((cls) => !cls.parentTypeName || !classes.has(cls.parentTypeName))
			.map((cls) => cls.typeName)
			.sort((a, b) => a.localeCompare(b)),
		allRelations
	};
}
