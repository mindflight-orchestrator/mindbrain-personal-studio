export type WorkspaceOntologyCandidate = {
	ontology_id: string;
	name?: string;
	source_kind?: string;
};

/**
 * Picks the ontology that explains instance data in a workspace graph.
 * GhostCrab workspaces usually bind models to `{workspace}::core` or a shared
 * LinkML ontology; `::default` auto shells are often empty placeholders.
 */
export function pickWorkspaceGraphOntologyId(
	workspaceId: string,
	ontologies: WorkspaceOntologyCandidate[],
	defaultOntologyId?: string | null
): string {
	if (ontologies.length === 0) return defaultOntologyId?.trim() ?? '';

	const ws = workspaceId.trim();
	const byId = new Map(ontologies.map((o) => [o.ontology_id, o]));

	const coreId = `${ws}::core`;
	if (byId.has(coreId)) return coreId;

	const linkml = ontologies.filter((o) => o.source_kind === 'linkml');
	if (linkml.length === 1) return linkml[0].ontology_id;
	if (linkml.length > 1) {
		const scoped = linkml.find((o) => o.ontology_id.startsWith(`${ws}::`));
		return scoped?.ontology_id ?? linkml[0].ontology_id;
	}

	const nonDefault = ontologies.filter((o) => !o.ontology_id.endsWith('::default'));
	if (nonDefault.length > 0) return nonDefault[0].ontology_id;

	const configured = defaultOntologyId?.trim();
	if (configured && byId.has(configured)) return configured;

	return ontologies[0]?.ontology_id ?? '';
}
