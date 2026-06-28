import { error, type RequestHandler } from '@sveltejs/kit';
import { repairMindbrainJson } from '$lib/server/brainJsonRepair';
import { mindbrainUrl } from '$lib/server/mindbrainClient';

const TIMEOUT_MS = 15_000;
const GET_ALLOWED = [
	/^ontology\/(list|graph|type|inspect)$/,
	/^ontology\/taxonomy$/,
	/^graph\/(entity|relation|subgraph)$/,
	/^graph\/(diagnostics|gap-rules|rule-evaluations|rule-events)$/,
	/^graph\/type-counts$/,
	/^workspace\/list$/,
	/^ghostcrab\/(search|graph-search|pack-projections|projection-get)$/,
	/^ghostcrab\/artifact\/[^/]+$/,
	/^ghostcrab\/artifact\/[^/]+\/events$/,
	/^ghostcrab\/projections\/relevance$/,
	/^collections\/facet-search$/
];
const POST_ALLOWED = [
	/^ontology\/taxonomy\/(value|dimension)$/,
	/^ontology\/(entity-type|edge-type|property|triple)$/,
	/^graph\/rule-evaluations\/run$/,
	/^ghostcrab\/search$/,
	/^ghostcrab\/artifact\/[^/]+\/refresh$/
];

export const GET: RequestHandler = async ({ params, url, request }) => {
	return proxyBrain(request.method, params.path ?? '', url.search);
};

export const POST: RequestHandler = async ({ params, url, request }) => {
	const body = await request.text();
	return proxyBrain(request.method, params.path ?? '', url.search, body, request.headers.get('content-type'));
};

async function proxyBrain(
	method: string,
	path: string | string[],
	search: string,
	body?: string,
	contentType?: string | null
) {
	const segments = Array.isArray(path) ? path.join('/') : path;
	const allowed =
		method === 'POST' || method === 'PUT' || method === 'PATCH'
			? POST_ALLOWED
			: GET_ALLOWED;
	if (!allowed.some((pattern) => pattern.test(segments))) {
		throw error(404, 'MindBrain route is not exposed by this viewer proxy');
	}
	const target = mindbrainUrl(segments, search);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		const headers = new Headers();
		if (contentType) headers.set('content-type', contentType);
		const res = await fetch(target, {
			method,
			headers,
			body: method === 'GET' || method === 'HEAD' ? undefined : body,
			signal: controller.signal
		});
		let text = await res.text();
		if (segments === 'graph/subgraph' && res.ok && text.includes('"kind":.')) {
			text = repairMindbrainJson(text);
		}
		return new Response(text, {
			status: res.status,
			headers: {
				'content-type': res.headers.get('content-type') ?? 'application/json; charset=utf-8'
			}
		});
	} catch (e) {
		throw error(502, e instanceof Error ? e.message : 'MindBrain proxy failed');
	} finally {
		clearTimeout(timer);
	}
}
