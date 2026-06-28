CREATE TABLE graph_entity (
	entity_id INTEGER PRIMARY KEY,
	workspace_id TEXT NOT NULL DEFAULT 'default',
	entity_type TEXT NOT NULL,
	name TEXT NOT NULL,
	confidence REAL NOT NULL DEFAULT 1.0,
	deprecated_at INTEGER,
	metadata_json TEXT NOT NULL DEFAULT '{}',
	created_at_unix INTEGER NOT NULL DEFAULT (unixepoch()),
	UNIQUE(entity_type, name)
);

CREATE TABLE graph_relation (
	relation_id INTEGER PRIMARY KEY,
	workspace_id TEXT NOT NULL DEFAULT 'default',
	relation_type TEXT NOT NULL,
	source_id INTEGER NOT NULL,
	target_id INTEGER NOT NULL,
	valid_from_unix INTEGER,
	valid_to_unix INTEGER,
	confidence REAL NOT NULL DEFAULT 1.0,
	deprecated_at INTEGER,
	run_id INTEGER,
	patch_id INTEGER,
	metadata_json TEXT NOT NULL DEFAULT '{}',
	created_at_unix INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE facets (
	id TEXT PRIMARY KEY,
	schema_id TEXT NOT NULL,
	content TEXT NOT NULL,
	facets TEXT NOT NULL DEFAULT '{}',
	facets_json TEXT NOT NULL DEFAULT '{}',
	workspace_id TEXT NOT NULL DEFAULT 'default',
	source_ref TEXT,
	updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
	updated_at_unix INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE workspaces (
	id TEXT PRIMARY KEY,
	workspace_id TEXT UNIQUE,
	label TEXT NOT NULL DEFAULT 'GhostCrab Operating Model',
	status TEXT NOT NULL DEFAULT 'active'
);

CREATE INDEX graph_entity_workspace_id_idx ON graph_entity(workspace_id);
CREATE INDEX graph_relation_workspace_id_idx ON graph_relation(workspace_id);
CREATE INDEX graph_relation_source_id_idx ON graph_relation(source_id, relation_id);
CREATE INDEX graph_relation_target_id_idx ON graph_relation(target_id, relation_id);
CREATE INDEX facets_source_ref_idx ON facets(source_ref);
CREATE INDEX facets_workspace_id_idx ON facets(workspace_id);

INSERT INTO workspaces (id, workspace_id, label, status)
VALUES ('ai-act', 'ai-act', 'AI Act', 'active');

INSERT INTO graph_entity (entity_id, workspace_id, entity_type, name, metadata_json)
VALUES
	(1, 'ai-act', 'article', 'Article 5', '{"ontology_layer":"legal_text","risk_level":"prohibited"}'),
	(2, 'ai-act', 'obligation', 'Ban unacceptable-risk AI', '{"obligation_type":"prohibition","stakeholder_role":"provider"}'),
	(3, 'ai-act', 'stakeholder', 'Provider', '{"stakeholder_role":"provider"}');

INSERT INTO graph_relation (relation_id, workspace_id, relation_type, source_id, target_id, confidence)
VALUES
	(1, 'ai-act', 'GROUNDS', 1, 2, 0.95),
	(2, 'ai-act', 'APPLIES_TO', 2, 3, 0.9);

INSERT INTO facets (id, schema_id, content, facets_json, workspace_id, source_ref, updated_at_unix)
VALUES
	('facet-article-5', 'ghostcrab:facet', 'Article 5 facet', '{"record_id":"Article 5","celex":"32024R1689","language":"en"}', 'ai-act', 'ai-act:Article 5', 1);
