export const MODELE_HELP = {
	classes:
		'Hierarchical browse of entity types (is_a) and their relation slots. Select a row to view definition, properties, and relations in the Inspector (right panel). Edit schema via Inspector — not in this tree.',
	taxonomies:
		'Controlled vocabularies only — allowed enum/status values (e.g. LifecycleStatus, PaymentStatus). Edit value labels and add values here. Not for class descriptions, properties, or relation types between entities.',
	graph:
		"Bird's-eye map of all types: purple edges = relation types, gray = inheritance (is_a). Click a node or edge to open its definition in the Inspector. Type-level schema — not instance data.",
	inspectorDefinition:
		'Edit label, description, properties, and relations for the selected type. Use the Taxonomies tab only for enum value lists.'
} as const;

export const MODELE_TAB_TAGLINE = {
	classes: 'Browse hierarchy · edit in Inspector',
	taxonomies: 'Enum/status values · not class definitions',
	graph: 'All types at a glance · edit in Inspector'
} as const;

export type ModeleSectionId = keyof typeof MODELE_TAB_TAGLINE;
