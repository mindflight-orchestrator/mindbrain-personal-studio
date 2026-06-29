import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveMindbrainRuntime } from '$lib/server/mindbrainClient';
import { sanitizeWorkspaceParam, sqlitePath as fallbackSqlitePath } from '$lib/server/graphRepository';
import { schemaOntologyKey, type SchemaRegistryRow } from '$lib/brain/ontologyInspect';

const execFileAsync = promisify(execFile);

function parseJsonObject(raw: unknown): Record<string, unknown> {
	if (!raw || typeof raw !== 'string') return {};
	try {
		const value = JSON.parse(raw);
		return value && typeof value === 'object' && !Array.isArray(value)
			? (value as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function registrySqlitePaths(): string[] {
	const runtime = resolveMindbrainRuntime();
	return [...new Set([runtime.sqlitePath, fallbackSqlitePath()].filter((p): p is string => Boolean(p)))];
}

function entityTypeFromSchemaId(schemaId: string, workspaceId: string): string {
	const ontologyPrefix = `${workspaceId}::`;
	if (schemaId.startsWith(ontologyPrefix)) {
		const parts = schemaId.slice(ontologyPrefix.length).split(':');
		return parts.slice(2).join(':') || parts.at(-1) || schemaId;
	}
	const prefix = `${workspaceId}:`;
	if (!schemaId.startsWith(prefix)) return schemaId;
	const parts = schemaId.slice(prefix.length).split(':');
	return parts.slice(1).join(':') || parts[0] || schemaId;
}

function objectFieldCount(raw: unknown): number {
	return raw && typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw).length : 0;
}

function schemaFacetCount(definition: Record<string, unknown>): number {
	const fields = objectFieldCount(definition.fields);
	if (fields > 0) return fields;
	const facets =
		definition.facets && typeof definition.facets === 'object' && !Array.isArray(definition.facets)
			? (definition.facets as Record<string, unknown>)
			: {};
	return objectFieldCount(facets.required) + objectFieldCount(facets.optional);
}

function schemaFields(definition: Record<string, unknown>): NonNullable<SchemaRegistryRow['fields']> {
	const fields =
		definition.fields && typeof definition.fields === 'object' && !Array.isArray(definition.fields)
			? (definition.fields as Record<string, unknown>)
			: {};
	return Object.entries(fields)
		.filter(([, raw]) => raw && typeof raw === 'object' && !Array.isArray(raw))
		.map(([name, raw]) => {
			const value = raw as Record<string, unknown>;
			return {
				name,
				type: value.type == null ? null : String(value.type),
				range: value.range == null ? null : String(value.range),
				required: value.required === true,
				multivalued: value.multivalued === true,
				description: value.description == null ? null : String(value.description)
			};
		})
		.sort((a, b) => a.name.localeCompare(b.name));
}

function schemaClassName(definition: Record<string, unknown>): string | null {
	if (typeof definition.class_name === 'string') return definition.class_name;
	const metadata =
		definition.metadata && typeof definition.metadata === 'object' && !Array.isArray(definition.metadata)
			? (definition.metadata as Record<string, unknown>)
			: {};
	return typeof metadata.class_name === 'string' ? metadata.class_name : null;
}

function sqlString(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

async function queryJsonRows<T>(dbPath: string, sql: string): Promise<T[]> {
	const { stdout } = await execFileAsync('sqlite3', ['-readonly', '-json', dbPath, sql], {
		maxBuffer: 10 * 1024 * 1024
	});
	const trimmed = stdout.trim();
	if (!trimmed) return [];
	const parsed = JSON.parse(trimmed);
	return Array.isArray(parsed) ? (parsed as T[]) : [];
}

export const GET: RequestHandler = async ({ url }) => {
	const workspace = sanitizeWorkspaceParam(url.searchParams.get('workspace')) ?? 'default';
	const paths = registrySqlitePaths();
	const existingPaths = paths.filter((path) => existsSync(path));

	if (existingPaths.length === 0) {
		return json({
			workspace_id: workspace,
			total: 0,
			facet_definition_total: 0,
			rows: [],
			source: 'unavailable',
			error: `SQLite database not found. Tried: ${paths.join(', ')}`
		});
	}

	try {
		const workspaceSql = sqlString(workspace);
		type RawSchemaRow = {
			id: string;
			content: string;
			facets_json: string;
		};
		type RawFacetRow = { facets_json: string; content: string };
		let schemaRows: RawSchemaRow[] = [];
		let facetRows: RawFacetRow[] = [];
		let sourcePath = existingPaths[0];

		for (const candidatePath of existingPaths) {
			const candidateSchemaRows = await queryJsonRows<RawSchemaRow>(
				candidatePath,
				`
					SELECT id, content, COALESCE(facets_json, facets, '{}') AS facets_json
					FROM agent_facts
					WHERE schema_id = 'mindbrain:schema'
						AND workspace_id = ${workspaceSql}
						AND json_extract(COALESCE(facets_json, facets, '{}'), '$.target') IN ('facets', 'graph_node', 'graph_edge')
						AND json_extract(COALESCE(facets_json, facets, '{}'), '$.schema_id') LIKE ${sqlString(`${workspace}:%`)}
					ORDER BY json_extract(COALESCE(facets_json, facets, '{}'), '$.schema_id')
					`
			);
			if (candidateSchemaRows.length === 0 && candidatePath !== existingPaths.at(-1)) continue;
			sourcePath = candidatePath;
			schemaRows = candidateSchemaRows;
			facetRows = await queryJsonRows<RawFacetRow>(
				candidatePath,
				`
					SELECT COALESCE(facets_json, facets, '{}') AS facets_json, content
					FROM agent_facts
					WHERE schema_id = 'mindbrain:facet-definition'
						AND workspace_id = ${workspaceSql}
					`
			);
			break;
		}

		void sourcePath;

		const rows: SchemaRegistryRow[] = schemaRows.map((row) => {
			const facets = parseJsonObject(row.facets_json);
			const definition = parseJsonObject(row.content);
			const schemaId = String(facets.schema_id ?? definition.schema_id ?? '');
			return {
				id: row.id,
				schema_id: schemaId,
				ontology_key: schemaOntologyKey(schemaId, workspace),
				entity_type: entityTypeFromSchemaId(schemaId, workspace),
				class_name: schemaClassName(definition),
				target: facets.target == null ? null : String(facets.target),
				version:
					typeof facets.version === 'number' && Number.isFinite(facets.version)
						? facets.version
						: null,
				description:
					definition.description == null ? null : String(definition.description),
				facet_definition_count: schemaFacetCount(definition),
				fields: schemaFields(definition)
			};
		});

		return json({
			workspace_id: workspace,
			total: rows.length,
			facet_definition_total: facetRows.length,
			rows,
			source: 'sqlite'
		});
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		console.error('[api/graph/schema-registry]', message);
		throw error(500, message);
	}
};
