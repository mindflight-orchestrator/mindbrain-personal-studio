import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { env } from '$env/dynamic/private';
import { graphEntityTypeFromOntology } from '$lib/server/graphOntology';

const execFileAsync = promisify(execFile);

export type GraphPayload = {
	nodes: Array<{
		id: string;
		label: string | null;
		node_type: string | null;
		schema_id: string | null;
		facets: Record<string, unknown> | null;
	}>;
	edges: Array<{
		id: string;
		source: string;
		target: string;
		label: string | null;
		weight: number | null;
	}>;
	sourceUsed?: 'graph';
};

export type GraphWorkspaceRow = { id: string; entityCount: number; label?: string | null };
export type OntologyRow = { id: string; nodeCount: number };
export type EdgeLabelCount = { label: string; count: number };
export type GraphCount = {
	nodeCount: number;
	edgeCount: number;
	edgeCountCapped: boolean;
	topEdgeLabels: EdgeLabelCount[];
	sourceUsed: 'graph';
};

export type FetchGraphArgs = {
	workspace: string | null;
	ontology: string;
	edgeLabelAllowlist: string[] | null;
	topKEdgesPerNode: number | null;
};

export interface GraphRepository {
	listWorkspaces(): Promise<GraphWorkspaceRow[]>;
	listOntologyRows(workspace: string | null): Promise<OntologyRow[]>;
	fetchGraph(args: FetchGraphArgs): Promise<GraphPayload>;
	countGraph(args: FetchGraphArgs): Promise<GraphCount>;
}

const TOP_K_MAX = 500;

export function sanitizeWorkspaceParam(raw: string | null): string | null {
	const s = raw?.trim();
	if (!s) return null;
	if (/^[a-z0-9_.-]+$/i.test(s)) return s;
	return null;
}

export function sanitizeTopKParam(raw: string | null): number | null {
	if (raw === null || raw === '') return 30;
	if (raw === 'none' || raw === '0') return null;
	const n = Number.parseInt(raw, 10);
	if (!Number.isFinite(n) || n < 1) return 30;
	return Math.min(Math.floor(n), TOP_K_MAX);
}

function expandHome(path: string): string {
	if (path === '~') return homedir();
	if (path.startsWith('~/')) return resolve(homedir(), path.slice(2));
	return path;
}

function candidateSqlitePaths(): string[] {
	return [
		env.GHOSTCRAB_PERSO_SQLITE_PATH,
		env.MCP_GHOSTCRAB_SQLITE_PATH,
		'~/.ghostcrab/databases/ghostcrab.sqlite',
		'~/data/ghostcrab.sqlite',
		'~/.ghostcrab/ghostcrab.sqlite',
		'~/Library/Application Support/GhostCrab/ghostcrab.sqlite',
		'data/ghostcrab.sqlite'
	]
		.map((p) => p?.trim())
		.filter((p): p is string => Boolean(p))
		.map((p) => resolve(expandHome(p)));
}

export function sqlitePath(): string {
	const configured = env.GHOSTCRAB_SQLITE_PATH?.trim();
	if (configured && configured !== 'auto') return resolve(expandHome(configured));
	const candidates = candidateSqlitePaths();
	return candidates.find((p) => existsSync(p)) ?? candidates[candidates.length - 1];
}

let repository: SQLiteGraphRepository | null = null;

export function getGraphRepository(): GraphRepository {
	const path = sqlitePath();
	if (!repository || repository.path !== path) {
		repository?.close();
		repository = new SQLiteGraphRepository(path);
	}
	return repository;
}

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> {
	if (!raw) return {};
	try {
		const value = JSON.parse(raw);
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			return value as Record<string, unknown>;
		}
	} catch {
		// Ignore malformed JSON from a local data row; the graph can still render.
	}
	return {};
}

function placeholders(values: readonly unknown[]): string {
	return values.map((value) => sqlString(String(value))).join(', ');
}

