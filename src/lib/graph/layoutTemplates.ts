import type { DirectedGraph } from 'graphology';

export type LayoutTemplateId =
	| 'circular_force'
	| 'circular_only'
	| 'random_force'
	| 'linlog_clusters';

export const LAYOUT_TEMPLATES: ReadonlyArray<{ id: LayoutTemplateId; label: string }> = [
	{ id: 'circular_force', label: 'Circular + ForceAtlas2 (default)' },
	{ id: 'circular_only', label: 'Circular ring only' },
	{ id: 'random_force', label: 'Random seed + ForceAtlas2' },
	{ id: 'linlog_clusters', label: 'ForceAtlas2 LinLog (clusters)' }
];

type LayoutLib = {
	circular: { assign: (g: DirectedGraph, opts?: { scale?: number }) => void };
	random: { assign: (g: DirectedGraph, opts?: { scale?: number }) => void };
};

type ForceAtlas2Lib = {
	assign: (
		g: DirectedGraph,
		opts: { iterations: number; settings: Record<string, unknown> }
	) => void;
	inferSettings: (g: DirectedGraph) => Record<string, unknown>;
};

export type FA2LayoutWorker = {
	start(): void;
	stop(): void;
	kill(): void;
	isRunning(): boolean;
};

export type FA2WorkerCtor = new (
	graph: DirectedGraph,
	params?: { settings?: Record<string, unknown> }
) => FA2LayoutWorker;

/**
 * Per-node group accessor for cluster pre-layout.
 * Return a non-empty string for the group this node belongs to, or null to place it at origin.
 */
export type GroupByFacetFn = (nodeId: string) => string | null;

/**
 * Pre-position nodes in spatial clusters before ForceAtlas2.
 * Each unique group value gets a center on a circle; nodes are scattered within their cluster.
 * Ungrouped nodes (null return) are placed near the origin.
 * ForceAtlas2 with elevated gravity keeps clusters semi-cohesive.
 */
function applyClusterPreLayout(graph: DirectedGraph, groupBy: GroupByFacetFn): void {
	const groups = new Map<string, string[]>();

	graph.forEachNode((nodeId) => {
		const group = groupBy(nodeId);
		if (group == null) {
			// Place ungrouped nodes near origin — handled below
			return;
		}
		if (!groups.has(group)) groups.set(group, []);
		groups.get(group)!.push(nodeId);
	});

	if (groups.size === 0) return;

	const clusterKeys = [...groups.keys()].sort();
	const numClusters = clusterKeys.length;
	// Spread radius scales with graph size to avoid overlap between clusters
	const spreadRadius = Math.max(5, Math.sqrt(graph.order) * 1.5);
	// Scatter radius within a cluster (tighter than spread between clusters)
	const scatter = Math.max(0.5, spreadRadius / (numClusters * 1.8));

	const clusterCenters = new Map<string, { cx: number; cy: number }>();
	clusterKeys.forEach((key, i) => {
		const angle = (2 * Math.PI * i) / numClusters;
		clusterCenters.set(key, {
			cx: Math.cos(angle) * spreadRadius,
			cy: Math.sin(angle) * spreadRadius
		});
	});

	// Seeded pseudo-random for reproducible initial positions
	let seed = 42;
	function rand(): number {
		seed = (seed * 1664525 + 1013904223) & 0xffffffff;
		return (seed >>> 0) / 0x100000000;
	}

	graph.forEachNode((nodeId) => {
		const group = groupBy(nodeId);
		const center = group != null ? clusterCenters.get(group) : null;
		if (center) {
			graph.setNodeAttribute(nodeId, 'x', center.cx + (rand() - 0.5) * scatter * 2);
			graph.setNodeAttribute(nodeId, 'y', center.cy + (rand() - 0.5) * scatter * 2);
		} else {
			graph.setNodeAttribute(nodeId, 'x', (rand() - 0.5) * scatter);
			graph.setNodeAttribute(nodeId, 'y', (rand() - 0.5) * scatter);
		}
	});
}

/**
 * Apply only the seed positions (circular/random/cluster) without running ForceAtlas2.
 * Returns true when FA2 should follow (i.e. template is not circular_only).
 */
