import { fetchOntologyGraph } from '$lib/brain/inferredOntology';

const RDFS_DOMAIN = 'http://www.w3.org/2000/01/rdf-schema#domain';
const RDFS_RANGE = 'http://www.w3.org/2000/01/rdf-schema#range';
const RDFS_SUBCLASS = 'http://www.w3.org/2000/01/rdf-schema#subClassOf';
const OWL_DATATYPE = 'http://www.w3.org/2002/07/owl#DatatypeProperty';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

export type SchemaPropertyRow = {
	name: string;
	range: string;
	required?: boolean;
	label?: string;
	propertyUri?: string;
};

export type SchemaRelationRow = {
	edgeType: string;
	sourceType: string;
	targetType: string;
	label?: string;
	directed?: boolean;
	metadata?: Record<string, unknown>;
};

export type SchemaClassNode = {
	typeName: string;
	label: string;
	parentTypeName: string | null;
	metadata: Record<string, unknown>;
	properties: SchemaPropertyRow[];
	outgoingRelations: SchemaRelationRow[];
	incomingRelations: SchemaRelationRow[];
};

export type SchemaIndex = {
	ontologyId: string;
	classes: Map<string, SchemaClassNode>;
	roots: string[];
	allRelations: SchemaRelationRow[];
};

export type OntologyTripleRow = {
	subject: string;
	predicate: string;
	object_value: string;
	object_kind?: string;
};

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

function localName(iri: string): string {
	const hash = iri.lastIndexOf('#');
	if (hash >= 0) return iri.slice(hash + 1);
	const slash = iri.lastIndexOf('/');
	if (slash >= 0) return iri.slice(slash + 1);
	if (iri.startsWith('studio:')) return iri.slice('studio:'.length);
	return iri;
}

function xsdToSimple(range: string): string {
	if (range.includes('XMLSchema#string')) return 'string';
	if (range.includes('XMLSchema#date')) return 'date';
	if (range.includes('XMLSchema#integer')) return 'integer';
	if (range.includes('XMLSchema#decimal') || range.includes('XMLSchema#double')) return 'number';
	if (range.includes('XMLSchema#boolean')) return 'boolean';
	return localName(range);
}

export function parseDatatypePropertiesFromTriples(
	triples: OntologyTripleRow[],
	classTypeName: string,
	classUri?: string | null
): SchemaPropertyRow[] {
	const domainMatches = new Set<string>([classTypeName]);
	if (classUri) domainMatches.add(classUri);
	domainMatches.add(`studio:class:${classTypeName}`);

	const bySubject = new Map<string, OntologyTripleRow[]>();
	for (const triple of triples) {
		const rows = bySubject.get(triple.subject) ?? [];
		rows.push(triple);
		bySubject.set(triple.subject, rows);
	}

	const properties: SchemaPropertyRow[] = [];
	for (const [subject, rows] of bySubject) {
		const isDatatype = rows.some(
			(row) =>
				row.predicate === RDF_TYPE &&
				(row.object_value === OWL_DATATYPE || row.object_value.endsWith('DatatypeProperty'))
		);
		if (!isDatatype) continue;
		const domain = rows.find((row) => row.predicate === RDFS_DOMAIN)?.object_value;
		if (!domain || !domainMatches.has(domain) && !domainMatches.has(localName(domain))) continue;
		const rangeTriple = rows.find((row) => row.predicate === RDFS_RANGE);
		const name =
			subject.startsWith('studio:property:')
				? subject.slice('studio:property:'.length)
				: localName(subject);
		properties.push({
			name,
			range: rangeTriple ? xsdToSimple(rangeTriple.object_value) : 'string',
			propertyUri: subject
		});
	}
	return properties.sort((a, b) => a.name.localeCompare(b.name));
}

function parentFromMetadata(meta: Record<string, unknown>, triples: OntologyTripleRow[]): string | null {
	if (typeof meta.is_a === 'string' && meta.is_a.trim()) return meta.is_a.trim();
	for (const triple of triples) {
		if (
			triple.predicate === RDFS_SUBCLASS ||
			triple.predicate === 'subClassOf' ||
			triple.predicate.endsWith('subClassOf')
		) {
			return localName(triple.object_value);
		}
	}
	return null;
}

function edgeAppliesToClass(edge: SchemaRelationRow, classNode: SchemaClassNode, index: SchemaIndex): boolean {
	if (edge.sourceType === classNode.typeName) return true;
	let parent = classNode.parentTypeName;
	const seen = new Set<string>();
	while (parent && !seen.has(parent)) {
		seen.add(parent);
		if (parent === edge.sourceType) return true;
		parent = index.classes.get(parent)?.parentTypeName ?? null;
	}
	return false;
}

