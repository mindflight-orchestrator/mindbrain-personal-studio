#!/usr/bin/env node
/**
 * Seed immeuble-demo projections into the local SQLite file.
 * Idempotent: skips rows that match agent_id + scope + proj_type + content.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const STUDIO_ROOT = join(SCRIPT_DIR, '..');
const GHOSTCRAB_ROOT = process.env.GHOSTCRAB_ROOT ?? join(STUDIO_ROOT, '..', 'ghostcrab-personal-mcp');
const SQLITE_PATH = process.env.GHOSTCRAB_SQLITE_PATH ?? join(STUDIO_ROOT, 'data', 'immeuble-demo.sqlite');
const AGENT_ID = process.env.GHOSTCRAB_AGENT_ID ?? 'agent:self';
const LOCAL_SEED_FILE = join(STUDIO_ROOT, 'docs', 'demo-immo', 'immeuble-demo', 'projections.seed.jsonl');
const GHOSTCRAB_SEED_FILE = join(GHOSTCRAB_ROOT, 'examples', 'immeuble-demo', 'projections.seed.jsonl');
const SEED_FILE =
	process.env.IMMEUBLE_PROJECTIONS_SEED ??
	(existsSync(LOCAL_SEED_FILE) ? LOCAL_SEED_FILE : GHOSTCRAB_SEED_FILE);
const TYPE_B_PROJECTION_ID = 'proj_immeuble_quota_check';

function runSqlite(sql) {
	const result = spawnSync('sqlite3', [SQLITE_PATH, sql], { encoding: 'utf8' });
	if (result.status !== 0) {
		throw new Error(result.stderr || result.stdout || 'sqlite3 failed');
	}
	return result.stdout.trim();
}

function escapeSql(value) {
	return `'${String(value).replace(/'/g, "''")}'`;
}

function seedTypeBProjection() {
	const evidenceId = runSqlite(
		"SELECT entity_id FROM graph_entity WHERE workspace_id='immeuble-demo' AND deprecated_at IS NULL ORDER BY CASE entity_type WHEN 'building' THEN 0 WHEN 'unit' THEN 1 ELSE 2 END, entity_id LIMIT 1;"
	);
	if (!evidenceId) {
		console.warn('warning: no graph_entity row found; skipped Type B projection seed');
		return { typeBSeeded: false };
	}

	const projectionMetadata = JSON.stringify({
		projection_id: TYPE_B_PROJECTION_ID,
		collection_id: 'immeuble-demo',
		metric: 'quota_total_check',
		summary: 'Contrôle matérialisé des quotités immeuble pour le smoke Studio.'
	});
	const projectionEntityId = runSqlite(
		`
		INSERT INTO graph_entity (workspace_id, entity_type, name, confidence, metadata_json)
		VALUES ('immeuble-demo', 'ProjectionResult', 'Immeuble quota check', 0.99, ${escapeSql(projectionMetadata)})
		ON CONFLICT(workspace_id, entity_type, name)
		DO UPDATE SET confidence=excluded.confidence, metadata_json=excluded.metadata_json, deprecated_at=NULL
		RETURNING entity_id;
		`
	);

	const deltaMetadata = JSON.stringify({
		metric: TYPE_B_PROJECTION_ID,
		status: 'ok',
		expected_total: 1000,
		actual_total: 1000
	});
	runSqlite(
		`
		INSERT INTO graph_entity (workspace_id, entity_type, name, confidence, metadata_json)
		VALUES ('immeuble-demo', 'DeltaFinding', 'Quota total delta', 0.98, ${escapeSql(deltaMetadata)})
		ON CONFLICT(workspace_id, entity_type, name)
		DO UPDATE SET confidence=excluded.confidence, metadata_json=excluded.metadata_json, deprecated_at=NULL
		RETURNING entity_id;
		`
	);

	const relationMetadata = JSON.stringify({
		projection_id: TYPE_B_PROJECTION_ID,
		role: 'smoke_evidence'
	});
	const existingRelation = runSqlite(
		`SELECT relation_id FROM graph_relation WHERE workspace_id='immeuble-demo' AND relation_type='PROVEN_BY' AND source_id=${projectionEntityId} AND target_id=${evidenceId} LIMIT 1;`
	);
	if (existingRelation) {
		runSqlite(
			`UPDATE graph_relation SET metadata_json=${escapeSql(relationMetadata)}, confidence=1.0, deprecated_at=NULL WHERE relation_id=${existingRelation};`
		);
	} else {
		runSqlite(
			`INSERT INTO graph_relation (workspace_id, relation_type, source_id, target_id, confidence, metadata_json) VALUES ('immeuble-demo', 'PROVEN_BY', ${projectionEntityId}, ${evidenceId}, 1.0, ${escapeSql(relationMetadata)});`
		);
	}

	return { typeBSeeded: true, projectionEntityId, evidenceId };
}

function main() {
	if (!existsSync(SQLITE_PATH)) {
		console.error(`error: SQLite file not found: ${SQLITE_PATH}`);
		console.error('Run pnpm load:demo first.');
		process.exit(1);
	}
	if (!existsSync(SEED_FILE)) {
		console.error(`error: seed file not found: ${SEED_FILE}`);
		process.exit(1);
	}
	if (spawnSync('sqlite3', ['-version']).status !== 0) {
		console.error('error: sqlite3 CLI is required');
		process.exit(1);
	}

	const lines = readFileSync(SEED_FILE, 'utf8')
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);

	let inserted = 0;
	let updated = 0;
	let skipped = 0;
	const now = Math.floor(Date.now() / 1000);

	for (const line of lines) {
		const row = JSON.parse(line);
		const scope = String(row.scope ?? 'immeuble-demo');
		const projType = String(row.proj_type ?? 'STEP');
		const content = String(row.content ?? '');
		const weight = Number(row.weight ?? 0.7);
		const status = String(row.status ?? 'active');
		const sourceRef = row.source_ref == null ? null : String(row.source_ref);
		const sourceType = 'seed:immeuble-demo';

		if (!content) {
			skipped += 1;
			continue;
		}

		const existing = runSqlite(
			`SELECT id FROM projections WHERE agent_id=${escapeSql(AGENT_ID)} AND scope=${escapeSql(scope)} AND proj_type=${escapeSql(projType)} AND content=${escapeSql(content)} LIMIT 1;`
		);

		if (existing) {
			runSqlite(
				`UPDATE projections SET weight=${weight}, status=${escapeSql(status)}, source_type=${escapeSql(sourceType)}, source_ref=${sourceRef ? escapeSql(sourceRef) : 'NULL'} WHERE id=${escapeSql(existing)};`
			);
			updated += 1;
			continue;
		}

		const id = randomUUID();
		runSqlite(
			`INSERT INTO projections (id, agent_id, scope, proj_type, content, weight, source_ref, source_type, status, created_at_unix) VALUES (${escapeSql(id)}, ${escapeSql(AGENT_ID)}, ${escapeSql(scope)}, ${escapeSql(projType)}, ${escapeSql(content)}, ${weight}, ${sourceRef ? escapeSql(sourceRef) : 'NULL'}, ${escapeSql(sourceType)}, ${escapeSql(status)}, ${now});`
		);
		inserted += 1;
	}

	const count = runSqlite(
		`SELECT COUNT(*) FROM projections WHERE agent_id=${escapeSql(AGENT_ID)} AND scope='immeuble-demo';`
	);
	const typeB = seedTypeBProjection();
	console.log(`==> Projections seeded into ${SQLITE_PATH}`);
	console.log(`    inserted=${inserted} updated=${updated} skipped=${skipped} total=${count}`);
	if (typeB.typeBSeeded) {
		console.log(
			`    type_b=${TYPE_B_PROJECTION_ID} projection_entity=${typeB.projectionEntityId} evidence_entity=${typeB.evidenceId}`
		);
	}
}

main();
