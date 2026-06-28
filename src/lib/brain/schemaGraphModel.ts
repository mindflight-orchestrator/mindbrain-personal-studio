import type { SchemaClassNode, SchemaIndex } from '$lib/brain/schemaIndex';

export type SchemaGraphNode = {
	id: string;
	typeName: string;
	label: string;
	abstract: boolean;
	synthetic: boolean;
	metadata?: Record<string, unknown>;
};

export type SchemaGraphEdge = {
	id: string;
	kind: 'relation' | 'is_a';
	source: string;
	target: string;
	label: string;
	edgeType?: string;
	importantLabel: boolean;
	metadata?: Record<string, unknown>;
};

export type SchemaGraphOptions = {
	hideAbstract: boolean;
	showRelations: boolean;
	showIsA: boolean;
};

export type SchemaGraph = {
	nodes: SchemaGraphNode[];
	edges: SchemaGraphEdge[];
	stats: {
		classCount: number;
		relationCount: number;
		isACount: number;
	};
};

export function nodeIdForType(typeName: string): string {
	return `entity_type:${typeName}`;
}

export function isClassAbstract(cls: SchemaClassNode): boolean {
	if (cls.metadata.synthetic === true) return true;
	if (cls.metadata.abstract === true) return true;
	return false;
}

function visibleClasses(index: SchemaIndex, hideAbstract: boolean): SchemaClassNode[] {
	return [...index.classes.values()].filter((cls) => {
		if (cls.metadata.synthetic && hideAbstract) return false;
		if (hideAbstract && isClassAbstract(cls)) return false;
		return true;
	});
}

function parseMetadata(raw: unknown): Record<string, unknown> {
	if (!raw) return {};
	if (typeof raw === 'string') {
		try {
			return JSON.parse(raw) as Record<string, unknown>;
		} catch {
			return {};
		}
	}
	if (typeof raw === 'object') return raw as Record<string, unknown>;
	return {};
}

function nativeEdgeLabel(rel: { edgeType: string; metadata?: Record<string, unknown> }): string {
	const meta = rel.metadata ?? {};
	const ghostcrab =
		typeof meta.ghostcrab === 'object' && meta.ghostcrab
			? (meta.ghostcrab as Record<string, unknown>)
			: null;
	const native =
		(typeof ghostcrab?.['ghostcrab.native_edge_type'] === 'string'
			? ghostcrab['ghostcrab.native_edge_type']
			: null) ??
		(typeof meta.linkml_slot === 'string' ? meta.linkml_slot : null);
	const key = native ?? rel.edgeType;
	if (key.includes('contains')) return 'contains';
	return key;
}

const IMPORTANT_EDGE_LABELS = new Set([
	'ADDRESSED_TO',
	'APPOINTS',
	'ASSOCIATED_WITH',
	'BELONGS_TO',
	'CLOSES',
	'CONTAINS',
	'DOCUMENTS',
	'HAS_ACCOUNT',
	'HAS_BUDGET',
	'HAS_MEMBER',
	'HAS_OCCUPANT',
	'HAS_OWNER',
	'LINKED_TO',
	'LOCATED_IN',
	'OPENS',
	'OWNED_BY',
	'PART_OF',
	'RECORDED_IN',
	'REFERENCES',
	'REPRESENTS',
	'RESULTS_FROM',
	'TRIGGERS',
	'USES_KEY',
	'VERIFIES',
	'VOTED_ON',
	'contains',
	'belongs_to',
	'bills_to',
	'created_by',
	'has_member',
	'leases',
	'occupies',
	'owns',
	'primary_residence_of',
	'triggers_spend',
	'uses_common',
	'uses_exclusive'
]);

const TECHNICAL_EDGE_PREFIXES = ['adm_', 'com_', 'dec_', 'exp_', 'tec_'];

function isImportantEdgeLabel(label: string): boolean {
	if (!label || label === 'is_a') return false;
	if (TECHNICAL_EDGE_PREFIXES.some((prefix) => label.startsWith(prefix))) return false;
	if (IMPORTANT_EDGE_LABELS.has(label)) return true;
	return /^[A-Z][A-Z0-9_]+$/.test(label);
}

