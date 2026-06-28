import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sanitizeOntologyParam } from '$lib/server/graphOntology';
import {
	edgeLabelsForLinkMode,
	sanitizeEdgeLinkModeParam
} from '$lib/graph/edgeLinkModes';
import {
	getGraphRepository,
	sanitizeTopKParam,
	sanitizeWorkspaceParam
} from '$lib/server/graphRepository';

/**
 * Exports the local GhostCrab PERSO SQLite graph for Graphology + Sigma.js.
 * Query: `?ontology=type:EntityType`, `?workspace=...`, `?linkMode=...`, `?topK=N`.
 * Query: `?topK=N` — max edges per source node via ROW_NUMBER (default 30, max 500, `none` disables cap).
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const ontology = sanitizeOntologyParam(url.searchParams.get('ontology'));
		const linkMode = sanitizeEdgeLinkModeParam(url.searchParams.get('linkMode'));
		const edgeLabelAllowlist = edgeLabelsForLinkMode(linkMode);
		const topKEdgesPerNode = sanitizeTopKParam(url.searchParams.get('topK'));
		const workspace = sanitizeWorkspaceParam(url.searchParams.get('workspace'));

		const body = await getGraphRepository().fetchGraph({
			workspace,
			ontology,
			edgeLabelAllowlist,
			topKEdgesPerNode
		});

		return json(body, {
			headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=300' }
		});
	} catch (e) {
		const message =
			e instanceof Error
				? (e.message || (e as NodeJS.ErrnoException).code || e.name)
				: 'Unknown database error';
		console.error('[api/graph]', message);
		throw error(500, message);
	}
};
