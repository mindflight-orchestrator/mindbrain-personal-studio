import type { SchemaGraphEdge, SchemaGraphNode } from '$lib/brain/schemaGraphModel';

export const SCHEMA_COLORS = {
	concreteClass: '#38bdf8',
	abstractClass: '#64748b',
	concreteLabel: '#f0f9ff',
	abstractLabel: '#cbd5e1',
	relationEdge: '#a78bfa',
	relationLabel: '#ede9fe',
	isAEdge: '#475569',
	isALabel: '#94a3b8'
} as const;

export type SchemaLegendRow = {
	swatch: string;
	label: string;
	dashed?: boolean;
};

export const SCHEMA_LEGEND_ROWS: SchemaLegendRow[] = [
	{ swatch: SCHEMA_COLORS.concreteClass, label: 'Concrete class' },
	{ swatch: SCHEMA_COLORS.abstractClass, label: 'Abstract mixin' },
	{ swatch: SCHEMA_COLORS.relationEdge, label: 'Relation type' },
	{ swatch: SCHEMA_COLORS.isAEdge, label: 'Inheritance (is_a)', dashed: true }
];

export type SchemaNodeVisual = {
	color: string;
	labelColor: string;
	size: number;
	label: string;
	forceLabel: boolean;
	zIndex: number;
};

export type SchemaEdgeVisual = {
	color: string;
	labelColor: string;
	size: number;
	label: string;
	forceLabel: boolean;
	type: string;
	zIndex: number;
	dashed?: boolean;
};

export function styleSchemaNode(node: SchemaGraphNode): SchemaNodeVisual {
	const abstract = node.abstract || node.synthetic;
	return {
		color: abstract ? SCHEMA_COLORS.abstractClass : SCHEMA_COLORS.concreteClass,
		labelColor: abstract ? SCHEMA_COLORS.abstractLabel : SCHEMA_COLORS.concreteLabel,
		size: abstract ? 10 : 14,
		label: node.label || node.typeName,
		forceLabel: false,
		zIndex: abstract ? 2 : 4
	};
}

export function styleSchemaEdge(edge: SchemaGraphEdge): SchemaEdgeVisual {
	if (edge.kind === 'is_a') {
		return {
			color: SCHEMA_COLORS.isAEdge,
			labelColor: SCHEMA_COLORS.isALabel,
			size: 1,
			label: 'is_a',
			forceLabel: false,
			type: 'line',
			zIndex: 1,
			dashed: true
		};
	}
	return {
		color: SCHEMA_COLORS.relationEdge,
		labelColor: SCHEMA_COLORS.relationLabel,
		size: 2,
		label: edge.edgeType ?? edge.label,
		forceLabel: false,
		type: 'arrow',
		zIndex: 3
	};
}
