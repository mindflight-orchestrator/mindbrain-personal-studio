import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sanitizeOntologyParam } from '$lib/server/graphOntology';
import { edgeLabelsForLinkMode, sanitizeEdgeLinkModeParam } from '$lib/graph/edgeLinkModes';
import {
	getGraphRepository,
	sanitizeTopKParam,
	sanitizeWorkspaceParam
} from '$lib/server/graphRepository';

/**
 * Fast count probe for /api/graph — returns node + edge counts without fetching graph data.
 * Used by GraphCanvas to decide between classic JSON fetch (≤3 000 nodes) and NDJSON streaming.
 *
 * Query params: same subset as /api/graph (ontology, linkMode, workspace, topK).
 * Edge count is capped at 100 001 for speed; edgeCountCapped=true signals "at least 100k edges".
 * Response is cached 30 s (same params → same counts).
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const ontology = sanitizeOntologyParam(url.searchParams.get('ontology'));
		const linkMode = sanitizeEdgeLinkModeParam(url.searchParams.get('linkMode'));
		const edgeLabelAllowlist = edgeLabelsForLinkMode(linkMode);
		const topKEdgesPerNode = sanitizeTopKParam(url.searchParams.get('topK'));
		const workspace = sanitizeWorkspaceParam(url.searchParams.get('workspace'));

		const counts = await getGraphRepository().countGraph({
			workspace,
			ontology,
			edgeLabelAllowlist,
			topKEdgesPerNode
		});

		return json(counts, {
			headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' }
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : 'Unknown error';
		console.error('[api/graph/count]', message);
		throw error(500, message);
	}
};
