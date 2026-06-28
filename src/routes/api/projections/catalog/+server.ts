import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { error, json, type RequestHandler } from '@sveltejs/kit';
import { resolveMindbrainRuntime } from '$lib/server/mindbrainClient';

const execFileAsync = promisify(execFile);

type ProjectionCatalogRow = {
	id: string;
	agent_id: string;
	scope: string | null;
	proj_type: string;
	content: string;
	weight: number | null;
	source_ref: string | null;
	status: string;
	created_at_unix: number | null;
	expires_at_unix: number | null;
};

type AnswerArtifactRow = {
	artifact_id: string;
	slug: string;
	workspace_id: string;
	agent_id: string | null;
	scope: string | null;
	artifact_kind: string;
	public_label: string;
	lifecycle: string;
	state: string;
	current_version: number;
	payload_json: string;
	legacy_ref: string | null;
	created_at_unix: number;
	updated_at_unix: number;
};

type GraphProjectionRow = {
	entity_id: number;
	workspace_id: string;
	name: string;
	confidence: number | null;
	metadata_json: string | null;
};

type CatalogItem = {
	id?: string;
	artifact_id?: string;
	artifact_kind: string;
	legacy_kind?: string;
	public_label?: string;
	scope?: string | null;
	lifecycle?: string;
	state?: string;
	current_version?: number;
	projection_id?: string;
	proj_type?: string;
	type: string;
	status?: string;
	weight?: number | null;
	content?: string;
	preview?: string;
	entity_id?: number;
	graph_focusable?: boolean;
	suggested_tools?: string[];
	linked_snapshot_id?: string;
	source_ref?: string | null;
	source: 'answer_artifact' | 'legacy_projection' | 'graph_projection';
	raw: Record<string, unknown>;
};