function applyGraphSeedLayout(
	graph: DirectedGraph,
	layoutMod: LayoutLib,
	template: string,
	groupBy?: GroupByFacetFn
): boolean {
	const { circular, random } = layoutMod;
	if (groupBy) {
		applyClusterPreLayout(graph, groupBy);
		return true;
	}
	switch (template as LayoutTemplateId) {
		case 'circular_only':
			circular.assign(graph, { scale: 1 });
			return false;
		case 'random_force':
			random.assign(graph, { scale: 1 });
			return true;
		case 'linlog_clusters':
		case 'circular_force':
		default:
			circular.assign(graph, { scale: 1 });
			return true;
	}
}

/**
 * Start a progressive ForceAtlas2 layout using the Web Worker supervisor.
 * Seeds the graph positions synchronously so Sigma can mount immediately,
 * then animates FA2 in the background until convergence (or timeout).
 * Returns a cleanup function that stops and kills the worker.
 */
export function startProgressiveLayout(
	graph: DirectedGraph,
	layoutMod: LayoutLib,
	FA2LayoutCtor: FA2WorkerCtor,
	fa2Sync: ForceAtlas2Lib,
	template: string,
	groupBy?: GroupByFacetFn,
	onDone?: () => void
): () => void {
	const needsFA2 = applyGraphSeedLayout(graph, layoutMod, template, groupBy);
	if (!needsFA2) return () => {};

	const inferred = fa2Sync.inferSettings(graph);
	const order = graph.order;

	let settings: Record<string, unknown>;
	if (groupBy) {
		settings = { ...inferred, linLogMode: true, gravity: 0.08 };
	} else if (template === 'linlog_clusters') {
		settings = { ...inferred, linLogMode: true, gravity: 0.02 };
	} else {
		settings = { ...inferred, linLogMode: order > 30 };
	}

	// Larger graphs need more time to converge; slow down to reduce jitter on dense layouts.
	if (order > 3000) {
		settings = { ...settings, slowDown: Math.max((settings.slowDown as number) ?? 1, 3) };
	}

	const supervisor = new FA2LayoutCtor(graph, { settings });
	supervisor.start();

	const convergenceMs =
		order < 50 ? 1500 : order < 500 ? 3000 : order < 3000 ? 5000 : 8000;
	const timer = setTimeout(() => {
		if (supervisor.isRunning()) supervisor.stop();
		onDone?.();
	}, convergenceMs);

	return () => {
		clearTimeout(timer);
		if (supervisor.isRunning()) supervisor.stop();
		supervisor.kill();
	};
}

export function applyGraphLayout(
	graph: DirectedGraph,
	layoutMod: LayoutLib,
	forceAtlas2: ForceAtlas2Lib,
	template: string,
	groupBy?: GroupByFacetFn
): void {
	const { circular, random } = layoutMod;
	const inferred = forceAtlas2.inferSettings(graph);
	const order = graph.order;
	const defaultFa = {
		iterations: Math.min(300, 50 + order * 2),
		settings: { ...inferred, linLogMode: order > 30 }
	};

	// When groupBy is provided, bypass normal seed layout and use cluster pre-positioning.
	// ForceAtlas2 with elevated gravity keeps clusters spatially cohesive.
	if (groupBy) {
		applyClusterPreLayout(graph, groupBy);
		forceAtlas2.assign(graph, {
			iterations: Math.min(400, 80 + order * 2),
			settings: { ...inferred, linLogMode: true, gravity: 0.08 }
		});
		return;
	}

	switch (template as LayoutTemplateId) {
		case 'circular_only':
			circular.assign(graph, { scale: 1 });
			return;
		case 'random_force':
			random.assign(graph, { scale: 1 });
			forceAtlas2.assign(graph, defaultFa);
			return;
		case 'linlog_clusters':
			circular.assign(graph, { scale: 1 });
			forceAtlas2.assign(graph, {
				iterations: Math.min(400, 80 + order * 2),
				settings: { ...inferred, linLogMode: true, gravity: 0.02 }
			});
			return;
		case 'circular_force':
		default:
			circular.assign(graph, { scale: 1 });
			forceAtlas2.assign(graph, defaultFa);
	}
}