function sqlString(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

function sqlNullableEquals(column: string, value: string | null): string {
	return value == null ? '1=1' : `${column} = ${sqlString(value)}`;
}

async function queryJsonRows<T>(dbPath: string, sql: string): Promise<T[]> {
	const { stdout } = await execFileAsync('sqlite3', ['-readonly', '-json', dbPath, sql], {
		maxBuffer: 64 * 1024 * 1024
	});
	const trimmed = stdout.trim();
	if (!trimmed) return [];
	const parsed = JSON.parse(trimmed);
	return Array.isArray(parsed) ? (parsed as T[]) : [];
}

type EntityRow = {
	id: string;
	name: string;
	entity_type: string;
	workspace_id: string;
	metadata_json: string;
	facet_json: string | null;
};

type EdgeRow = {
	id: string;
	source: string;
	target: string;
	label: string | null;
	weight: number | null;
};

class SQLiteGraphRepository implements GraphRepository {
	constructor(readonly path: string) {}

	close(): void {
		return;
	}

	async listWorkspaces(): Promise<GraphWorkspaceRow[]> {
		const rows = await queryJsonRows<{ id: string; entityCount: number; label: string | null }>(
			this.path,
			`
				WITH entity_counts AS (
					SELECT workspace_id, COUNT(*) AS entity_count
					FROM graph_entity
					WHERE deprecated_at IS NULL
					GROUP BY workspace_id
				)
				SELECT
					COALESCE(w.workspace_id, w.id, e.workspace_id) AS id,
					COALESCE(e.entity_count, 0) AS entityCount,
					w.label AS label
				FROM workspaces w
				LEFT JOIN entity_counts e
					ON e.workspace_id = COALESCE(w.workspace_id, w.id)
				UNION
				SELECT e.workspace_id AS id, e.entity_count AS entityCount, NULL AS label
				FROM entity_counts e
				WHERE NOT EXISTS (
					SELECT 1 FROM workspaces w
					WHERE COALESCE(w.workspace_id, w.id) = e.workspace_id
				)
				ORDER BY entityCount DESC, id
				`
		);

		return rows.map((r) => ({
			id: r.id,
			entityCount: Number(r.entityCount ?? 0),
			label: r.label
		}));
	}

	async listOntologyRows(workspace: string | null): Promise<OntologyRow[]> {
		const rows = await queryJsonRows<{ id: string; nodeCount: number }>(
			this.path,
			`
				SELECT ('type:' || entity_type) AS id, COUNT(*) AS nodeCount
				FROM graph_entity
				WHERE deprecated_at IS NULL
					AND ${sqlNullableEquals('workspace_id', workspace)}
				GROUP BY entity_type
				ORDER BY nodeCount DESC, entity_type
				`
		);

		return rows.map((r) => ({ id: r.id, nodeCount: Number(r.nodeCount ?? 0) }));
	}

	async fetchGraph(args: FetchGraphArgs): Promise<GraphPayload> {
		const entityType = graphEntityTypeFromOntology(args.ontology);
		const entityRows = await queryJsonRows<EntityRow>(
			this.path,
			`
				SELECT
					CAST(e.entity_id AS TEXT) AS id,
					e.name,
					e.entity_type,
					e.workspace_id,
					e.metadata_json,
					NULL AS facet_json
				FROM graph_entity e
				WHERE e.deprecated_at IS NULL
					AND ${sqlNullableEquals('e.workspace_id', args.workspace)}
					AND ${sqlNullableEquals('e.entity_type', entityType)}
				ORDER BY e.entity_type, e.name, e.entity_id
				`
		);

		const nodes = entityRows.map((r) => {
			const metadata = parseJsonObject(r.metadata_json);
			const facetJson = parseJsonObject(r.facet_json);
			return {
				id: String(r.id),
				label: r.name,
				node_type: r.entity_type,
				schema_id: r.entity_type,
				facets: {
					...metadata,
					...facetJson,
					workspace_id: r.workspace_id,
					record_id: String(facetJson.record_id ?? metadata.record_id ?? r.name),
					entity_type: r.entity_type
				}
			};
		});

		const edgeRows = await this.fetchEdgeRows(args);
		const liveNodeIds = new Set(nodes.map((n) => n.id));
		const edges = edgeRows
			.filter((e) => liveNodeIds.has(String(e.source)) && liveNodeIds.has(String(e.target)))
			.map((e) => ({
				id: String(e.id),
				source: String(e.source),
				target: String(e.target),
				label: e.label,
				weight: e.weight == null ? null : Number(e.weight)
			}));

		return { nodes, edges, sourceUsed: 'graph' };
	}

	async countGraph(args: FetchGraphArgs): Promise<GraphCount> {
		const entityType = graphEntityTypeFromOntology(args.ontology);
		const [nodeRow = { nodeCount: 0 }] = await queryJsonRows<{ nodeCount: number }>(
			this.path,
			`
				SELECT COUNT(*) AS nodeCount
				FROM graph_entity
				WHERE deprecated_at IS NULL
					AND ${sqlNullableEquals('workspace_id', args.workspace)}
					AND ${sqlNullableEquals('entity_type', entityType)}
				`
		);

		const edgeRows = await this.fetchEdgeRows(args);
		const topEdgeLabels = await this.topEdgeLabels(args);

		return {
			nodeCount: Number(nodeRow.nodeCount ?? 0),
			edgeCount: edgeRows.length,
			edgeCountCapped: false,
			topEdgeLabels,
			sourceUsed: 'graph'
		};
	}

	private async fetchEdgeRows(args: FetchGraphArgs): Promise<EdgeRow[]> {
		const entityType = graphEntityTypeFromOntology(args.ontology);
		const labelFilter = args.edgeLabelAllowlist?.length
			? `AND r.relation_type IN (${placeholders(args.edgeLabelAllowlist)})`
			: '';

		return queryJsonRows<EdgeRow>(
			this.path,
			`
				WITH ent AS (
					SELECT entity_id
					FROM graph_entity
					WHERE deprecated_at IS NULL
						AND ${sqlNullableEquals('workspace_id', args.workspace)}
						AND ${sqlNullableEquals('entity_type', entityType)}
				)
				SELECT id, source, target, label, weight
				FROM (
					SELECT
						CAST(r.relation_id AS TEXT) AS id,
						CAST(r.source_id AS TEXT) AS source,
						CAST(r.target_id AS TEXT) AS target,
						r.relation_type AS label,
						r.confidence AS weight,
						ROW_NUMBER() OVER (
							PARTITION BY r.source_id
							ORDER BY r.confidence DESC, r.relation_id
						) AS rn
					FROM graph_relation r
					INNER JOIN ent s ON s.entity_id = r.source_id
					INNER JOIN ent t ON t.entity_id = r.target_id
					WHERE r.deprecated_at IS NULL
						AND ${sqlNullableEquals('r.workspace_id', args.workspace)}
						${labelFilter}
				)
				${args.topKEdgesPerNode == null ? '' : `WHERE rn <= ${args.topKEdgesPerNode}`}
				ORDER BY source, target, id
				`
		);
	}

	private async topEdgeLabels(args: FetchGraphArgs): Promise<EdgeLabelCount[]> {
		const labelFilter = args.edgeLabelAllowlist?.length
			? `AND relation_type IN (${placeholders(args.edgeLabelAllowlist)})`
			: '';
		const rows = await queryJsonRows<{ label: string; count: number }>(
			this.path,
			`
				SELECT relation_type AS label, COUNT(*) AS count
				FROM graph_relation
				WHERE deprecated_at IS NULL
					AND ${sqlNullableEquals('workspace_id', args.workspace)}
					${labelFilter}
				GROUP BY relation_type
				ORDER BY count DESC, relation_type
				LIMIT 10
				`
		);

		return rows.map((r) => ({ label: r.label, count: Number(r.count ?? 0) }));
	}
}
