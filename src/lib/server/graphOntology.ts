/**
 * Ontology keys are either `all` or `type:<EntityType>` in the SQLite light viewer.
 * Special: `all` = no filter, `_none` = null/empty schema_id.
 *
 * Native `graph_entity` dimensions use `type:<EntityType>` (e.g. `type:article`, `type:obligation`).
 */
/** Same token rules as single-ontology keys (prefix or prefix:subtype). */
const ONTOLOGY_TOKEN_RE = /^[a-z0-9_.:-]+$/i;

export function sanitizeOntologyParam(raw: string | null): string {
	if (raw == null || raw === '' || raw === 'all') return 'all';
	if (raw === '_none') return '_none';
	// Allow prefix only (e.g. "claude-skills") or prefix:subtype (e.g. "claude-skills:skill")
	if (ONTOLOGY_TOKEN_RE.test(raw)) return raw;
	return 'all';
}

/**
 * Comma-separated ontology keys for multi-ontology queries.
 * Drops empty segments and invalid tokens; does not treat `all` as a list entry.
 */
export function sanitizeOntologiesParam(raw: string | null): string[] {
	if (raw == null || raw === '') return [];
	const out: string[] = [];
	for (const part of raw.split(',')) {
		const s = part.trim();
		if (s === '' || s === 'all' || s === '_none') continue;
		if (ONTOLOGY_TOKEN_RE.test(s)) out.push(s);
	}
	return out;
}

/** Single bridge ontology key (hub-spokes); null if missing or invalid. */
export function sanitizeBridgeParam(raw: string | null): string | null {
	if (raw == null || raw === '') return null;
	const t = raw.trim();
	if (t === 'all' || t === '_none') return null;
	if (ONTOLOGY_TOKEN_RE.test(t)) return t;
	return null;
}

const GRAPH_TYPE_PREFIX = 'type:';

/**
 * When ontology is `type:article`, returns `article` for `graph_entity.entity_type` filtering.
 */
export function graphEntityTypeFromOntology(ontology: string): string | null {
	const t = ontology.trim();
	if (!t.toLowerCase().startsWith(GRAPH_TYPE_PREFIX)) return null;
	const rest = t.slice(GRAPH_TYPE_PREFIX.length).trim();
	if (rest === '' || rest.includes(':')) return null;
	if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(rest)) return null;
	return rest;
}
