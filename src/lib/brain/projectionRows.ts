export type GraphContext = {
	entityId?: number;
	entityType?: string;
	label?: string;
	relationType?: string;
};

export type ProjectionRow = {
	id?: string;
	artifact_id?: string;
	artifact_kind?: string;
	legacy_kind?: string;
	public_label?: string;
	scope?: string | null;
	lifecycle?: string;
	state?: string;
	current_version?: number;
	projection_id?: string;
	linked_projection_id?: string;
	type?: string;
	status?: string;
	weight?: number;
	proj_type?: string;
	content?: string;
	preview?: string;
	entity_id?: number;
	graph_focusable?: boolean;
	suggested_tools?: string[];
	linked_snapshot_id?: string;
	source_ref?: string | null;
	source?: string;
	raw: Record<string, unknown>;
};

export function projectionIdFromSourceRef(sourceRef: string | null | undefined): string | undefined {
	const value = sourceRef?.trim();
	if (!value?.startsWith('projection:')) return undefined;
	const id = value.slice('projection:'.length).trim();
	return id.length > 0 ? id : undefined;
}

export function entityIdsFromUnknown(raw: unknown): number[] {
	if (!raw || typeof raw !== 'object') return [];
	const obj = raw as Record<string, unknown>;
	const ids: number[] = [];
	for (const key of [
		'entity_id',
		'evidence_entity_id',
		'source_id',
		'target_id',
		'entity_ids',
		'seed_ids'
	]) {
		const value = obj[key];
		if (Array.isArray(value)) {
			for (const item of value) {
				const n = Number(item);
				if (Number.isFinite(n) && n > 0) ids.push(n);
			}
		} else {
			const n = Number(value);
			if (Number.isFinite(n) && n > 0) ids.push(n);
		}
	}
	for (const value of Object.values(obj)) {
		if (Array.isArray(value)) {
			for (const item of value) ids.push(...entityIdsFromUnknown(item));
		} else if (value && typeof value === 'object') {
			ids.push(...entityIdsFromUnknown(value));
		}
	}
	return [...new Set(ids)];
}

export function mapPackRows(data: Record<string, unknown>): ProjectionRow[] {
	const rows = (data.rows ?? data.projection_results ?? data.results) as unknown;
	if (!Array.isArray(rows)) return [];
	return rows.map((row) => {
		const r = row as Record<string, unknown>;
		const sourceRef = r.source_ref == null ? null : String(r.source_ref);
		const artifactKind =
			r.artifact_kind == null
				? r.type == null
					? r.proj_type == null
						? undefined
						: legacyProjectionType(String(r.proj_type))
					: String(r.type)
				: String(r.artifact_kind);
		const projectionId =
			r.projection_id == null ? projectionIdFromSourceRef(sourceRef) : String(r.projection_id);
		return {
			id: r.id == null ? undefined : String(r.id),
			artifact_id: r.artifact_id == null ? undefined : String(r.artifact_id),
			artifact_kind: artifactKind,
			legacy_kind: r.legacy_kind == null ? undefined : String(r.legacy_kind),
			public_label: r.public_label == null ? undefined : String(r.public_label),
			scope: r.scope == null ? null : String(r.scope),
			lifecycle: r.lifecycle == null ? undefined : String(r.lifecycle),
			state: r.state == null ? undefined : String(r.state),
			current_version:
				r.current_version == null || !Number.isFinite(Number(r.current_version))
					? undefined
					: Number(r.current_version),
			projection_id: projectionId,
			linked_projection_id: projectionIdFromSourceRef(sourceRef),
			type: artifactKind,
			status: r.status == null ? undefined : String(r.status),
			weight: r.weight == null ? undefined : Number(r.weight),
			proj_type: r.proj_type == null ? undefined : String(r.proj_type),
			content: r.content == null ? undefined : String(r.content).slice(0, 200),
			preview: r.preview == null ? undefined : String(r.preview).slice(0, 260),
			source_ref: sourceRef,
			entity_id: (() => {
				const ids = entityIdsFromUnknown(r);
				return ids[0];
			})(),
			graph_focusable: r.graph_focusable == null ? undefined : Boolean(r.graph_focusable),
			suggested_tools: Array.isArray(r.suggested_tools)
				? r.suggested_tools.map((item) => String(item))
				: undefined,
			linked_snapshot_id: r.linked_snapshot_id == null ? undefined : String(r.linked_snapshot_id),
			source: r.source == null ? undefined : String(r.source),
			raw: r
		};
	});
}

function legacyProjectionType(projType: string): string {
	const normalized = projType.trim().toUpperCase();
	if (normalized === 'FACT' || normalized === 'STEP' || normalized === 'GOAL' || normalized === 'CONSTRAINT') {
		return 'analysis_plan';
	}
	return projType;
}

export function rowTitle(row: ProjectionRow): string {
	return (
		row.public_label ??
		row.artifact_id ??
		row.projection_id ??
		row.id ??
		row.content ??
		row.artifact_kind ??
		'Artifact'
	);
}

export function artifactKindLabel(kind: string | undefined): string {
	switch (kind) {
		case 'analysis_plan':
			return 'Analysis plan';
		case 'answer_snapshot':
			return 'Snapshot';
		case 'live_answer_view':
			return 'Live answer';
		case 'evidence_pack':
			return 'Evidence pack';
		default:
			return kind ?? 'Artifact';
	}
}

export function rowMatchesGraphContext(
	row: ProjectionRow,
	ctx: { label?: string; entityType?: string }
): boolean {
	if (!ctx.label && !ctx.entityType) return false;
	const content = `${row.public_label ?? ''} ${row.preview ?? ''} ${row.content ?? ''}`.toLowerCase();
	const label = (ctx.label ?? '').toLowerCase();
	const type = (ctx.entityType ?? '').toLowerCase();
	if (label && content.includes(label)) return true;
	if (type && content.includes(type)) return true;
	return false;
}
