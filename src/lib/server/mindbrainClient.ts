import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';

const DEFAULT_BASE = 'http://127.0.0.1:8091';
const TIMEOUT_MS = 15_000;
const RUNTIME_DIR = 'data/runtime';
const DEFAULT_SQLITE_PATH = 'data/immeuble-demo.sqlite';

export type DataSource = 'brain' | 'sqlite-demo';
export type MindbrainBaseSource = 'env' | 'runtime-json' | 'default';

interface BackendRuntimeJson {
	base_url?: unknown;
	sqlite_path?: unknown;
	pid?: unknown;
	port?: unknown;
	source?: unknown;
	started_at?: unknown;
}

export function resolveDataSource(): DataSource {
	const raw = process.env.DATA_SOURCE?.trim().toLowerCase();
	return raw === 'sqlite-demo' ? 'sqlite-demo' : 'brain';
}

export function mindbrainBaseUrl(): string {
	return resolveMindbrainRuntime().baseUrl;
}

function runtimeSidecarPath(sqlitePath: string): string {
	const resolved = resolve(sqlitePath);
	const hash = createHash('sha256').update(resolved).digest('hex').slice(0, 12);
	const name =
		basename(resolved, '.sqlite')
			.replace(/[^A-Za-z0-9_.-]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'sqlite';
	return resolve(process.cwd(), RUNTIME_DIR, `${name}-${hash}.backend.json`);
}

function configuredSqlitePath(): string | null {
	const raw = process.env.GHOSTCRAB_SQLITE_PATH?.trim();
	if (!raw || raw === 'auto') return null;
	return resolve(raw);
}

export function resolveMindbrainRuntime(): {
	baseUrl: string;
	source: MindbrainBaseSource;
	runtimePath?: string;
	sqlitePath?: string;
	pid?: number;
	port?: number;
} {
	const envUrl = process.env.MINDBRAIN_HTTP_URL?.trim() || process.env.GHOSTCRAB_MINDBRAIN_URL?.trim();
	if (envUrl) {
		const runtimeSource = process.env.MINDBRAIN_RUNTIME_SOURCE?.trim();
		if (runtimeSource === 'runtime-json') {
			const runtimePath = process.env.MINDBRAIN_RUNTIME_PATH?.trim();
			const runtime = runtimePath ? readBackendRuntime(runtimePath) : null;
			return {
				baseUrl: envUrl,
				source: 'runtime-json',
				runtimePath: runtimePath || undefined,
				sqlitePath:
					typeof runtime?.sqlite_path === 'string' ? runtime.sqlite_path : undefined,
				pid: typeof runtime?.pid === 'number' ? runtime.pid : undefined,
				port: typeof runtime?.port === 'number' ? runtime.port : undefined
			};
		}
		return { baseUrl: envUrl, source: 'env' };
	}

	const sqlitePath = configuredSqlitePath() ?? resolve(process.cwd(), DEFAULT_SQLITE_PATH);
	const runtimePath = runtimeSidecarPath(sqlitePath);
	const runtime = readBackendRuntime(runtimePath);
	if (runtime?.base_url && typeof runtime.base_url === 'string') {
		const runtimeSqlitePath =
			typeof runtime.sqlite_path === 'string' ? runtime.sqlite_path : sqlitePath;
		const pid = typeof runtime.pid === 'number' ? runtime.pid : undefined;
		const port = typeof runtime.port === 'number' ? runtime.port : undefined;
		return {
			baseUrl: runtime.base_url,
			source: 'runtime-json',
			runtimePath,
			sqlitePath: runtimeSqlitePath,
			pid,
			port
		};
	}

	return { baseUrl: DEFAULT_BASE, source: 'default' };
}

function readBackendRuntime(runtimePath: string): BackendRuntimeJson | null {
	if (!existsSync(runtimePath)) return null;
	try {
		const parsed = JSON.parse(readFileSync(runtimePath, 'utf8')) as unknown;
		if (!parsed || typeof parsed !== 'object') return null;
		return parsed as BackendRuntimeJson;
	} catch {
		return null;
	}
}

export function normalizeBrainPath(path: string): string {
	const clean = path.startsWith('/') ? path : `/${path}`;
	return clean.startsWith('/api/mindbrain/') || clean === '/health'
		? clean
		: `/api/mindbrain${clean}`;
}

export function mindbrainUrl(path: string, search = ''): string {
	return `${mindbrainBaseUrl()}${normalizeBrainPath(path)}${search}`;
}

async function brainFetch(path: string, init?: RequestInit): Promise<Response> {
	const url = mindbrainUrl(path);
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
	try {
		return await fetch(url, { ...init, signal: controller.signal });
	} finally {
		clearTimeout(timer);
	}
}

export async function brainHealth(): Promise<boolean> {
	try {
		const res = await brainFetch('/health');
		return res.ok;
	} catch {
		return false;
	}
}

export async function brainJson<T>(path: string, init?: RequestInit): Promise<T> {
	const res = await brainFetch(path, init);
	if (!res.ok) {
		const text = await res.text().catch(() => res.statusText);
		throw new Error(`${res.status} ${text}`);
	}
	return (await res.json()) as T;
}

export async function listWorkspaces(): Promise<WorkspaceListResponse> {
	return brainJson<WorkspaceListResponse>('workspace/list');
}

export async function fetchTypeCounts(workspaceId: string): Promise<GraphTypeCountsResponse> {
	const ws = workspaceId.trim() || 'default';
	return brainJson<GraphTypeCountsResponse>(
		`graph/type-counts?workspace_id=${encodeURIComponent(ws)}`
	);
}

export async function fetchOntologyTaxonomy(
	ontologyId: string,
	workspaceId?: string
): Promise<OntologyTaxonomyResponse> {
	const params = new URLSearchParams({ ontology_id: ontologyId });
	if (workspaceId?.trim()) params.set('workspace_id', workspaceId.trim());
	return brainJson<OntologyTaxonomyResponse>(`ontology/taxonomy?${params}`);
}

export async function postTaxonomyValue(body: Record<string, unknown>): Promise<{ ok: boolean }> {
	return brainJson<{ ok: boolean }>('ontology/taxonomy/value', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

export async function postTaxonomyDimension(
	body: Record<string, unknown>
): Promise<{ ok: boolean }> {
	return brainJson<{ ok: boolean }>('ontology/taxonomy/dimension', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

export async function postEntityType(body: Record<string, unknown>): Promise<{ ok: boolean }> {
	return brainJson<{ ok: boolean }>('ontology/entity-type', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

export async function postEdgeType(body: Record<string, unknown>): Promise<{ ok: boolean }> {
	return brainJson<{ ok: boolean }>('ontology/edge-type', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

export async function postProperty(body: Record<string, unknown>): Promise<{ ok: boolean }> {
	return brainJson<{ ok: boolean }>('ontology/property', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

export async function postTriple(body: Record<string, unknown>): Promise<{ ok: boolean }> {
	return brainJson<{ ok: boolean }>('ontology/triple', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});
}

export interface OntologySummary {
	ontology_id: string;
	workspace_id?: string | null;
	name: string;
	version: string;
	source_kind: string;
	frozen?: boolean;
	metadata?: Record<string, unknown>;
}

export interface OntologyListResponse {
	workspace_id?: string | null;
	default_ontology_id?: string | null;
	ontologies: OntologySummary[];
}

export interface WorkspaceSummary {
	id: string;
	label?: string | null;
	entity_count: number;
	default_ontology_id?: string | null;
}

export interface WorkspaceListResponse {
	workspaces: WorkspaceSummary[];
}

export interface GraphTypeCountRow {
	entity_type: string;
	count: number;
	label?: string | null;
}

export interface GraphTypeCountsResponse {
	workspace_id: string;
	types: GraphTypeCountRow[];
}

export interface OntologyTaxonomyDimension {
	namespace: string;
	dimension: string;
	value_type: string;
	is_multi: boolean;
	hierarchy_kind: string;
	metadata?: Record<string, unknown>;
}

export interface OntologyTaxonomyValue {
	namespace: string;
	dimension: string;
	value_id: number;
	value: string;
	parent_value_id?: number | null;
	label?: string | null;
	metadata?: Record<string, unknown>;
}

export interface OntologyTaxonomyResponse {
	ontology_id: string;
	dimensions: OntologyTaxonomyDimension[];
	values: OntologyTaxonomyValue[];
}

export interface ProjectionPackRow {
	id?: string;
	projection_id?: string;
	proj_type?: string;
	type?: string;
	content?: string;
	weight?: number;
	source_ref?: string | null;
	status?: string;
}

export interface ProjectionRowsResponse {
	agent_id: string;
	query: string;
	scope?: string | null;
	rows: ProjectionPackRow[];
}

export interface ProjectionRelevanceResponse extends ProjectionRowsResponse {
	entity_name: string;
}

export interface OntologyGraphNode {
	id: string;
	label: string;
	kind?: string;
	node_kind?: string;
	type?: string;
	metadata?: Record<string, unknown>;
	metadata_json?: string;
}

export interface OntologyGraphEdge {
	id: string;
	source?: string | null;
	target?: string | null;
	source_type?: string | null;
	target_type?: string | null;
	label?: string;
	kind?: string;
	type?: string;
	directed?: boolean;
	metadata?: Record<string, unknown>;
	metadata_json?: string;
}

export interface OntologyGraphResponse {
	ontology_id: string;
	nodes: OntologyGraphNode[];
	edges: OntologyGraphEdge[];
	seed_nodes?: Array<Record<string, unknown>>;
	seed_edges?: Array<Record<string, unknown>>;
}

export interface GraphSubgraphEvent {
	seq?: number;
	kind: 'seed_node' | 'node' | 'edge' | 'done' | string;
	payload: Record<string, unknown>;
}

export interface OntologyTypeResponse {
	ontology_id: string;
	kind: string;
	type_name: string;
	label?: string | null;
	metadata_json: string;
	source_entity_type?: string | null;
	target_entity_type?: string | null;
	directed?: boolean;
	triples: Array<{
		subject: string;
		predicate: string;
		object_value: string;
		object_kind: string;
	}>;
}

export interface GraphSubgraphResponse {
	nodes: Array<Record<string, unknown>>;
	edges: Array<Record<string, unknown>>;
}

export interface GraphSearchRow {
	entity_id: number;
	entity_type: string;
	name: string;
	confidence?: number;
	metadata_json?: string;
	score?: number;
}

export interface GraphSearchResponse {
	workspace_id: string;
	collection_id?: string | null;
	query: string;
	returned: number;
	rows: GraphSearchRow[];
}
