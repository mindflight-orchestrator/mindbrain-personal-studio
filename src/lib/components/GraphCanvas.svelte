<script lang="ts">
	import { browser } from '$app/environment';
	import type { DirectedGraph } from 'graphology';
	import { undirectedNeighborhood } from '$lib/graph/neighborhood';
	import {
		startProgressiveLayout,
		type GroupByFacetFn
	} from '$lib/graph/layoutTemplates';
	import {
		buildGraphVisualPlan,
		type GraphNodeDTO,
		type GraphVisualPlan,
		type FacetFilter,
		type LegendSection,
		computeNodeIdsMatchingFilter,
		PLATFORM_HULL_DEPTH,
		CHANTIER_WEEK_GRAPH_DEPTH
	} from '$lib/graph/nodeVisuals';
	import type { EdgeLinkMode } from '$lib/graph/edgeLinkModes';
	import { isCompositionEdgeLabel } from '$lib/graph/edgeLinkModes';
	import { readNDJSON } from '$lib/graph/ndjsonReader';
	import { normalizeBrainSubgraph } from '$lib/brain/subgraphNormalize';

	/** Sigma is browser-only; avoid static `import 'sigma'` so SSR does not evaluate WebGL. */
	type SigmaInstance = import('sigma').default;

	// ── Streaming constants ────────────────────────────────────────────────────
	/** Node count above which streaming is preferred over a single JSON fetch. */
	const STREAM_THRESHOLD = Number.POSITIVE_INFINITY;
	/** LOD: hide all edges when camera.ratio > this value (zoomed out) on large graphs. */
	const LOD_CAMERA_RATIO = 0.5;
	/** LOD: apply edge culling when graph has more nodes than this. */
	const LOD_THRESHOLD = 3000;
	/** Nodes per requestIdleCallback batch when adding to an already-mounted Sigma. */
	const NODE_BATCH_SIZE = 500;
	/** Edges per requestIdleCallback batch when adding to an already-mounted Sigma. */
	const EDGE_BATCH_SIZE = 500;

	// ── NDJSON frame types (client-side; mirrors StreamFrame from graphStream.ts) ──
	type StreamMetaFrame = { type: 'meta'; nodeCount: number; edgeCount: number; sourceUsed: 'mfo' | 'graph' };
	type StreamNodeFrame = { type: 'node'; id: string; label: string | null; node_type: string | null; schema_id: string | null; facets: unknown };
	type StreamEdgeFrame = { type: 'edge'; id: string; source: string; target: string; label: string | null; weight: number | null };
	type AnyStreamFrame = StreamMetaFrame | StreamNodeFrame | StreamEdgeFrame | { type: 'done' };

	// ── Dynamic-import preloader (browser-only, called at the start of Effect A) ──
	type GraphModules = {
		Sigma: typeof import('sigma').default;
		DirectedGraph: typeof import('graphology').DirectedGraph;
		layoutMod: typeof import('graphology-layout');
		forceAtlas2: typeof import('graphology-layout-forceatlas2').default;
		FA2LayoutCtor: typeof import('graphology-layout-forceatlas2/worker').default;
		drawDarkDiscNodeHover: (typeof import('$lib/sigma/darkDiscNodeHover'))['drawDarkDiscNodeHover'];
	};
	let graphModulesPromise: Promise<GraphModules> | null = null;
	function getGraphModules(): Promise<GraphModules> {
		if (!graphModulesPromise) {
			graphModulesPromise = Promise.all([
				import('sigma'),
				import('graphology'),
				import('graphology-layout'),
				import('graphology-layout-forceatlas2'),
				import('graphology-layout-forceatlas2/worker'),
				import('$lib/sigma/darkDiscNodeHover')
			]).then(([sigmaM, graphologyM, layoutMod, fa2mod, fa2WorkerMod, hoverMod]) => ({
				Sigma: sigmaM.default,
				DirectedGraph: graphologyM.DirectedGraph,
				layoutMod,
				forceAtlas2: fa2mod.default,
				FA2LayoutCtor: fa2WorkerMod.default,
				drawDarkDiscNodeHover: hoverMod.drawDarkDiscNodeHover
			}));
		}
		return graphModulesPromise;
	}

	/** Schedule a function during a browser idle period; falls back to setTimeout(0). */
	function scheduleIdle(fn: () => void): Promise<void> {
		return new Promise<void>((resolve) => {
			const doIt = () => {
				fn();
				resolve();
			};
			if (typeof requestIdleCallback !== 'undefined') {
				requestIdleCallback(doIt, { timeout: 150 });
			} else {
				setTimeout(doIt, 0);
			}
		});
	}

	/**
	 * Register a camera-based LOD listener on `sigma`.
	 * When camera.ratio > LOD_CAMERA_RATIO, all edges are hidden (zoom-out culling).
	 * Returns a cleanup function that removes the listener.
	 */
	function setupLOD(sigma: SigmaInstance, graphOrder: number, graphNative: boolean): () => void {
		if (graphOrder <= LOD_THRESHOLD) return () => {};
		const camera = sigma.getCamera();
		let prevHideEdges = false;
		const handler = () => {
			const hideEdges = camera.ratio > LOD_CAMERA_RATIO;
			if (hideEdges === prevHideEdges) return;
			prevHideEdges = hideEdges;
			lodEdgesHidden = hideEdges;
			// Only set LOD reducer if no focus/facet is overriding the edge reducer.
			if (!selectedNodeId && !facetFilter) {
				sigma.setSettings({
					edgeReducer: hideEdges
						? (_e: string, attr: Record<string, unknown>) => ({ ...attr, hidden: true })
						: null,
					labelRenderedSizeThreshold: hideEdges ? 8 : (graphNative ? 3 : 4)
				});
			}
		};
		camera.on('updated', handler);
		return () => camera.removeListener('updated', handler);
	}

	let {
		ontologyKey = 'all',
		providerKey = null,
		layoutTemplate = 'circular_force',
		dbKey = 'default',
		edgeLinkMode = 'all',
		expandHops = 0,
		focusCompositionOnly = false,
		graphSource = 'auto',
		workspaceId = null,
		scenarioId = null,
		topK = 30,
		groupByDimension = null,
		dataSource = 'sqlite-demo',
		brainSeedIds = [],
		facetFilter = $bindable(null as FacetFilter | null),
		legendBlocks = $bindable([] as LegendSection[]),
		onSelect
	}: {
		ontologyKey?: string;
		providerKey?: string | null;
		layoutTemplate?: string;
		dbKey?: string;
		edgeLinkMode?: EdgeLinkMode;
		/** Native graph: extra hops beyond `type:*` seed (see /api/graph expandHops). */
		expandHops?: number;
		focusCompositionOnly?: boolean;
		/** Kept for compatibility with the original canvas props; SQLite light always returns `graph`. */
		graphSource?: 'auto' | 'mfo' | 'graph';
		workspaceId?: string | null;
		/** Native graph: `metadata->>'scenario_id'` subgraph + 1-hop expand; forces `source=graph` on fetch. */
		scenarioId?: string | null;
		topK?: number | null;
		dataSource?: 'brain' | 'sqlite-demo';
		brainSeedIds?: number[];
		facetFilter?: FacetFilter | null;
		legendBlocks?: LegendSection[];
		onSelect?: (
			selection:
				| { kind: 'entity'; entityId: number; entityType: string; label: string }
				| { kind: 'relation'; relationId: number; relationType: string }
		) => void;
		/**
		 * Facet key to group nodes spatially before ForceAtlas2 (e.g. 'entity_layer', 'criticality').
		 * When set, cluster pre-layout replaces the normal seed; null = standard layout template.
		 */
		groupByDimension?: string | null;
	} = $props();

	/** Ego-network depth (hops along in + out edges). */
	const FOCUS_DEPTH = 2;

	const SIGMA_EDGE_LABEL_SETTINGS = {
		renderEdgeLabels: true,
		edgeLabelSize: 10,
		edgeLabelWeight: '400' as const,
		edgeLabelColor: { color: '#cbd5e1' }
	};

	/** When the visible subgraph is small enough, show every node label (facet/focus views). */
	const FORCE_ALL_LABELS_MAX = 120;

	function defaultNodeLabelSettings(graphNative: boolean) {
		return {
			labelDensity: graphNative ? 0.14 : 0.09,
			labelRenderedSizeThreshold: graphNative ? 3 : 4
		};
	}

	function forcedNodeLabelSettings() {
		return {
			labelDensity: 1,
			labelRenderedSizeThreshold: 0
		};
	}

	function edgeGraphAttrs(label: string | null, weight: number | null, color: string) {
		return {
			label: label ?? '',
			size: Math.max(1.2, Math.min(2.8, (weight ?? 1) * 0.35)),
			color,
			forceLabel: true,
			labelColor: '#cbd5e1'
		};
	}

	type NodeDTO = GraphNodeDTO;

	type EdgeDTO = {
		id: string;
		source: string;
		target: string;
		label: string | null;
		weight: number | null;
	};

	type Payload = {
		nodes: NodeDTO[];
		edges: EdgeDTO[];
		sourceUsed?: 'mfo' | 'graph';
	};

	/**
	 * Bridge between Effect A (data fetch) and Effect B (layout + sigma).
	 * Setting this to null signals Effect B to kill sigma; setting it triggers a rebuild.
	 */
	type GraphData = {
		nodes: NodeDTO[];
		edges: EdgeDTO[];
		plan: GraphVisualPlan;
		sourceUsed?: 'mfo' | 'graph';
		ontology: string;
	};

	let graphData = $state<GraphData | null>(null);

	$effect(() => {
		legendBlocks = graphData?.plan?.legendSections ?? [];
	});

	/** Derived payload slices used by facet filter and focus effects. */
	let payloadNodes = $derived<NodeDTO[]>(graphData?.nodes ?? []);
	let payloadEdges = $derived<EdgeDTO[]>(graphData?.edges ?? []);
	let payloadNodeById = $derived(new Map(payloadNodes.map((node) => [node.id, node])));
	let payloadEdgeById = $derived(new Map(payloadEdges.map((edge) => [edge.id, edge])));

	let selectedNodeId = $state<string | null>(null);
	let vizContext = $state<{ graph: DirectedGraph; sigma: SigmaInstance } | null>(null);

	$effect(() => {
		const f = facetFilter;
		if (!f) return;
		if (f.kind === 'platform_hull') {
			selectedNodeId = null;
			return;
		}
		if (selectedNodeId && payloadNodes.length > 0) {
			const set = computeNodeIdsMatchingFilter(payloadNodes, payloadEdges, f);
			if (!set.has(selectedNodeId)) {
				selectedNodeId = null;
			}
		}
	});

	/** Avoid refetching SQLite when only the layout template changes. */
	let payloadCache = $state<{
		db: string;
		ontology: string;
		provider: string | null;
		linkMode: EdgeLinkMode;
		expandHops: number;
		graphSource: 'auto' | 'mfo' | 'graph';
		workspaceId: string | null;
		scenarioId: string | null;
		topK: number | null;
		dataSource: 'brain' | 'sqlite-demo';
		brainSeedKey: string;
		payload: Payload;
	} | null>(null);

	let sourceUsedHint = $state<string | null>(null);

	let rootEl = $state<HTMLDivElement | undefined>(undefined);
	let status = $state<'loading' | 'ready' | 'empty' | 'error'>('loading');
	let errorDetail = $state<string | null>(null);

	let sigmaInstance: SigmaInstance | null = null;

	let focusHint = $state<string | null>(null);

	// ── Streaming state ────────────────────────────────────────────────────────
	let streaming = $state(false);
	let streamMeta = $state<{ nodeCount: number; edgeCount: number; sourceUsed: 'mfo' | 'graph' } | null>(null);
	let streamLoaded = $state<{ nodes: number; edges: number }>({ nodes: 0, edges: 0 });
	let streamComplete = $state(false);

	/** Non-reactive flags — don't trigger reactivity. */
	let lodEdgesHidden = false;
	/**
	 * When the streaming path creates and mounts Sigma itself, it sets this flag before
	 * publishing graphData. Effect B checks the flag and skips its normal kill+rebuild,
	 * preserving the already-running Sigma instance.
	 */
	let skipNextSigmaRebuild = false;

	// ── Streaming derived progress ─────────────────────────────────────────────
	let streamNodePct = $derived(
		streamMeta && streamMeta.nodeCount > 0
			? Math.min(100, Math.round((streamLoaded.nodes / streamMeta.nodeCount) * 100))
			: 0
	);
	let streamEdgePct = $derived(
		streamMeta && streamMeta.edgeCount > 0
			? Math.min(100, Math.round((streamLoaded.edges / streamMeta.edgeCount) * 100))
			: 0
	);
	let streamPct = $derived(
		streamMeta
			? streamMeta.edgeCount > 0
				? Math.round((streamLoaded.nodes * 0.3 + streamLoaded.edges * 0.7) /
					(streamMeta.nodeCount * 0.3 + streamMeta.edgeCount * 0.7) * 100)
				: streamNodePct
			: 0
	);

	function facetFiltersEqual(a: FacetFilter | null, b: FacetFilter | null): boolean {
		if (a === b) return true;
		if (!a || !b) return false;
		if (a.kind !== b.kind) return false;
		if (a.kind === 'scalar' && b.kind === 'scalar') {
			return a.key === b.key && a.value === b.value;
		}
		if (a.kind === 'platform_hull' && b.kind === 'platform_hull') {
			return a.platformId === b.platformId;
		}
		if (a.kind === 'abstraction' && b.kind === 'abstraction') {
			return a.value === b.value;
		}
		if (a.kind === 'chantier_week_neighborhood' && b.kind === 'chantier_week_neighborhood') {
			return a.week === b.week;
		}
		if (a.kind === 'audit_phase_neighborhood' && b.kind === 'audit_phase_neighborhood') {
			return a.phase === b.phase;
		}
		return false;
	}

	function auditPhaseFilterForNodeId(nodeId: string): FacetFilter | null {
		const n = payloadNodeById.get(nodeId);
		if (!n || n.node_type !== 'AuditRun') return null;
		const f = n.facets;
		if (f == null || typeof f !== 'object' || Array.isArray(f)) return null;
		const phase = String((f as Record<string, unknown>).audit_phase ?? '').trim();
		if (!phase || phase.includes('_to_')) return null;
		return { kind: 'audit_phase_neighborhood', phase };
	}

	function onSigmaNodeClick(node: string) {
		if (selectedNodeId === node) {
			selectedNodeId = null;
			const runPhaseFilter = auditPhaseFilterForNodeId(node);
			if (runPhaseFilter && facetFiltersEqual(facetFilter, runPhaseFilter)) facetFilter = null;
			return;
		}
		selectedNodeId = node;
		const selected = payloadNodeById.get(node);
		const entityId = Number.parseInt(node, 10);
		if (Number.isFinite(entityId)) {
			onSelect?.({
				kind: 'entity',
				entityId,
				entityType: selected?.node_type ?? '',
				label: selected?.label ?? node
			});
		}
		const runPhaseFilter = auditPhaseFilterForNodeId(node);
		if (runPhaseFilter) facetFilter = runPhaseFilter;
	}

	function onSigmaEdgeClick(edge: string) {
		const selected = payloadEdgeById.get(edge);
		const relationId = Number.parseInt(edge, 10);
		if (Number.isFinite(relationId)) {
			onSelect?.({
				kind: 'relation',
				relationId,
				relationType: selected?.label ?? ''
			});
		}
	}

	function entityTypeFilter(ontology: string): string | null {
		if (ontology === 'all') return null;
		if (ontology.toLowerCase().startsWith('type:')) return ontology.slice(5);
		return ontology;
	}

	async function fetchBrainPayload(
		ws: string,
		seedIds: number[],
		limit: number | null,
		entityType: string | null
	): Promise<Payload> {
		let seeds = seedIds.filter((id) => Number.isFinite(id) && id > 0);
		if (seeds.length === 0) {
			const params = new URLSearchParams({ workspace_id: ws, limit: String(limit ?? 30) });
			if (entityType) params.set('entity_type', entityType);
			const graphSearch = await fetch(`/api/brain/ghostcrab/graph-search?${params}`);
			if (!graphSearch.ok) throw new Error(await graphSearch.text());
			const data = (await graphSearch.json()) as { rows?: Array<{ entity_id: number }> };
			seeds = (data.rows ?? []).map((row) => Number(row.entity_id)).filter((id) => Number.isFinite(id));
		}
		if (seeds.length === 0) return { nodes: [], edges: [], sourceUsed: 'graph' };
		const params = new URLSearchParams({
			workspace_id: ws,
			seed_ids: seeds.slice(0, 30).join(','),
			hops: '2',
			format: 'json'
		});
		if (entityType) params.set('entity_type', entityType);
		const res = await fetch(`/api/brain/graph/subgraph?${params}`);
		if (!res.ok) throw new Error(await res.text());
		const events = (await res.json()) as Array<{ kind: string; payload: Record<string, unknown> }>;
		return normalizeBrainSubgraph(events);
	}

	function clearSigmaFocus() {
		selectedNodeId = null;
		facetFilter = null;
	}

	// ── Effect A: data fetch ──────────────────────────────────────────────────
	// Reacts to query params only. Layout/groupBy changes do NOT trigger a refetch.
	// For large graphs (nodeCount > STREAM_THRESHOLD) this effect also handles sigma
	// creation directly (streaming path), bypassing Effect B for the initial mount.
	$effect(() => {
		if (!browser) return;

		const ontology = ontologyKey;
		const provider = providerKey;
		const db = dbKey;
		const linkMode = edgeLinkMode;
		const hops = expandHops;
		const scen = scenarioId?.trim() || null;
		const edgeTopK = topK;
		const sourceMode = dataSource;
		const brainSeeds = brainSeedIds.filter((id) => Number.isFinite(id)).sort((a, b) => a - b);
		const brainSeedKey = brainSeeds.join(',');
		/** Scenario load is graph-native only; avoid `auto` preferring mfo over scenario. */
		const src: 'auto' | 'mfo' | 'graph' = scen ? 'graph' : graphSource;
		const ws = workspaceId?.trim() || null;
		const brainWorkspace = ws ?? 'default';

		let cancelled = false;
		graphData = null;
		selectedNodeId = null;
		facetFilter = null;
		focusHint = null;
		status = 'loading';
		errorDetail = null;
		sourceUsedHint = null;
		streaming = false;
		streamMeta = null;
		streamLoaded = { nodes: 0, edges: 0 };
		streamComplete = false;

		// Kick off module preload immediately (runs in parallel with the network fetch).
		getGraphModules().catch(() => {});

		(async () => {
			try {
				// Build shared query string (no topK yet — added per-path below).
				const q = new URLSearchParams();
				if (ontology !== 'all') q.set('ontology', ontology);
				if (db !== 'default') q.set('db', db);
				if (provider) q.set('provider', provider);
				if (linkMode !== 'all') q.set('linkMode', linkMode);
				if (hops > 0) q.set('expandHops', String(hops));
				if (src !== 'auto') q.set('source', src);
				if (ws) q.set('workspace', ws);
				if (scen) q.set('scenarioId', scen);
				if (edgeTopK == null || edgeTopK <= 0) {
					q.set('topK', 'none');
				} else {
					q.set('topK', String(edgeTopK));
				}

				// ── Cache hit → classic path (no network) ─────────────────────────
				if (
					payloadCache?.ontology === ontology &&
					payloadCache?.db === db &&
					payloadCache?.provider === provider &&
					payloadCache?.linkMode === linkMode &&
					payloadCache?.expandHops === hops &&
					payloadCache?.graphSource === src &&
					payloadCache?.workspaceId === ws &&
					payloadCache?.scenarioId === scen &&
					payloadCache?.topK === edgeTopK &&
					payloadCache?.dataSource === sourceMode &&
					payloadCache?.brainSeedKey === brainSeedKey
				) {
					const data = payloadCache.payload;
					if (cancelled) return;
					applyClassicPayload(data, ontology, () => cancelled);
					return;
				}

				if (sourceMode === 'brain') {
					const data = await fetchBrainPayload(
						brainWorkspace,
						brainSeeds,
						edgeTopK,
						entityTypeFilter(ontology)
					);
					if (cancelled) return;
					payloadCache = {
						db,
						ontology,
						provider,
						linkMode,
						expandHops: hops,
						graphSource: src,
						workspaceId: ws,
						scenarioId: scen,
						topK: edgeTopK,
						dataSource: sourceMode,
						brainSeedKey,
						payload: data
					};
					applyClassicPayload(data, ontology, () => cancelled);
					return;
				}

				// ── Count probe: decide streaming vs classic ───────────────────────
				const countQ = new URLSearchParams(q);
				let useStreaming = false;
				try {
					const countRes = await fetch(`/api/graph/count?${countQ}`);
					if (countRes.ok && !cancelled) {
						const probe = (await countRes.json()) as { nodeCount: number };
						useStreaming = probe.nodeCount > STREAM_THRESHOLD;
					}
				} catch {
					// Count probe failed; fall through to classic fetch.
				}
				if (cancelled) return;

				if (!useStreaming) {
					// ── Classic path: single JSON fetch ───────────────────────────
					const classicQ = new URLSearchParams(q);
					const res = await fetch(`/api/graph?${classicQ}`);
					if (cancelled) return;
					if (!res.ok) {
						const t = await res.text();
						throw new Error(t || `HTTP ${res.status}`);
					}
					const data = (await res.json()) as Payload;
					payloadCache = {
						db,
						ontology,
						provider,
						linkMode,
						expandHops: hops,
						graphSource: src,
						workspaceId: ws,
						scenarioId: scen,
						topK: edgeTopK,
						dataSource: sourceMode,
						brainSeedKey,
						payload: data
					};
					if (cancelled) return;
					applyClassicPayload(data, ontology, () => cancelled);
					return;
				}

			// ══ Streaming path for large graphs ═══════════════════════════════
			// Strategy: nodes stream first (fast DB query), Sigma mounts as soon
			// as all nodes are received. Edges stream after (slow DB query) and
			// are added directly to the mounted graphology graph in real time.
			streaming = true;
			streamComplete = false;
			streamLoaded = { nodes: 0, edges: 0 };

			const streamQ = new URLSearchParams(q);
			streamQ.set('topK', '30');
			const streamRes = await fetch(`/api/graph/stream?${streamQ}`);
			if (cancelled) return;
			if (!streamRes.ok) {
				const t = await streamRes.text();
				throw new Error(t || `HTTP ${streamRes.status}`);
			}

			const allNodes: NodeDTO[] = [];
			const allEdges: EdgeDTO[] = [];
			let streamMetaFrame: StreamMetaFrame | null = null;
			let lastUpdate = Date.now();

			// Skeleton state — set once all nodes are received and Sigma is mounted.
			let skeletonGraph: import('graphology').DirectedGraph | null = null;
			let skeletonPlan: GraphVisualPlan | null = null;
			let skeletonMounted = false;

			// ── Read frames; mount skeleton on first complete node batch ──────
			for await (const frame of readNDJSON<AnyStreamFrame>(streamRes)) {
				if (cancelled) break;

				if (frame.type === 'meta') {
					streamMetaFrame = frame as StreamMetaFrame;
					streamMeta = { nodeCount: streamMetaFrame.nodeCount, edgeCount: streamMetaFrame.edgeCount, sourceUsed: streamMetaFrame.sourceUsed };

				} else if (frame.type === 'node') {
					const f = frame as StreamNodeFrame;
					allNodes.push({ id: f.id, label: f.label, node_type: f.node_type, schema_id: f.schema_id, facets: f.facets as NodeDTO['facets'] });
					const now = Date.now();
					if (now - lastUpdate > 120) {
						streamLoaded = { nodes: allNodes.length, edges: 0 };
						lastUpdate = now;
					}
					// Mount skeleton Sigma as soon as all node frames have arrived.
					if (!skeletonMounted && streamMetaFrame && allNodes.length >= streamMetaFrame.nodeCount && !cancelled) {
						skeletonMounted = true;
						streamLoaded = { nodes: allNodes.length, edges: 0 };
						if (allNodes.length === 0) continue;

						// Build plan without edges (uniform sizing); updated after edges arrive.
						skeletonPlan = buildGraphVisualPlan(allNodes, [], ontology);
						const mods = await getGraphModules();
						if (cancelled) break;

						const el = rootEl;
						if (!el) break;

						sigmaInstance?.kill();
						sigmaInstance = null;
						vizContext = null;

						skeletonGraph = new mods.DirectedGraph() as import('graphology').DirectedGraph;
						const nodesById = new Map(allNodes.map((n) => [n.id, n]));
						for (const n of allNodes) {
							const label = (n.label?.trim() || n.id).slice(0, 80);
							const v = skeletonPlan.styleNode(n);
							skeletonGraph.addNode(n.id, { label, size: v.size, x: 0, y: 0, color: v.color, labelColor: v.labelColor, zIndex: v.zIndex });
						}

						const groupDim = groupByDimension?.trim() || null;
						const groupByFn: GroupByFacetFn | undefined = groupDim
							? (nodeId: string) => {
									const node = nodesById.get(nodeId);
									const f = node?.facets;
									if (f == null || typeof f !== 'object' || Array.isArray(f)) return null;
									const v = (f as Record<string, unknown>)[groupDim];
									if (v == null) return null;
									return String(v).trim() || null;
								}
							: undefined;

						let stopLayout = startProgressiveLayout(skeletonGraph, mods.layoutMod, mods.FA2LayoutCtor, mods.forceAtlas2, layoutTemplate, groupByFn);
						if (cancelled) { stopLayout(); break; }

						const sourceUsedVal = streamMetaFrame.sourceUsed ?? 'mfo';
						const graphNative = sourceUsedVal === 'graph';

						sigmaInstance = new mods.Sigma(skeletonGraph, el, {
							renderLabels: true,
							defaultNodeColor: '#94a3b8',
							defaultEdgeColor: '#64748b',
							labelDensity: graphNative ? 0.14 : 0.09,
							zIndex: true,
							labelSize: graphNative ? 14 : 13,
							labelWeight: '500',
							labelColor: { attribute: 'labelColor', color: '#f1f5f9' },
							labelRenderedSizeThreshold: graphNative ? 3 : 4,
							defaultDrawNodeHover: mods.drawDarkDiscNodeHover,
							...SIGMA_EDGE_LABEL_SETTINGS
						});

						sigmaInstance.on('clickNode', ({ node }) => { onSigmaNodeClick(node); });
						sigmaInstance.on('clickEdge', ({ edge }) => { onSigmaEdgeClick(edge); });
						sigmaInstance.on('clickStage', () => { clearSigmaFocus(); });
						setupLOD(sigmaInstance, allNodes.length, graphNative);

						sourceUsedHint = graphNative ? 'GhostCrab PERSO SQLite' : 'Legacy graph source';
						vizContext = { graph: skeletonGraph, sigma: sigmaInstance };
						status = 'ready';
						skipNextSigmaRebuild = true;
					}

				} else if (frame.type === 'edge') {
					const f = frame as StreamEdgeFrame;
					allEdges.push({ id: f.id, source: f.source, target: f.target, label: f.label, weight: f.weight });
					// Add edge directly to the mounted graphology graph (Sigma renders via RAF).
					if (skeletonGraph && skeletonPlan) {
						try {
							if (skeletonGraph.hasNode(f.source) && skeletonGraph.hasNode(f.target) && !skeletonGraph.hasEdge(f.id)) {
								skeletonGraph.addEdgeWithKey(f.id, f.source, f.target, {
									...edgeGraphAttrs(f.label, f.weight, skeletonPlan.edgeColor(f.label))
								});
							}
						} catch { /* skip duplicates */ }
					}
					const now = Date.now();
					if (now - lastUpdate > 200) {
						streamLoaded = { nodes: allNodes.length, edges: allEdges.length };
						lastUpdate = now;
					}
				}
			}

			if (cancelled) { streaming = false; return; }

			streamLoaded = { nodes: allNodes.length, edges: allEdges.length };

			if (allNodes.length === 0) {
				status = 'empty';
				streaming = false;
				return;
			}

			// ── Skeleton not yet mounted (e.g. meta missing or tiny graph) ───
			if (!skeletonMounted) {
				const sourceUsedVal = streamMetaFrame?.sourceUsed ?? 'mfo';
				sourceUsedHint = sourceUsedVal === 'mfo' ? 'Legacy graph source' : 'GhostCrab PERSO SQLite';
				const fullPlan = buildGraphVisualPlan(allNodes, allEdges, ontology);
				if (cancelled) { streaming = false; return; }
				const { Sigma, DirectedGraph, layoutMod, forceAtlas2, FA2LayoutCtor, drawDarkDiscNodeHover } = await getGraphModules();
				if (cancelled) { streaming = false; return; }
				const el = rootEl;
				if (!el) { streaming = false; return; }
				sigmaInstance?.kill();
				sigmaInstance = null;
				vizContext = null;
				skeletonGraph = new DirectedGraph() as import('graphology').DirectedGraph;
				const nodesById2 = new Map(allNodes.map((n) => [n.id, n]));
				for (const n of allNodes) {
					const label = (n.label?.trim() || n.id).slice(0, 80);
					const v = fullPlan.styleNode(n);
					skeletonGraph.addNode(n.id, { label, size: v.size, x: 0, y: 0, color: v.color, labelColor: v.labelColor, zIndex: v.zIndex });
				}
				for (const e of allEdges) {
					if (!skeletonGraph.hasNode(e.source) || !skeletonGraph.hasNode(e.target)) continue;
					try { skeletonGraph.addEdgeWithKey(e.id, e.source, e.target, edgeGraphAttrs(e.label, e.weight, fullPlan.edgeColor(e.label))); } catch { /* skip */ }
				}
				const groupDim2 = groupByDimension?.trim() || null;
				const groupByFn2: GroupByFacetFn | undefined = groupDim2
					? (nodeId: string) => {
							const node = nodesById2.get(nodeId);
							const f = node?.facets;
							if (f == null || typeof f !== 'object' || Array.isArray(f)) return null;
							const v = (f as Record<string, unknown>)[groupDim2];
							return v == null ? null : (String(v).trim() || null);
						}
					: undefined;
				let stopLayout2 = startProgressiveLayout(skeletonGraph, layoutMod, FA2LayoutCtor, forceAtlas2, layoutTemplate, groupByFn2);
				if (cancelled) { stopLayout2(); streaming = false; return; }
				const graphNative2 = sourceUsedVal === 'graph';
				sigmaInstance = new Sigma(skeletonGraph, el, {
					renderLabels: true, defaultNodeColor: '#94a3b8', defaultEdgeColor: '#64748b',
					labelDensity: graphNative2 ? 0.14 : 0.09, zIndex: true,
					labelSize: graphNative2 ? 14 : 13, labelWeight: '500',
					labelColor: { attribute: 'labelColor', color: '#f1f5f9' },
					labelRenderedSizeThreshold: graphNative2 ? 3 : 4,
					defaultDrawNodeHover: drawDarkDiscNodeHover,
					...SIGMA_EDGE_LABEL_SETTINGS
				});
				sigmaInstance.on('clickNode', ({ node }) => { onSigmaNodeClick(node); });
				sigmaInstance.on('clickEdge', ({ edge }) => { onSigmaEdgeClick(edge); });
				sigmaInstance.on('clickStage', () => { clearSigmaFocus(); });
				setupLOD(sigmaInstance, allNodes.length, graphNative2);
				vizContext = { graph: skeletonGraph, sigma: sigmaInstance };
				status = 'ready';
				skipNextSigmaRebuild = true;
				skeletonPlan = fullPlan;
			}

			if (cancelled) return;

			// ── Update node sizes/colors now that we have full degree data ────
			if (skeletonGraph && skeletonPlan) {
				const finalPlan = buildGraphVisualPlan(allNodes, allEdges, ontology);
				for (const n of allNodes) {
					if (skeletonGraph.hasNode(n.id)) {
						const v = finalPlan.styleNode(n);
						skeletonGraph.setNodeAttribute(n.id, 'size', v.size);
						skeletonGraph.setNodeAttribute(n.id, 'color', v.color);
					}
				}
				vizContext = skeletonGraph && sigmaInstance
					? { graph: skeletonGraph, sigma: sigmaInstance }
					: vizContext;
				const sourceUsedFinal = streamMetaFrame?.sourceUsed ?? 'mfo';
				streamLoaded = { nodes: allNodes.length, edges: allEdges.length };
				streamComplete = true;

				payloadCache = {
					db, ontology, provider, linkMode, expandHops: hops, graphSource: src, workspaceId: ws, scenarioId: scen, topK: edgeTopK,
					dataSource: sourceMode,
					brainSeedKey,
					payload: { nodes: allNodes, edges: allEdges, sourceUsed: sourceUsedFinal }
				};
				skipNextSigmaRebuild = true;
				graphData = { nodes: allNodes, edges: allEdges, plan: finalPlan, sourceUsed: sourceUsedFinal, ontology };
			}

			setTimeout(() => { if (!cancelled) streaming = false; }, 1800);
			} catch (e) {
				if (cancelled) return;
				status = 'error';
				streaming = false;
				errorDetail = e instanceof Error ? e.message : String(e);
			}
		})();

		return () => {
			cancelled = true;
			// If streaming was in progress and sigma was created before graphData was set,
			// Effect B won't clean it up (graphData is still null). Kill sigma here.
			if (streaming && sigmaInstance && !graphData) {
				sigmaInstance.kill();
				sigmaInstance = null;
				vizContext = null;
			}
			streaming = false;
		};
	});

	/**
	 * Apply a classic (fully-fetched) payload: set sourceUsedHint, build plan, publish graphData.
	 * `cancelFn` is a function returning the current `cancelled` flag (closure trick).
	 */
	function applyClassicPayload(
		data: Payload,
		ontology: string,
		cancelFn: () => boolean
	): void {
		if (data.sourceUsed === 'mfo') {
			sourceUsedHint = 'Legacy graph source';
		} else if (data.sourceUsed === 'graph') {
			sourceUsedHint = dataSource === 'brain' ? 'MindBrain live graph' : 'GhostCrab PERSO SQLite';
		} else {
			sourceUsedHint = null;
		}

		const nodes = data.nodes ?? [];
		const edges = data.edges ?? [];

		if (nodes.length === 0) {
			sourceUsedHint = null;
			status = 'empty';
			return;
		}

		const plan = buildGraphVisualPlan(nodes, edges, ontology);
		if (cancelFn()) return;

		graphData = { nodes, edges, plan, sourceUsed: data.sourceUsed, ontology };
	}

	// ── Effect B: layout + sigma ──────────────────────────────────────────────
	// Reacts to graphData (set by Effect A), layoutTemplate, and groupByDimension.
	// A layout-only change kills + rebuilds sigma without refetching the DB.
	// When Effect A's streaming path already built sigma, it sets `skipNextSigmaRebuild`
	// so this effect skips the kill+rebuild (sigma is already running).
	$effect(() => {
		if (!browser) return;
		const el = rootEl;

		const data = graphData;
		const layout = layoutTemplate;
		const groupDim = groupByDimension?.trim() || null;

		// ── Streaming path already mounted sigma: skip this rebuild ──────────
		if (skipNextSigmaRebuild) {
			skipNextSigmaRebuild = false;
			return;
		}

		sigmaInstance?.kill();
		sigmaInstance = null;
		vizContext = null;

		if (!el || !data) return;

		const { nodes, edges, plan } = data;

		let cancelled = false;
		let stopLayout: (() => void) | null = null;
		let stopLOD: (() => void) = () => {};

		(async () => {
			try {
				const { Sigma, DirectedGraph, layoutMod, forceAtlas2, FA2LayoutCtor, drawDarkDiscNodeHover } =
					await getGraphModules();

				if (cancelled) return;

				const graph = new DirectedGraph();

				// Build id-to-node index for groupBy facet lookup during layout
				const nodesById = new Map(nodes.map((n) => [n.id, n]));

				for (const n of nodes) {
					const label = (n.label?.trim() || n.id).slice(0, 80);
					const v = plan.styleNode(n);
					graph.addNode(n.id, {
						label,
						size: v.size,
						x: 0,
						y: 0,
						color: v.color,
						labelColor: v.labelColor,
						zIndex: v.zIndex
					});
				}

				for (const e of edges) {
					if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) continue;
					try {
						graph.addEdgeWithKey(e.id, e.source, e.target, edgeGraphAttrs(e.label, e.weight, plan.edgeColor(e.label)));
					} catch {
						/* skip duplicate keys */
					}
				}

				const groupByFn: GroupByFacetFn | undefined = groupDim
					? (nodeId: string) => {
							const node = nodesById.get(nodeId);
							const f = node?.facets;
							if (f == null || typeof f !== 'object' || Array.isArray(f)) return null;
							const v = (f as Record<string, unknown>)[groupDim];
							if (v == null) return null;
							const s = String(v).trim();
							return s || null;
						}
					: undefined;

				// Seed positions applied synchronously so Sigma can mount immediately,
				// then FA2 animates in the background via Web Worker.
				stopLayout = startProgressiveLayout(
					graph,
					layoutMod,
					FA2LayoutCtor,
					forceAtlas2,
					layout,
					groupByFn
				);

				if (cancelled) {
					stopLayout?.();
					return;
				}

				const graphNative = data.sourceUsed === 'graph';
				sigmaInstance = new Sigma(graph, el, {
					renderLabels: true,
					defaultNodeColor: '#94a3b8',
					defaultEdgeColor: '#64748b',
					// Native graph.* mixes rare topology nodes with many signals — allow more labels on screen.
					labelDensity: graphNative ? 0.14 : 0.09,
					zIndex: true,
					labelSize: graphNative ? 14 : 13,
					labelWeight: '500',
					labelColor: { attribute: 'labelColor', color: '#f1f5f9' },
					labelRenderedSizeThreshold: graphNative ? 3 : 4,
					defaultDrawNodeHover: drawDarkDiscNodeHover,
					...SIGMA_EDGE_LABEL_SETTINGS
				});

				sigmaInstance.on('clickNode', ({ node }) => {
					onSigmaNodeClick(node);
				});
				sigmaInstance.on('clickEdge', ({ edge }) => {
					onSigmaEdgeClick(edge);
				});
				sigmaInstance.on('clickStage', () => {
					clearSigmaFocus();
				});

				// Register viewport LOD culling for large graphs.
				stopLOD = setupLOD(sigmaInstance, graph.order, graphNative);

				vizContext = { graph, sigma: sigmaInstance };
				status = 'ready';
			} catch (e) {
				if (cancelled) return;
				status = 'error';
				errorDetail = e instanceof Error ? e.message : String(e);
			}
		})();

		return () => {
			cancelled = true;
			stopLOD();
			stopLayout?.();
			stopLayout = null;
			vizContext = null;
			sigmaInstance?.kill();
			sigmaInstance = null;
		};
	});

	$effect(() => {
		if (!browser) return;
		const ctx = vizContext;
		if (!ctx?.sigma) return;

		const { graph, sigma } = ctx;
		const center = selectedNodeId;
		const compOnly = focusCompositionOnly;
		const filter = facetFilter;
		const nodesForFacet = payloadNodes;
		const edgesForHull = payloadEdges;

		const hullActive = filter?.kind === 'platform_hull';

		const facetSet =
			filter && nodesForFacet.length > 0
				? computeNodeIdsMatchingFilter(nodesForFacet, edgesForHull, filter)
				: null;

		const hasCenter = center != null && graph.hasNode(center);
		const neighborhood =
			!hullActive && hasCenter && center != null
				? undirectedNeighborhood(graph, center, FOCUS_DEPTH)
				: null;

		if (!facetSet && !hasCenter) {
			focusHint = null;
			const graphNative = graphData?.sourceUsed === 'graph';
			sigma.setSettings({
				nodeReducer: null,
				edgeReducer: null,
				...defaultNodeLabelSettings(graphNative)
			});
			return;
		}

		const visibleCount =
			facetSet && neighborhood
				? [...neighborhood].filter((id) => facetSet.has(id)).length
				: facetSet
					? facetSet.size
					: neighborhood
						? neighborhood.size
						: graph.order;
		const forceAllLabels = visibleCount > 0 && visibleCount <= FORCE_ALL_LABELS_MAX;
		const graphNative = graphData?.sourceUsed === 'graph';
		const labelSettings = forceAllLabels
			? forcedNodeLabelSettings()
			: defaultNodeLabelSettings(graphNative);

		if (hasCenter && center != null && neighborhood) {
			const lab = graph.getNodeAttribute(center, 'label');
			const title = typeof lab === 'string' && lab.trim() ? lab.trim() : center;
			const suffix = compOnly ? ' · composition edges' : '';
			let h = `${title} · ${neighborhood.size} nodes (≤${FOCUS_DEPTH} hops)${suffix}`;
		if (facetSet && filter) {
			const inBoth = [...neighborhood].filter((id) => facetSet.has(id)).length;
			const fl =
				filter.kind === 'scalar'
					? `${filter.key}=${filter.value}`
					: filter.kind === 'abstraction'
						? `abstraction=${filter.value}`
						: filter.kind === 'chantier_week_neighborhood'
							? `demo_week=${filter.week} (≤${CHANTIER_WEEK_GRAPH_DEPTH} hops)`
							: filter.kind === 'audit_phase_neighborhood'
								? `audit_phase=${filter.phase}`
							: `hull=${filter.platformId}`;
			h += ` · facet ${fl} · ${inBoth} nodes in both`;
			}
			focusHint = h;
		} else if (facetSet && filter) {
			if (filter.kind === 'platform_hull') {
				const ship = payloadNodeById.get(filter.platformId);
				const title = (ship?.label || filter.platformId).trim();
				focusHint = `Ship hull · ${title} · ≤${PLATFORM_HULL_DEPTH} hops · ${facetSet.size} nodes — click row again to clear`;
			} else {
				const fl =
					filter.kind === 'scalar'
						? `${filter.key}=${filter.value}`
						: filter.kind === 'chantier_week_neighborhood'
							? `demo_week=${filter.week} (≤${CHANTIER_WEEK_GRAPH_DEPTH} hops)`
							: filter.kind === 'audit_phase_neighborhood'
								? `audit_phase=${filter.phase}`
							: `abstraction=${filter.value}`;
				focusHint = `Facet · ${fl} · ${facetSet.size} nodes — click row again to clear`;
			}
		} else {
			focusHint = null;
		}

		sigma.setSettings({
			...labelSettings,
			nodeReducer: (node, attr) => {
				let hidden = false;
				if (facetSet && !facetSet.has(node)) hidden = true;
				if (!hidden && neighborhood && !neighborhood.has(node)) hidden = true;
				if (hidden) return { ...attr, hidden: true };
				return forceAllLabels ? { ...attr, hidden: false, forceLabel: true } : { ...attr, hidden: false };
			},
			edgeReducer: (edge, attr) => {
				const [a, b] = graph.extremities(edge);
				let hidden = false;
				if (facetSet && (!facetSet.has(a) || !facetSet.has(b))) hidden = true;
				if (!hidden && neighborhood && (!neighborhood.has(a) || !neighborhood.has(b))) {
					hidden = true;
				}
				if (
					!hidden &&
					compOnly &&
					hasCenter &&
					!isCompositionEdgeLabel(String(attr.label ?? ''))
				) {
					hidden = true;
				}
				return hidden ? { ...attr, hidden: true } : { ...attr, hidden: false };
			}
		});
	});
