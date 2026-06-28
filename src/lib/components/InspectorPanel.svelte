<script lang="ts">
	import {
		parseJsonObject,
		formatUnixDate,
		scalarRows,
		extractTriples,
		definitionFromTriples,
		type TripleRow
	} from '$lib/brain/inspectorHelpers';
	import { parseDatatypePropertiesFromTriples } from '$lib/brain/schemaIndex';
	import SchemaPropertyEditor from '$lib/components/SchemaPropertyEditor.svelte';
	import HelpHint from '$lib/components/HelpHint.svelte';
	import { MODELE_HELP } from '$lib/modeleHelp';

	type InspectorSelection =
		| {
				kind: 'entity';
				entityId: number;
				entityType: string;
				label: string;
				payload?: Record<string, unknown>;
		  }
		| {
				kind: 'relation';
				relationId: number;
				relationType: string;
				payload?: Record<string, unknown>;
		  }
		| { kind: 'ontology'; nodeKind: string; typeName: string; payload?: Record<string, unknown> }
		| null;

	type InstanceView = {
		title: string;
		subtitle?: string;
		scalars: Array<[string, string]>;
		facets: Array<[string, string]>;
		incidentRelations: Array<Record<string, unknown>>;
		properties: Array<[string, string]>;
		provenance: Array<[string, string]>;
		raw?: Record<string, unknown>;
	};

	type DefinitionView = {
		typeName: string;
		label?: string | null;
		definition?: string | null;
		parentType?: string | null;
		sourceType?: string | null;
		targetType?: string | null;
		triples: TripleRow[];
		scalars: Array<[string, string]>;
		properties: Array<{ name: string; range: string }>;
		outgoingRelations: Array<{ edgeType: string; targetType: string }>;
		unavailable?: string;
		kind?: 'entity' | 'edge';
	};

	type TaxonomyView = {
		ontologyId: string;
		dimensions: Array<{
			key: string;
			label: string;
			valueType: string;
			hierarchyKind: string;
			values: Array<{ value: string; label?: string | null; parentValueId?: number | null }>;
		}>;
		unavailable?: string;
	};

	let {
		selection = $bindable(null),
		ontologyId = '',
		workspaceId = '',
		onOpenType,
		embedded = false
	}: {
		selection?: InspectorSelection;
		ontologyId?: string;
		workspaceId?: string;
		onOpenType?: (typeName: string, nodeKind: string) => void;
		embedded?: boolean;
	} = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let instanceView = $state<InstanceView | null>(null);
	let definitionView = $state<DefinitionView | null>(null);
	let taxonomyView = $state<TaxonomyView | null>(null);
	let showRaw = $state(false);
	let showPropertyEditor = $state(false);
	let editorKind = $state<'datatype' | 'object'>('datatype');

	$effect(() => {
		void loadInspector(selection, ontologyId, workspaceId);
	});

	async function loadInspector(
		current: InspectorSelection,
		currentOntologyId: string,
		currentWorkspaceId: string
	) {
		if (!current) {
			instanceView = null;
			definitionView = null;
			taxonomyView = null;
			error = null;
			return;
		}
		loading = true;
		error = null;
		try {
			if (current.kind === 'entity') {
				const detail = await loadEntityDetail(current, currentWorkspaceId);
				instanceView = buildEntityView(detail, current);
				const typeName = String(
					(detail.entity as Record<string, unknown> | undefined)?.entity_type ?? current.entityType
				);
				definitionView = await loadDefinition(currentOntologyId, 'entity', typeName, currentWorkspaceId);
				taxonomyView = null;
			} else if (current.kind === 'relation') {
				const detail = await loadRelationDetail(current, currentWorkspaceId);
				instanceView = buildRelationView(detail, current);
				const typeName = String(
					(detail.relation as Record<string, unknown> | undefined)?.relation_type ??
						current.relationType
				);
				definitionView = await loadDefinition(currentOntologyId, 'edge', typeName);
				taxonomyView = null;
			} else {
				instanceView = buildOntologySelectionView(current);
				definitionView = buildOntologyDefinitionView(current);
				taxonomyView = null;
			}
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
			instanceView = buildFallbackInstance(current);
			definitionView = null;
			taxonomyView = null;
		} finally {
			loading = false;
		}
	}

	async function fetchJson(path: string): Promise<Record<string, unknown>> {
		const res = await fetch(path);
		if (!res.ok) throw new Error(await res.text());
		return (await res.json()) as Record<string, unknown>;
	}

	async function loadEntityDetail(
		current: Extract<InspectorSelection, { kind: 'entity' }>,
		ws: string
	): Promise<Record<string, unknown>> {
		const params = new URLSearchParams({ entity_id: String(current.entityId) });
		if (ws.trim()) params.set('workspace_id', ws.trim());
		try {
			return await fetchJson(`/api/brain/graph/entity?${params}`);
		} catch {
			return {
				entity: {
					entity_id: current.entityId,
					entity_type: current.entityType,
					name: current.label,
					metadata_json: JSON.stringify(current.payload ?? {})
				},
				incident_relations: [],
				facets: []
			};
		}
	}

	async function loadRelationDetail(
		current: Extract<InspectorSelection, { kind: 'relation' }>,
		ws: string
	): Promise<Record<string, unknown>> {
		const params = new URLSearchParams({ relation_id: String(current.relationId) });
		if (ws.trim()) params.set('workspace_id', ws.trim());
		try {
			return await fetchJson(`/api/brain/graph/relation?${params}`);
		} catch {
			return {
				relation: {
					relation_id: current.relationId,
					relation_type: current.relationType,
					...(current.payload ?? {})
				},
				properties: []
			};
		}
	}

	async function loadClassOutgoingRelations(
		ontId: string,
		typeName: string,
		ws: string
	): Promise<Array<{ edgeType: string; targetType: string }>> {
		try {
			const params = new URLSearchParams({ ontology_id: ontId });
			if (ws.trim()) params.set('workspace_id', ws.trim());
			const data = await fetchJson(`/api/brain/ontology/graph?${params}`);
			const edges = Array.isArray(data.edges) ? (data.edges as Array<Record<string, unknown>>) : [];
			const seen = new Set<string>();
			const rows: Array<{ edgeType: string; targetType: string }> = [];
			for (const edge of edges) {
				const source = String(edge.source_type ?? '');
				if (source !== typeName) continue;
				const edgeType = String(edge.type ?? edge.label ?? '');
				const targetType = String(edge.target_type ?? '?');
				const key = `${edgeType}:${targetType}`;
				if (!edgeType || seen.has(key)) continue;
				seen.add(key);
				rows.push({ edgeType, targetType });
			}
			return rows.sort((a, b) => a.edgeType.localeCompare(b.edgeType));
		} catch {
			return [];
		}
	}

	async function loadDefinition(
		ontId: string,
		kind: 'entity' | 'edge',
		typeName: string,
		ws = ''
	): Promise<DefinitionView> {
		if (!ontId || !typeName) {
			return {
				typeName,
				triples: [],
				scalars: [],
				properties: [],
				outgoingRelations: [],
				unavailable: 'No ontology linked.'
			};
		}
		try {
			const data = await fetchJson(
				`/api/brain/ontology/type?ontology_id=${encodeURIComponent(ontId)}&kind=${kind}&type=${encodeURIComponent(typeName)}`
			);
			const triples = extractTriples(data);
			const meta = parseJsonObject(data.metadata_json);
			const classUri = typeof meta.class_uri === 'string' ? meta.class_uri : null;
			const parentType =
				typeof meta.is_a === 'string' && meta.is_a.trim() ? meta.is_a.trim() : null;
			return {
				typeName: String(data.type_name ?? typeName),
				label: data.label == null ? null : String(data.label),
				definition: definitionFromTriples(triples) ?? (meta.definition == null ? null : String(meta.definition)),
				parentType,
				sourceType: data.source_entity_type == null ? null : String(data.source_entity_type),
				targetType: data.target_entity_type == null ? null : String(data.target_entity_type),
				triples,
				scalars: scalarRows(meta),
				properties: parseDatatypePropertiesFromTriples(triples, typeName, classUri),
				outgoingRelations:
					kind === 'entity' ? await loadClassOutgoingRelations(ontId, typeName, ws) : [],
				kind
			};
		} catch (e) {
			return {
				typeName,
				triples: [],
				scalars: [],
				properties: [],
				outgoingRelations: [],
				unavailable: e instanceof Error ? e.message : 'Ontology type unavailable.'
			};
		}
	}

	async function loadTaxonomy(ontId: string, ws: string): Promise<TaxonomyView | null> {
		if (!ontId) return null;
		try {
			const params = new URLSearchParams({ ontology_id: ontId });
			if (ws.trim()) params.set('workspace_id', ws.trim());
			const data = await fetchJson(`/api/brain/ontology/taxonomy?${params}`);
			const dimensionsRaw = Array.isArray(data.dimensions)
				? (data.dimensions as Array<Record<string, unknown>>)
				: [];
			const valuesRaw = Array.isArray(data.values)
				? (data.values as Array<Record<string, unknown>>)
				: [];
			const dimensions = dimensionsRaw.map((dim) => {
				const namespace = String(dim.namespace ?? '');
				const dimension = String(dim.dimension ?? '');
				const key = `${namespace}.${dimension}`;
				const values = valuesRaw
					.filter((value) => String(value.namespace ?? '') === namespace && String(value.dimension ?? '') === dimension)
					.map((value) => ({
						value: String(value.value ?? ''),
						label: value.label == null ? null : String(value.label),
						parentValueId:
							value.parent_value_id == null ? null : Number(value.parent_value_id)
					}));
				return {
					key,
					label: key,
					valueType: String(dim.value_type ?? ''),
					hierarchyKind: String(dim.hierarchy_kind ?? ''),
					values
				};
			});
			return { ontologyId: String(data.ontology_id ?? ontId), dimensions };
		} catch (e) {
			return {
				ontologyId: ontId,
				dimensions: [],
				unavailable: e instanceof Error ? e.message : 'Taxonomy unavailable.'
			};
		}
	}

	function buildEntityView(
		detail: Record<string, unknown>,
		current: Extract<InspectorSelection, { kind: 'entity' }>
	): InstanceView {
		const entity = (detail.entity as Record<string, unknown> | undefined) ?? {};
		const metadata = parseJsonObject(entity.metadata_json ?? entity.metadata);
		const facetsRaw = detail.facets;
		const facetRows: Array<[string, string]> = [];
		if (Array.isArray(facetsRaw)) {
			for (const facet of facetsRaw) {
				if (!facet || typeof facet !== 'object') continue;
				const f = facet as Record<string, unknown>;
				const id = String(f.id ?? f.facet_id ?? 'facet');
				const content = String(f.content ?? f.value ?? JSON.stringify(f.facets_json ?? f.facets ?? ''));
				facetRows.push([id, content.slice(0, 240)]);
			}
		}
		const incident = Array.isArray(detail.incident_relations)
			? (detail.incident_relations as Array<Record<string, unknown>>)
			: [];
		return {
			title: String(entity.name ?? current.label),
			subtitle: String(entity.entity_type ?? current.entityType),
			scalars: [
				['entity_id', String(entity.entity_id ?? current.entityId)],
				['confidence', entity.confidence == null ? '' : String(entity.confidence)],
				...scalarRows(metadata, new Set(['label', 'workspace_id']))
			].filter((row): row is [string, string] => row[1] !== ''),
			facets: facetRows,
			incidentRelations: incident,
			properties: [],
			provenance: scalarRows({
				deprecated_at: formatUnixDate(entity.deprecated_at) ?? '',
				created_at: formatUnixDate(entity.created_at_unix ?? entity.created_at) ?? '',
				run_id: entity.run_id,
				patch_id: entity.patch_id
			}),
			raw: detail
		};
	}

	function buildRelationView(
		detail: Record<string, unknown>,
		current: Extract<InspectorSelection, { kind: 'relation' }>
	): InstanceView {
		const relation = (detail.relation as Record<string, unknown> | undefined) ?? {};
		const meta = parseJsonObject(relation.metadata_json ?? relation.metadata);
		const propsRaw = detail.properties ?? relation.properties;
		const properties: Array<[string, string]> = [];
		if (Array.isArray(propsRaw)) {
			for (const prop of propsRaw) {
				if (!prop || typeof prop !== 'object') continue;
				const p = prop as Record<string, unknown>;
				const key = String(p.property_key ?? p.key ?? 'property');
				properties.push([key, String(p.property_value ?? p.value ?? '')]);
			}
		}
		return {
			title: String(relation.relation_type ?? current.relationType),
			subtitle: `${relation.source_id ?? '?'} → ${relation.target_id ?? '?'}`,
			scalars: [
				['relation_id', String(relation.relation_id ?? current.relationId)],
				['confidence', relation.confidence == null ? '' : String(relation.confidence)],
				['valid_from', formatUnixDate(relation.valid_from_unix) ?? ''],
				['valid_to', formatUnixDate(relation.valid_to_unix) ?? ''],
				...scalarRows(meta)
			].filter((row): row is [string, string] => row[1] !== ''),
			facets: [],
			incidentRelations: [],
			properties,
			provenance: scalarRows({
				run_id: relation.run_id,
				patch_id: relation.patch_id,
				source: meta.source,
				domain: meta.domain
			}),
			raw: detail
		};
	}

	function buildOntologySelectionView(
		current: Extract<InspectorSelection, { kind: 'ontology' }>
	): InstanceView {
		const payload = current.payload ?? {};
		return {
			title: current.typeName,
			subtitle: current.nodeKind,
			scalars: scalarRows(payload),
			facets: [],
			incidentRelations: [],
			properties: [],
			provenance: [],
			raw: payload
		};
	}

	function buildOntologyDefinitionView(
		current: Extract<InspectorSelection, { kind: 'ontology' }>
	): DefinitionView {
		const payload = current.payload ?? {};
		const field =
			payload.field && typeof payload.field === 'object' && !Array.isArray(payload.field)
				? (payload.field as Record<string, unknown>)
				: null;
		const sourceType =
			payload.native_source_type == null ? null : String(payload.native_source_type);
		const targetType =
			payload.native_target_type == null
				? payload.native_target_range == null
					? null
					: String(payload.native_target_range)
				: String(payload.native_target_type);
		const parentType =
			typeof payload.is_a === 'string' && payload.is_a.trim() ? payload.is_a.trim() : null;
		const definition =
			field?.description == null
				? payload.definition == null
					? null
					: String(payload.definition)
				: String(field.description);
		return {
			typeName: current.typeName,
			label:
				payload.label == null
					? field?.name == null
						? null
						: String(field.name)
					: String(payload.label),
			definition,
			parentType,
			sourceType,
			targetType,
			triples: [],
			scalars: scalarRows(payload, new Set(['field'])),
			properties:
				field && field.range != null
					? [{ name: String(field.name ?? current.typeName), range: String(field.range) }]
					: [],
			outgoingRelations: [],
			kind: current.nodeKind === 'edge' ? 'edge' : 'entity'
		};
	}

	function buildFallbackInstance(current: InspectorSelection): InstanceView | null {
		if (!current) return null;
		if (current.kind === 'entity') {
			return {
				title: current.label,
				subtitle: current.entityType,
				scalars: [['entity_id', String(current.entityId)]],
				facets: [],
				incidentRelations: [],
				properties: [],
				provenance: []
			};
		}
		if (current.kind === 'relation') {
			return {
				title: current.relationType,
				subtitle: `relation ${current.relationId}`,
				scalars: [['relation_id', String(current.relationId)]],
				facets: [],
				incidentRelations: [],
				properties: [],
				provenance: []
			};
		}
		return buildOntologySelectionView(current);
	}
