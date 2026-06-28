import type { SchemaClassNode, SchemaIndex, SchemaRelationRow } from '$lib/brain/schemaIndex';

export type SchemaTreeRowKind = 'class' | 'relation';

export type SchemaTreeRow = {
	id: string;
	path: string;
	name: string;
	kind: SchemaTreeRowKind;
	/** Class id (domain for relations). */
	typeName: string;
	edgeType?: string;
	targetType?: string;
	abstract?: boolean;
};

const MAX_RELATION_DEPTH = 4;

function childrenOf(index: SchemaIndex, parentTypeName: string): SchemaClassNode[] {
	return [...index.classes.values()]
		.filter((cls) => cls.parentTypeName === parentTypeName)
		.sort((a, b) => a.typeName.localeCompare(b.typeName));
}

function compactClassLabel(cls: SchemaClassNode): string {
	const label = cls.label.trim();
	if (!label || label === cls.typeName) return cls.typeName;
	if (label.length > 48 || label.includes('. ')) return cls.typeName;
	return label;
}

function isAbstractClass(cls: SchemaClassNode): boolean {
	return cls.metadata.synthetic === true || cls.metadata.abstract === true;
}

function relationTrailKey(source: string, rel: SchemaRelationRow): string {
	return `${source}|${rel.edgeType}|${rel.targetType}`;
}

function appendRelationCascade(
	rows: SchemaTreeRow[],
	index: SchemaIndex,
	cls: SchemaClassNode,
	parentPath: string,
	trail: Set<string>,
	depth: number
) {
	if (depth >= MAX_RELATION_DEPTH) return;

	for (const rel of cls.outgoingRelations) {
		const key = relationTrailKey(cls.typeName, rel);
		if (trail.has(key)) continue;

		const relPath = `${parentPath}~${rel.edgeType}`;
		rows.push({
			id: relPath,
			path: relPath,
			name: `${rel.edgeType} → ${rel.targetType}`,
			kind: 'relation',
			typeName: cls.typeName,
			edgeType: rel.edgeType,
			targetType: rel.targetType
		});

		const target = index.classes.get(rel.targetType);
		if (!target) continue;

		const nextTrail = new Set(trail);
		nextTrail.add(key);

		const targetPath = `${relPath}.${rel.targetType}`;
		rows.push({
			id: targetPath,
			path: targetPath,
			name: compactClassLabel(target),
			kind: 'class',
			typeName: target.typeName,
			abstract: isAbstractClass(target)
		});

		appendRelationCascade(rows, index, target, targetPath, nextTrail, depth + 1);
	}
}

function appendClassBranch(rows: SchemaTreeRow[], index: SchemaIndex, cls: SchemaClassNode, parentPath: string) {
	const classPath = parentPath ? `${parentPath}.${cls.typeName}` : cls.typeName;
	rows.push({
		id: classPath,
		path: classPath,
		name: compactClassLabel(cls),
		kind: 'class',
		typeName: cls.typeName,
		abstract: isAbstractClass(cls)
	});

	for (const child of childrenOf(index, cls.typeName)) {
		appendClassBranch(rows, index, child, classPath);
	}

	appendRelationCascade(rows, index, cls, classPath, new Set(), 0);
}

/** Class hierarchy (is_a) with relation cascade under each class. */
export function toClassTreeRows(index: SchemaIndex): SchemaTreeRow[] {
	const rows: SchemaTreeRow[] = [];
	const roots = index.roots
		.map((typeName) => index.classes.get(typeName))
		.filter((cls): cls is SchemaClassNode => cls != null)
		.sort((a, b) => a.typeName.localeCompare(b.typeName));

	for (const cls of roots) {
		appendClassBranch(rows, index, cls, '');
	}
	return rows;
}

export function toLTreeRows(index: SchemaIndex): SchemaTreeRow[] {
	return toClassTreeRows(index);
}
