# Ontology Export Test

Source DB: local GhostCrab SQLite test database.

## Commands Tested

- `gcp brain backup --scope taxonomies`
- `gcp brain ontology export --format ntriples`
- `gcp brain ontology export --format bundle`
- `gcp brain ontology export-linkml --input <bundle.json>`

## Results

| Workspace / ontology | N-Triples lines | LinkML lines | Status |
|---|---:|---:|---|
| `immeuble::core` | 182 | 371 | OK |

## Findings

- Taxonomy backup exports are non-empty for the audited workspace:
  - `immeuble.taxonomies.backup.json`
- Native `ntriples` export is driven by `ontology_triples_raw`.
- `gcp brain ontology export-linkml --db ...` cannot be tested while Studio is running because the command performs backend preflight but does not accept `--force`; `export-linkml --input <bundle.json>` works.

## Output Directory

`docs/demo/ontology-export-test/2026-06-26/`