</script>

<div class="wrap">
	<div bind:this={rootEl} class="canvas" aria-label="Knowledge graph visualization"></div>

	{#if streaming && streamMeta}
		<div
			class="stream-bar"
			class:stream-bar--complete={streamComplete}
			role="status"
			aria-live="polite"
			aria-label="Graph loading progress"
		>
			<div class="stream-track">
				<div class="stream-fill" style:width="{streamPct}%"></div>
			</div>
			<span class="stream-label">
		{#if !streamComplete}
				<span class="stream-nums">{streamLoaded.nodes.toLocaleString()}/{streamMeta.nodeCount.toLocaleString()} nodes</span>
				{#if streamLoaded.edges > 0}
					<span class="stream-sep">·</span>
					<span class="stream-nums">{streamLoaded.edges.toLocaleString()} edges</span>
					<span class="stream-sep">·</span>
					<span class="stream-status">streaming…</span>
				{:else if streamLoaded.nodes >= streamMeta.nodeCount}
					<span class="stream-sep">·</span>
					<span class="stream-status">loading edges…</span>
				{:else}
					<span class="stream-sep">·</span>
					<span class="stream-status">streaming…</span>
				{/if}
			{:else}
				<span class="stream-nums">{streamMeta.nodeCount.toLocaleString()} nodes · {streamLoaded.edges.toLocaleString()} edges</span>
				<span class="stream-sep">·</span>
				<span class="stream-status stream-status--done">ready</span>
			{/if}
			</span>
		</div>
	{/if}

	{#if focusHint}
		<div class="focus-bar" role="status">
			<span>Focus</span>
			<span class="focus-text">{focusHint}</span>
			<span class="focus-reset">Click background to reset</span>
		</div>
	{/if}

	{#if status === 'ready' && sourceUsedHint}
		<div class="source-hint" role="status">Source: {sourceUsedHint}</div>
	{/if}
	{#if status === 'loading' && !streaming}
		<div class="overlay">Loading graph…</div>
	{/if}
	{#if status === 'empty'}
		<div class="overlay">No nodes to display (try another ontology, workspace, or source mode).</div>
	{/if}
	{#if status === 'error'}
		<div class="overlay error">
			<strong>Graph load failed</strong>
			<p>{errorDetail}</p>
		</div>
	{/if}
</div>

<style>
	.wrap {
		position: relative;
		width: 100%;
		height: 100%;
		flex: 1 1 auto;
		min-height: 0;
	}

	.source-hint {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		z-index: 2;
		padding: 0.3rem 0.55rem;
		border-radius: 6px;
		background: rgba(15, 23, 42, 0.92);
		border: 1px solid #334155;
		font-family: system-ui, sans-serif;
		font-size: 0.65rem;
		color: #94a3b8;
		pointer-events: none;
		max-width: min(24rem, calc(100% - 1rem));
	}

	.canvas {
		width: 100%;
		height: 100%;
		min-height: 320px;
		background: #0c1016;
	}

	.focus-bar {
		position: absolute;
		top: 0.5rem;
		left: 50%;
		transform: translateX(-50%);
		max-width: min(42rem, calc(100% - 1rem));
		padding: 0.35rem 0.75rem;
		border-radius: 8px;
		background: rgba(30, 41, 59, 0.95);
		border: 1px solid #475569;
		font-family: system-ui, sans-serif;
		font-size: 0.72rem;
		color: #cbd5e1;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.35rem 0.6rem;
		pointer-events: none;
		z-index: 2;
	}

	.focus-bar > span:first-child {
		font-weight: 600;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 0.65rem;
	}

	.focus-text {
		color: #f1f5f9;
		font-weight: 500;
	}

	.focus-reset {
		color: #64748b;
		font-size: 0.65rem;
	}

	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		pointer-events: none;
		color: #e2e8f0;
		font-family: system-ui, sans-serif;
		font-size: 0.95rem;
	}

	.overlay.error {
		padding: 1rem;
		text-align: center;
		background: rgba(15, 20, 25, 0.85);
	}

	.overlay.error p {
		margin: 0.5rem 0 0;
		max-width: 36rem;
		color: #fca5a5;
		font-size: 0.85rem;
	}

	/* ── Streaming progress bar ────────────────────────────────────────────── */
	.stream-bar {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		z-index: 4;
		background: rgba(15, 23, 42, 0.96);
		border-bottom: 1px solid #1e293b;
		padding: 0.3rem 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-family: ui-monospace, monospace;
		font-size: 0.66rem;
		color: #94a3b8;
		transition: opacity 0.8s ease;
		pointer-events: none;
	}

	.stream-bar--complete {
		opacity: 0;
	}

	.stream-track {
		flex-shrink: 0;
		width: 8rem;
		height: 4px;
		border-radius: 2px;
		background: #1e293b;
		overflow: hidden;
	}

	.stream-fill {
		height: 100%;
		border-radius: 2px;
		background: linear-gradient(90deg, #3b82f6, #818cf8);
		transition: width 0.25s ease;
	}

	.stream-label {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.3rem 0.45rem;
		min-width: 0;
	}

	.stream-nums {
		color: #cbd5e1;
		font-variant-numeric: tabular-nums;
	}

	.stream-sep {
		color: #475569;
	}

	.stream-status {
		color: #60a5fa;
	}

	.stream-status--done {
		color: #34d399;
	}
</style>
