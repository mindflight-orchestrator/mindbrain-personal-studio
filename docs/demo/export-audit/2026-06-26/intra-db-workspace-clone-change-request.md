# Intra-DB Workspace Clone Change Request

## Finding

`gcp brain backup` / `gcp brain load` are designed to restore the same `workspace_id`
into another database, or to replace the same workspace with `--overwrite --confirm`.
They are not designed to clone a workspace under a different id inside the same
SQLite database.

## Why clone is not a JSON-only operation

An intra-DB clone needs coordinated remapping of global identifiers, not only
`workspace_id`:

- `ontology_id` and `collection_id`
- `mindbrain_answer_artifacts.artifact_id`
- document-level `doc_nanoid`
- `agent_facts.doc_id`
- nested ids in `payload_json`, `metadata_json`, `facets`, `facets_json`, and
  `source_ref`

The ad hoc clone experiment proved this can be forced with a remapped bundle,
but it is not a supported product contract and should not be used as the
idempotence test.

## Recommended backend feature

If intra-DB cloning is needed, implement it as a first-class backend operation:

```bash
gcp brain load backup.json --target-workspace-id <new-id> --clone --confirm
```

The backend should own all identifier remapping and emit a mapping manifest for
workspace, ontology, collection, graph, raw graph, document, fact, and artifact
ids.