function isAbstractType(typeName: string, index: SchemaIndex): boolean {
	const cls = index.classes.get(typeName);
	if (!cls) return false;
	return isClassAbstract(cls);
}

function concreteAssetQualifications(index: SchemaIndex, hideAbstract: boolean): string[] {
	return [...index.classes.values()]
		.filter((cls) => {
			if (cls.metadata.synthetic) return false;
			if (hideAbstract && isClassAbstract(cls)) return false;
			if (cls.typeName === 'Asset') return false;
			let parent = cls.parentTypeName;
			while (parent) {
				if (parent === 'Asset') return true;
				parent = index.classes.get(parent)?.parentTypeName ?? null;
			}
			return false;
		})
		.map((cls) => cls.typeName)
		.sort((a, b) => a.localeCompare(b));
}

function shouldQualifyAssetTarget(edgeType: string): boolean {
	return (
		edgeType.includes('contains') ||
		edgeType === 'uses_common' ||
		edgeType === 'uses_exclusive' ||
		edgeType === 'part_of'
	);
}

function relationTargets(
	rel: { sourceType: string; targetType: string; edgeType: string },
	index: SchemaIndex,
	hideAbstract: boolean
): string[] {
	if (rel.targetType !== 'Asset' || !isAbstractType('Asset', index) || !shouldQualifyAssetTarget(rel.edgeType)) {
		return [rel.targetType];
	}
	return concreteAssetQualifications(index, hideAbstract);
}

export function buildSchemaGraph(index: SchemaIndex, opts: SchemaGraphOptions): SchemaGraph {
	const visible = visibleClasses(index, opts.hideAbstract);
	const visibleIds = new Set(visible.map((cls) => nodeIdForType(cls.typeName)));

	const nodes: SchemaGraphNode[] = visible
		.map((cls) => ({
			id: nodeIdForType(cls.typeName),
			typeName: cls.typeName,
			label: cls.label || cls.typeName,
			abstract: isClassAbstract(cls),
			synthetic: cls.metadata.synthetic === true,
			metadata: cls.metadata
		}))
		.sort((a, b) => a.typeName.localeCompare(b.typeName));

	const edges: SchemaGraphEdge[] = [];
	const relationKeys = new Set<string>();

	if (opts.showRelations) {
		for (const rel of index.allRelations) {
			if (rel.edgeType === 'contains' && rel.targetType === 'Asset') continue;
			const source = nodeIdForType(rel.sourceType);
			if (!visibleIds.has(source)) continue;
			const label = nativeEdgeLabel(rel);
			for (const targetType of relationTargets(rel, index, opts.hideAbstract)) {
				const target = nodeIdForType(targetType);
				if (!visibleIds.has(target)) continue;
				const key = `${rel.sourceType}|${label}|${targetType}`;
				if (relationKeys.has(key)) continue;
				relationKeys.add(key);
				edges.push({
					id: `rel:${key}`,
					kind: 'relation',
					source,
					target,
					label,
					edgeType: rel.edgeType,
					importantLabel: isImportantEdgeLabel(label),
					metadata: rel.metadata
				});
			}
		}
	}

	if (opts.showIsA) {
		for (const cls of visible) {
			if (!cls.parentTypeName) continue;
			const source = nodeIdForType(cls.typeName);
			const target = nodeIdForType(cls.parentTypeName);
			if (!visibleIds.has(source) || !visibleIds.has(target)) continue;
			edges.push({
				id: `isa:${cls.typeName}->${cls.parentTypeName}`,
				kind: 'is_a',
				source,
				target,
				label: 'is_a',
				importantLabel: false
			});
		}
	}

	return {
		nodes,
		edges,
		stats: {
			classCount: nodes.length,
			relationCount: edges.filter((e) => e.kind === 'relation').length,
			isACount: edges.filter((e) => e.kind === 'is_a').length
		}
	};
}