</script>

<svelte:element this={embedded ? 'div' : 'aside'} class="inspector" class:embedded>
	{#if !embedded}
		<h2>Inspector</h2>
	{/if}
	{#if !selection}
		<p class="muted">Select a node or edge to inspect instance facts and ontology definition.</p>
	{:else if loading}
		<p class="muted">Loading…</p>
	{:else}
		{#if error}
			<p class="warn">{error}</p>
		{/if}

		{#if instanceView}
			<section>
				<h3>Instance</h3>
				<p class="title">{instanceView.title}</p>
				{#if instanceView.subtitle}
					<p class="subtitle">
						{instanceView.subtitle}
						{#if selection.kind === 'entity' || selection.kind === 'relation'}
							<button
								type="button"
								class="link"
								onclick={() =>
									onOpenType?.(
										selection.kind === 'entity' ? selection.entityType : selection.relationType,
										selection.kind === 'relation' ? 'edge' : 'entity'
									)}
							>
								View type in Modèle
							</button>
						{/if}
					</p>
				{/if}
				{#if instanceView.scalars.length > 0}
					<dl class="kv">
						{#each instanceView.scalars as [k, v]}
							<div><dt>{k}</dt><dd>{v}</dd></div>
						{/each}
					</dl>
				{/if}
				{#if instanceView.properties.length > 0}
					<h4>Relation properties</h4>
					<dl class="kv">
						{#each instanceView.properties as [k, v]}
							<div><dt>{k}</dt><dd>{v}</dd></div>
						{/each}
					</dl>
				{/if}
				{#if instanceView.facets.length > 0}
					<h4>Facets</h4>
					<dl class="kv">
						{#each instanceView.facets as [k, v]}
							<div><dt>{k}</dt><dd>{v}</dd></div>
						{/each}
					</dl>
				{/if}
				{#if instanceView.incidentRelations.length > 0}
					<h4>Incident relations ({instanceView.incidentRelations.length})</h4>
					<ul class="list">
						{#each instanceView.incidentRelations.slice(0, 8) as rel}
							<li>
								{String(rel.relation_type ?? rel.label ?? 'relation')}
								<span class="muted-inline">{rel.source_id ?? ''} → {rel.target_id ?? ''}</span>
							</li>
						{/each}
					</ul>
				{/if}
				{#if instanceView.provenance.length > 0}
					<h4>Provenance</h4>
					<dl class="kv">
						{#each instanceView.provenance as [k, v]}
							<div><dt>{k}</dt><dd>{v}</dd></div>
						{/each}
					</dl>
				{/if}
			</section>
		{/if}

		{#if definitionView}
			<section>
				<div class="section-head">
					<h3>Definition</h3>
					<HelpHint text={MODELE_HELP.inspectorDefinition} label="Definition help" />
				</div>
				{#if definitionView.unavailable}
					<p class="muted">{definitionView.unavailable}</p>
				{:else}
					<p class="title">{definitionView.label ?? definitionView.typeName}</p>
					<p class="type-id">{definitionView.typeName}</p>
					{#if definitionView.parentType}
						<p class="muted">subclass of {definitionView.parentType}</p>
					{/if}
					{#if definitionView.definition}
						<p class="definition">{definitionView.definition}</p>
					{/if}
					{#if definitionView.sourceType || definitionView.targetType}
						<p class="muted">
							{#if definitionView.sourceType}domain: {definitionView.sourceType}{/if}
							{#if definitionView.targetType} · range: {definitionView.targetType}{/if}
						</p>
					{/if}
					{#if definitionView.kind === 'entity' && ontologyId}
						<div class="def-actions">
							<button type="button" onclick={() => (showPropertyEditor = true, editorKind = 'datatype')}>
								Add property
							</button>
							<button type="button" onclick={() => (showPropertyEditor = true, editorKind = 'object')}>
								Add relation
							</button>
						</div>
						{#if showPropertyEditor}
							<SchemaPropertyEditor
								{ontologyId}
								domainClass={definitionView.typeName}
								kind={editorKind}
								onSaved={() => {
									showPropertyEditor = false;
									void loadInspector(selection, ontologyId, workspaceId);
								}}
								onCancel={() => (showPropertyEditor = false)}
							/>
						{/if}
					{/if}
					{#if definitionView.outgoingRelations.length > 0}
						<h4>Relations ({definitionView.outgoingRelations.length})</h4>
						<ul class="list relations">
							{#each definitionView.outgoingRelations as rel}
								<li>
									<code>{rel.edgeType}</code>
									<span class="muted-inline">→ {rel.targetType}</span>
								</li>
							{/each}
						</ul>
					{/if}
					{#if definitionView.properties.length > 0}
						<h4>Properties ({definitionView.properties.length})</h4>
						<dl class="kv">
							{#each definitionView.properties as prop}
								<div><dt>{prop.name}</dt><dd>{prop.range}</dd></div>
							{/each}
						</dl>
					{/if}
					{#if definitionView.triples.length > 0}
						<h4>Raw triples ({definitionView.triples.length})</h4>
						<ul class="list triples">
							{#each definitionView.triples.slice(0, 12) as t}
								<li><code>{t.subject}</code> · {t.predicate} · {t.object_value}</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</section>
		{/if}

		{#if taxonomyView}
			<section>
				<h3>Taxonomy</h3>
				{#if taxonomyView.unavailable}
					<p class="muted">{taxonomyView.unavailable}</p>
				{:else if taxonomyView.dimensions.length === 0}
					<p class="muted">No taxonomy dimensions for {taxonomyView.ontologyId}.</p>
				{:else}
					<ul class="list taxonomy">
						{#each taxonomyView.dimensions.slice(0, 10) as dim}
							<li>
								<strong>{dim.label}</strong>
								<span class="muted-inline">{dim.valueType} · {dim.hierarchyKind}</span>
								{#if dim.values.length > 0}
									<div class="chips">
										{#each dim.values.slice(0, 12) as value}
											<span class="chip">{value.label ?? value.value}</span>
										{/each}
									</div>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}

		<button type="button" class="toggle-raw" onclick={() => (showRaw = !showRaw)}>
			{showRaw ? 'Hide raw JSON' : 'Show raw JSON'}
		</button>
		{#if showRaw && instanceView?.raw}
			<pre>{JSON.stringify(instanceView.raw, null, 2)}</pre>
		{/if}
	{/if}
</svelte:element>

<style>
	.inspector {
		height: 100%;
		overflow: auto;
		padding: 0.75rem;
		border-left: 1px solid #1e293b;
		background: #0f172a;
		font-family: system-ui, sans-serif;
		font-size: 0.78rem;
		color: #e2e8f0;
	}
	h2,
	h3,
	h4 {
		margin: 0 0 0.5rem;
	}
	h2 {
		font-size: 0.85rem;
	}
	h3 {
		font-size: 0.75rem;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.section-head {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		margin-bottom: 0.5rem;
	}
	.section-head h3 {
		margin: 0;
	}
	h4 {
		margin-top: 0.75rem;
		font-size: 0.68rem;
		color: #64748b;
		text-transform: uppercase;
	}
	section + section {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid #1e293b;
	}
	.title {
		margin: 0;
		font-weight: 600;
	}
	.type-id {
		margin: 0.1rem 0 0;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.72rem;
		color: #64748b;
	}
	.subtitle {
		margin: 0.15rem 0 0.5rem;
		color: #94a3b8;
	}
	.definition {
		margin: 0.35rem 0;
		line-height: 1.45;
		color: #cbd5e1;
	}
	.kv {
		margin: 0;
	}
	.kv div {
		display: grid;
		grid-template-columns: 7rem 1fr;
		gap: 0.35rem;
		padding: 0.15rem 0;
	}
	dt {
		color: #64748b;
	}
	dd {
		margin: 0;
		word-break: break-word;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.72rem;
	}
	.list {
		margin: 0;
		padding-left: 1rem;
		color: #cbd5e1;
	}
	.list li + li {
		margin-top: 0.25rem;
	}
	.relations code {
		font-size: 0.72rem;
		color: #c4b5fd;
	}
	.triples code {
		font-size: 0.68rem;
		color: #7dd3fc;
	}
	.taxonomy li + li {
		margin-top: 0.6rem;
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin-top: 0.3rem;
	}
	.chip {
		border: 1px solid #334155;
		border-radius: 999px;
		color: #cbd5e1;
		background: #1e293b;
		padding: 0.12rem 0.35rem;
		font-size: 0.68rem;
	}
	.muted {
		color: #64748b;
	}
	.muted-inline {
		color: #64748b;
		margin-left: 0.35rem;
	}
	.warn {
		color: #fbbf24;
	}
	.link {
		margin-left: 0.5rem;
		background: none;
		border: none;
		color: #38bdf8;
		cursor: pointer;
		font-size: inherit;
		padding: 0;
		text-decoration: underline;
	}
	.def-actions {
		display: flex;
		gap: 0.35rem;
		margin: 0.35rem 0;
	}
	.def-actions button {
		background: #1e293b;
		border: 1px solid #334155;
		color: #cbd5e1;
		border-radius: 6px;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		font-size: 0.68rem;
	}
	.toggle-raw {
		margin-top: 0.75rem;
		background: #1e293b;
		border: 1px solid #334155;
		color: #94a3b8;
		border-radius: 6px;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
		font-size: 0.68rem;
	}
	pre {
		margin: 0.5rem 0 0;
		white-space: pre-wrap;
		word-break: break-word;
		color: #cbd5e1;
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.68rem;
	}
</style>
