import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getGraphRepository,
	sanitizeWorkspaceParam
} from '$lib/server/graphRepository';
import { pickWorkspaceGraphOntologyId } from '$lib/brain/workspaceGraphOntology';
import {
	resolveDataSource,
	brainJson,
	type GraphTypeCountsResponse,
	type OntologyGraphResponse,
	type OntologyListResponse,
	type WorkspaceListResponse
} from '$lib/server/mindbrainClient';

export type OntologyRow = { id: string; nodeCount: number; label?: string | null };

function errText(e: unknown): string {
	return e instanceof Error
		? (e.message || (e as NodeJS.ErrnoException).code || e.name)
		: String(e);
}

/**
 * A failing list query (unreachable host, wrong credentials, or schema drift on the alt DB)
 * must not take down the whole handler — the UI can still show empty pickers and load after DB fix.
 */
async function safeList<T>(label: string, run: () => Promise<T>, fallback: T): Promise<T> {
	try {
		return await run();
	} catch (e) {
		console.error('[api/graph/ontologies]', label, errText(e));
		return fallback;
	}
}

async function typeCountsFromOntologyGraph(
	workspaceId: string,
	defaultOntologyId: string | null | undefined
): Promise<OntologyRow[]> {
	if (!defaultOntologyId) return [];
	try {
		const params = new URLSearchParams({
			ontology_id: defaultOntologyId,
			workspace_id: workspaceId
		});
		const graph = await brainJson<OntologyGraphResponse>(`ontology/graph?${params}`);
		return (graph.nodes ?? [])
			.filter((node) => {
				const kind = String(node.kind ?? node.node_kind ?? 'entity_type');
				return kind === 'entity_type' || kind.includes('entity');
			})
			.map((node) => {
				const type = String(
					node.type ?? String(node.id ?? '').replace(/^entity_type:/, '')
				);
				return {
					id: `type:${type}`,
					nodeCount: 0,
					label: node.label ?? type
				};
			});
	} catch (e) {
		console.error('[api/graph/ontologies]', 'ontologyGraphFallback', errText(e));
		return [];
	}
}

/**
 * Lists ontology categories (`type:<EntityType>`) and workspaces.
 * Brain mode proxies MindBrain HTTP; sqlite-demo reads GhostCrab PERSO SQLite.
 */
export const GET: RequestHandler = async ({ url }) => {
	try {
		const workspace = sanitizeWorkspaceParam(url.searchParams.get('workspace'));

		if (resolveDataSource() === 'brain') {
			const ws = workspace || 'default';
			const [workspaceList, typeCounts] = await Promise.all([
				safeList('brainWorkspaceList', () => brainJson<WorkspaceListResponse>('workspace/list'), {
					workspaces: []
				}),
				safeList(
					'brainTypeCounts',
					() =>
						brainJson<GraphTypeCountsResponse>(
							`graph/type-counts?workspace_id=${encodeURIComponent(ws)}`
						),
					{ workspace_id: ws, types: [] }
				)
			]);

			const graphWorkspaces = (workspaceList.workspaces ?? []).map((w) => ({
				id: w.id,
				entityCount: Number(w.entity_count ?? 0),
				label: w.label ?? null,
				defaultOntologyId: w.default_ontology_id ?? null
			}));

			let ontologies: OntologyRow[] = (typeCounts.types ?? []).map((row) => ({
				id: `type:${row.entity_type}`,
				nodeCount: Number(row.count ?? 0),
				label: row.label ?? row.entity_type
			}));

			if (ontologies.length === 0) {
				const wsRow = graphWorkspaces.find((w) => w.id === ws);
				const ontList = await safeList(
					'brainOntologyList',
					() =>
						brainJson<OntologyListResponse>(
							`ontology/list?workspace_id=${encodeURIComponent(ws)}`
						),
					{ ontologies: [] }
				);
				const graphOntologyId = pickWorkspaceGraphOntologyId(
					ws,
					ontList.ontologies ?? [],
					wsRow?.defaultOntologyId ?? ontList.default_ontology_id
				);
				ontologies = await typeCountsFromOntologyGraph(ws, graphOntologyId);
			}

			return json({
				ontologies,
				subTypes: [],
				providers: [],
				scenarios: [],
				graphWorkspaces,
				dbProfiles: [{ id: 'brain', label: 'MindBrain HTTP' }],
				activeDb: 'brain'
			});
		}

		const repository = getGraphRepository();

		const [graphWorkspaces, ontologies] = await Promise.all([
			safeList('listWorkspaces', () => repository.listWorkspaces(), []),
			safeList('listOntologyRows', () => repository.listOntologyRows(workspace), [])
		]);

		return json({
			ontologies,
			subTypes: [],   // legacy field kept so the existing UI parser doesn't break
			providers: [],
			scenarios: [],
			graphWorkspaces,
			dbProfiles: [{ id: 'sqlite', label: 'GhostCrab PERSO SQLite' }],
			activeDb: 'sqlite'
		});
	} catch (e) {
		const message = errText(e);
		console.error('[api/graph/ontologies]', message);
		throw error(500, message);
	}
};