function sqlString(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

function safeWorkspaceId(raw: string | null): string {
	const value = raw?.trim();
	if (!value || !/^[A-Za-z0-9_.-]+$/.test(value)) throw error(400, 'Invalid workspace_id');
	return value;
}

function safeAgentId(raw: string | null): string | null {
	const value = raw?.trim();
	if (!value) return null;
	if (!/^[A-Za-z0-9_.:-]+$/.test(value)) throw error(400, 'Invalid agent_id');
	return value;
}

function safeKind(raw: string | null): string | null {
	const value = raw?.trim();
	if (!value) return null;
	if (!/^[A-Za-z0-9_:-]+$/.test(value)) throw error(400, 'Invalid artifact_kind');
	return value;
}

function safeSearch(raw: string | null): string {
	return raw?.trim().slice(0, 160) ?? '';
}

function safeBoolean(raw: string | null): boolean {
	const value = raw?.trim().toLowerCase();
	return value === 'true' || value === '1' || value === 'yes';
}

async function queryJsonRows<T>(dbPath: string, sql: string): Promise<T[]> {
	const { stdout } = await execFileAsync('sqlite3', ['-readonly', '-json', dbPath, sql], {
		maxBuffer: 64 * 1024 * 1024
	});
	const trimmed = stdout.trim();
	if (!trimmed) return [];
	const parsed = JSON.parse(trimmed) as unknown;
	return Array.isArray(parsed) ? (parsed as T[]) : [];
}

async function tableExists(dbPath: string, tableName: string): Promise<boolean> {
	const rows = await queryJsonRows<{ name: string }>(
		dbPath,
		`SELECT name FROM sqlite_master WHERE type = 'table' AND name = ${sqlString(tableName)} LIMIT 1;`
	);
	return rows.length > 0;
}

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
	if (!value) return {};
	try {
		const parsed = JSON.parse(value) as unknown;
		return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function stringField(obj: Record<string, unknown>, key: string): string | undefined {
	const value = obj[key];
	return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function previewFrom(value: Record<string, unknown>, fallback?: string): string | undefined {
	return (
		stringField(value, 'summary') ??
		stringField(value, 'description') ??
		stringField(value, 'question') ??
		stringField(value, 'status') ??
		fallback
	);
}

function legacyProjectionType(projType: string): string {
	const normalized = projType.trim().toUpperCase();
	if (['FACT', 'STEP', 'GOAL', 'CONSTRAINT'].includes(normalized)) return 'analysis_plan';
	return projType;
}

function artifactIdForLegacy(payload: Record<string, unknown>): string | undefined {
	const explicit = stringField(payload, 'artifact_id');
	if (explicit) return explicit;
	const kind = stringField(payload, 'artifact_kind');
	const name = stringField(payload, 'name') ?? stringField(payload, 'projection_id');
	return kind && name ? `${kind}__${name}` : undefined;
}

function projectionIdFromName(name: string): string | undefined {
	const trimmed = name.trim();
	if (!trimmed) return undefined;
	if (trimmed.startsWith('answer_snapshot__')) return trimmed.slice('answer_snapshot__'.length);
	return trimmed;
}

function catalogKey(row: CatalogItem): string {
	if (row.artifact_id) return `artifact:${row.artifact_id}`;
	if (row.artifact_kind === 'answer_snapshot' && row.projection_id) {
		return `snapshot:${row.projection_id}`;
	}
	if (row.artifact_kind === 'analysis_plan' && row.projection_id) {
		return `plan:${row.projection_id}`;
	}
	return `${row.source}:${row.id ?? row.entity_id ?? row.public_label ?? row.preview ?? Math.random()}`;
}

function matchesSearch(row: CatalogItem, search: string): boolean {
	if (!search) return true;
	const haystack = [
		row.artifact_id,
		row.artifact_kind,
		row.public_label,
		row.scope,
		row.projection_id,
		row.proj_type,
		row.linked_snapshot_id,
		row.preview,
		row.content,
		row.source,
		...(row.suggested_tools ?? [])
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();
	return haystack.includes(search.toLowerCase());
}

function kindRank(kind: string): number {
	return ['analysis_plan', 'answer_snapshot', 'live_answer_view', 'evidence_pack'].indexOf(kind);
}

function sortCatalog(a: CatalogItem, b: CatalogItem): number {
	const kindDelta = (kindRank(a.artifact_kind) + 10) % 10 - ((kindRank(b.artifact_kind) + 10) % 10);
	if (kindDelta !== 0) return kindDelta;
	return (a.public_label ?? a.artifact_id ?? '').localeCompare(b.public_label ?? b.artifact_id ?? '');
}

function suggestedTools(row: CatalogItem): string[] {
	if (row.source === 'graph_projection') return ['ghostcrab_projection_get'];
	switch (row.artifact_kind) {
		case 'analysis_plan':
			return ['ghostcrab_artifact_get', 'ghostcrab_pack'];
		case 'live_answer_view':
			return ['ghostcrab_artifact_get', 'ghostcrab_live_refresh'];
		case 'answer_snapshot':
			return ['ghostcrab_projection_get', 'ghostcrab_artifact_get'];
		case 'evidence_pack':
			return ['ghostcrab_artifact_get'];
		default:
			return ['ghostcrab_artifact_get'];
	}
}

export const GET: RequestHandler = async ({ url }) => {
	const runtime = resolveMindbrainRuntime();
	const dbPath = runtime.sqlitePath;
	if (!dbPath) throw error(503, 'No SQLite runtime path resolved');

	const workspaceId = safeWorkspaceId(url.searchParams.get('workspace_id'));
	const agentId = safeAgentId(url.searchParams.get('agent_id'));
	const artifactKind = safeKind(url.searchParams.get('artifact_kind'));
	const search = safeSearch(url.searchParams.get('search') ?? url.searchParams.get('query'));
	const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 1000) || 1000, 1), 1000);
	const includeLegacy = safeBoolean(url.searchParams.get('include_legacy'));

	const items: CatalogItem[] = [];

	if (await tableExists(dbPath, 'mindbrain_answer_artifacts')) {
		const artifactRows = await queryJsonRows<AnswerArtifactRow>(
			dbPath,
			`
			SELECT artifact_id, slug, workspace_id, agent_id, scope, artifact_kind, public_label,
			       lifecycle, state, current_version, payload_json, legacy_ref, created_at_unix, updated_at_unix
			FROM mindbrain_answer_artifacts
			WHERE workspace_id = ${sqlString(workspaceId)}
			  ${artifactKind ? `AND artifact_kind = ${sqlString(artifactKind)}` : ''}
			ORDER BY artifact_kind, public_label, updated_at_unix DESC
			LIMIT ${limit};
			`
		);
		for (const row of artifactRows) {
			const payload = parseJsonObject(row.payload_json);
			const projectionId =
				stringField(payload, 'projection_id') ??
				(row.artifact_id.startsWith(`${row.artifact_kind}__`)
					? row.artifact_id.slice(`${row.artifact_kind}__`.length)
					: undefined);
			items.push({
				artifact_id: row.artifact_id,
				artifact_kind: row.artifact_kind,
				public_label: row.public_label,
				scope: row.scope,
				lifecycle: row.lifecycle,
				state: row.state,
				current_version: row.current_version,
				projection_id: projectionId,
				proj_type: stringField(payload, 'proj_type'),
				type: row.artifact_kind,
				status: row.state,
				content: row.public_label,
				preview: previewFrom(payload),
				source_ref: row.legacy_ref,
				source: 'answer_artifact',
				raw: { ...row, payload }
			});
		}
	}

	const hasRegistryAnalysisPlans = items.some(
		(row) => row.source === 'answer_artifact' && row.artifact_kind === 'analysis_plan'
	);

	if ((includeLegacy || !hasRegistryAnalysisPlans) && (await tableExists(dbPath, 'projections'))) {
		const legacyRows = await queryJsonRows<ProjectionCatalogRow>(
			dbPath,
			`
			SELECT id, agent_id, scope, proj_type, content, weight, source_ref, status,
			       created_at_unix, expires_at_unix
			FROM projections
			WHERE (scope = ${sqlString(workspaceId)} OR scope LIKE ${sqlString(`${workspaceId}:%`)})
			  ${agentId ? `AND agent_id = ${sqlString(agentId)}` : ''}
			  AND status IN ('active', 'blocking')
			  AND (expires_at_unix IS NULL OR expires_at_unix > strftime('%s','now'))
			ORDER BY proj_type, weight DESC, created_at_unix DESC
			LIMIT ${limit};
			`
		);
		for (const row of legacyRows) {
			const payload = parseJsonObject(row.content);
			const legacyKind = `projection_${row.proj_type.toLowerCase()}`;
			const inferredKind = stringField(payload, 'artifact_kind') ?? legacyProjectionType(row.proj_type);
			const projectionId =
				stringField(payload, 'name') ??
				stringField(payload, 'projection_id') ??
				(row.source_ref?.startsWith('projection:') ? row.source_ref.slice('projection:'.length).trim() : undefined);
			items.push({
				id: row.id,
				artifact_id: artifactIdForLegacy(payload),
				artifact_kind: inferredKind,
				legacy_kind: legacyKind,
				public_label: stringField(payload, 'label') ?? stringField(payload, 'public_label'),
				scope: row.scope,
				projection_id: projectionId,
				proj_type: row.proj_type,
				type: inferredKind,
				status: row.status,
				weight: row.weight,
				content: row.content,
				preview: previewFrom(payload, row.content),
				source_ref: row.source_ref,
				source: 'legacy_projection',
				raw: { ...row, payload }
			});
		}
	}

	if (await tableExists(dbPath, 'graph_entity')) {
		const graphRows = await queryJsonRows<GraphProjectionRow>(
			dbPath,
			`
			SELECT entity_id, workspace_id, name, confidence, metadata_json
			FROM graph_entity
			WHERE workspace_id = ${sqlString(workspaceId)}
			  AND entity_type = 'ProjectionResult'
			ORDER BY name, entity_id
			LIMIT ${limit};
			`
		);
		for (const row of graphRows) {
			const metadata = parseJsonObject(row.metadata_json);
			const artifactId = stringField(metadata, 'artifact_id') ?? row.name;
			const projectionId = stringField(metadata, 'projection_id') ?? projectionIdFromName(row.name);
			items.push({
				artifact_id: artifactId,
				artifact_kind: stringField(metadata, 'artifact_kind') ?? 'answer_snapshot',
				public_label: stringField(metadata, 'public_label') ?? row.name,
				lifecycle: stringField(metadata, 'lifecycle'),
				state: stringField(metadata, 'state') ?? 'ready',
				projection_id: projectionId,
				type: 'answer_snapshot',
				status: stringField(metadata, 'state') ?? 'ready',
				weight: row.confidence,
				content: row.name,
				preview: previewFrom(metadata),
				entity_id: row.entity_id,
				source: 'graph_projection',
				raw: { ...row, metadata }
			});
		}
	}

	const deduped = new Map<string, CatalogItem>();
	for (const row of items) {
		const key = catalogKey(row);
		const existing = deduped.get(key);
		if (!existing || existing.source === 'legacy_projection') {
			deduped.set(key, { ...existing, ...row, raw: row.raw });
		} else if (row.source === 'legacy_projection') {
			deduped.set(key, {
				...existing,
				proj_type: existing.proj_type ?? row.proj_type,
				scope: existing.scope ?? row.scope,
				status: existing.status ?? row.status,
				weight: existing.weight ?? row.weight,
				preview: existing.preview ?? row.preview,
				raw: { ...existing.raw, legacy_projection: row.raw }
			});
		} else if (row.source === 'graph_projection') {
			deduped.set(key, {
				...existing,
				entity_id: existing.entity_id ?? row.entity_id,
				projection_id: existing.projection_id ?? row.projection_id,
				preview: existing.preview ?? row.preview,
				raw: { ...existing.raw, graph_projection: row.raw }
			});
		}
	}

	const snapshotBySourcePlan = new Map<string, CatalogItem>();
	for (const row of deduped.values()) {
		const metadata = row.raw.metadata as Record<string, unknown> | undefined;
		const sourcePlanId = typeof metadata?.source_plan_id === 'string' ? metadata.source_plan_id : null;
		if (row.artifact_kind === 'answer_snapshot' && sourcePlanId) {
			snapshotBySourcePlan.set(sourcePlanId, row);
		}
	}
	for (const [key, row] of deduped.entries()) {
		const linkedSnapshot = row.artifact_id ? snapshotBySourcePlan.get(row.artifact_id) : undefined;
		const graphFocusable = row.entity_id != null || Boolean(linkedSnapshot?.entity_id);
		deduped.set(key, {
			...row,
			graph_focusable: graphFocusable,
			linked_snapshot_id: linkedSnapshot?.projection_id ?? linkedSnapshot?.artifact_id,
			suggested_tools: suggestedTools(row)
		});
	}

	const rows = [...deduped.values()]
		.filter((row) => !artifactKind || row.artifact_kind === artifactKind)
		.filter((row) => matchesSearch(row, search))
		.sort(sortCatalog)
		.slice(0, limit);

	return json({
		workspace_id: workspaceId,
		agent_id: agentId,
		artifact_kind: artifactKind,
		include_legacy: includeLegacy,
		search,
		rows
	});
};
