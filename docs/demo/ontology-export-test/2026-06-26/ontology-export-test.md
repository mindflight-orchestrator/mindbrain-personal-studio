# Ontology Export Test

Source DB: `/home/dlamotte/.ghostcrab/databases/ghostcrab-private-domain-v4-demos.sqlite`

## Commands Tested

- `gcp brain backup --scope taxonomies`
- `gcp brain ontology export --format ntriples`
- `gcp brain ontology export --format bundle`
- `gcp brain ontology export-linkml --input <bundle.json>`

## Results

| Workspace / ontology | N-Triples lines | LinkML lines | Status |
|---|---:|---:|---|
| `immeuble::core` | 182 | 371 | OK |
| `private-domain-production-v5` | 0 | 1010 | Partial |
| `private-domain-production-v5::administrative` | 852 | not tested | OK |
| `private-domain-production-v5::comptabilite` | 1233 | 286 | OK |
| `private-domain-production-v5::decisionnel` | 441 | not tested | OK |
| `private-domain-production-v5::missions` | 738 | 193 | OK |
| `private-domain-production-v5::operations` | 678 | not tested | OK |
| `private-domain-production-v5::production` | 423 | not tested | OK |
| `private-domain-production-v5::technique` | 480 | not tested | OK |

## Findings

- Taxonomy backup exports are non-empty for both workspaces:
  - `immeuble.taxonomies.backup.json`
  - `private-domain-production-v5.taxonomies.backup.json`
- Native `ntriples` export is driven by `ontology_triples_raw`.
- `private-domain-production-v5` root has native classes/relations but `0` rows in `ontology_triples_raw`, so its `.nt` export is empty.
- `gcp brain ontology export --format bundle --ontology-id <id>` currently emits the workspace taxonomy bundle, not a single-ontology-only bundle, for private-domain modules.
- `gcp brain ontology export-linkml --db ...` cannot be tested while Studio is running because the command performs backend preflight but does not accept `--force`; `export-linkml --input <bundle.json>` works.

## Output Directory

`docs/demo/ontology-export-test/2026-06-26/`