async function fetchTypeTriples(
	ontologyId: string,
	typeName: string
): Promise<OntologyTripleRow[]> {
	const params = new URLSearchParams({
		ontology_id: ontologyId,
		kind: 'entity',
		type: typeName
	});
	const res = await fetch(`/api/brain/ontology/type?${params}`);
	if (!res.ok) return [];
	const data = (await res.json()) as { triples?: OntologyTripleRow[]; metadata_json?: string };
	return data.triples ?? [];
}

export async function buildSchemaIndex(
	ontologyId: string,
	workspaceId = ''
): Promise<SchemaIndex> {
	const graph = await fetchOntologyGraph(ontologyId, workspaceId);
	const classes = new Map<string, SchemaClassNode>();

	for (const node of graph.nodes) {
		const kind = String(node.kind ?? node.node_kind ?? '');
		if (kind !== 'entity_type' && kind !== 'class') continue;
		const typeName = String(
			node.type ?? String(node.id ?? '').replace(/^entity_type:/, '').replace(/^class:/, '')
		);
		if (!typeName) continue;
		const meta = parseMetadata(node.metadata ?? node.metadata_json);
		classes.set(typeName, {
			typeName,
			label: String(node.label ?? typeName),
			parentTypeName: typeof meta.is_a === 'string' ? meta.is_a : null,
			metadata: meta,
			properties: [],
			outgoingRelations: [],
			incomingRelations: []
		});
	}

	const allRelations: SchemaRelationRow[] = (graph.edges ?? []).map((edge) => ({
		edgeType: String(edge.type ?? edge.label ?? edge.id ?? 'relation'),
		sourceType: String(edge.source_type ?? edge.source ?? '?'),
		targetType: String(edge.target_type ?? edge.target ?? '?'),
		label: String(edge.label ?? edge.type ?? ''),
		directed: edge.directed !== false,
		metadata: parseMetadata(edge.metadata ?? edge.metadata_json)
	}));

	for (const rel of allRelations) {
		const source = classes.get(rel.sourceType);
		if (source) source.outgoingRelations.push(rel);
		const target = classes.get(rel.targetType);
		if (target) target.incomingRelations.push(rel);
	}

	// Ensure synthetic parents exist for every is_a reference.
	for (const cls of [...classes.values()]) {
		let parent = cls.parentTypeName;
		while (parent) {
			if (!classes.has(parent)) {
				classes.set(parent, {
					typeName: parent,
					label: parent,
					parentTypeName: null,
					metadata: { abstract: true, synthetic: true },
					properties: [],
					outgoingRelations: [],
					incomingRelations: []
				});
			}
			parent = classes.get(parent)?.parentTypeName ?? null;
		}
	}

	const index: SchemaIndex = { ontologyId, classes, roots: [], allRelations };

	for (const cls of classes.values()) {
		for (const rel of allRelations) {
			if (edgeAppliesToClass(rel, cls, index) && !cls.outgoingRelations.some((r) => r.edgeType === rel.edgeType)) {
				cls.outgoingRelations.push(rel);
			}
		}
		cls.outgoingRelations.sort((a, b) => a.edgeType.localeCompare(b.edgeType));
		cls.incomingRelations.sort((a, b) => a.edgeType.localeCompare(b.edgeType));
	}

	const typeNames = [...classes.values()]
		.filter((cls) => !cls.metadata.synthetic)
		.map((cls) => cls.typeName);
	const tripleBatches = await Promise.all(
		typeNames.map(async (typeName) => {
			const triples = await fetchTypeTriples(ontologyId, typeName);
			return { typeName, triples };
		})
	);
	for (const { typeName, triples } of tripleBatches) {
		const cls = classes.get(typeName);
		if (!cls) continue;
		const classUri =
			typeof cls.metadata.class_uri === 'string' ? cls.metadata.class_uri : null;
		cls.parentTypeName = parentFromMetadata(cls.metadata, triples) ?? cls.parentTypeName;
		cls.properties = parseDatatypePropertiesFromTriples(triples, typeName, classUri);
	}

	index.roots = [...classes.values()]
		.filter((cls) => !cls.parentTypeName)
		.map((cls) => cls.typeName)
		.sort((a, b) => a.localeCompare(b));

	return index;
}
