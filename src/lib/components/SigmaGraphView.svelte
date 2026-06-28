<script lang="ts">
	import { browser } from '$app/environment';
	import type { GraphNodeDTO } from '$lib/graph/nodeVisuals';

	export type SimpleEdge = {
		id: string;
		source: string;
		target: string;
		label?: string | null;
	};

	let {
		nodes,
		edges,
		variant = 'data',
		onNodeClick,
		onEdgeClick
	}: {
		nodes: GraphNodeDTO[];
		edges: SimpleEdge[];
		variant?: 'data' | 'ontology';
		onNodeClick?: (node: GraphNodeDTO) => void;
		onEdgeClick?: (edge: SimpleEdge) => void;
	} = $props();

	let rootEl = $state<HTMLDivElement | undefined>(undefined);
	let status = $state<'loading' | 'ready' | 'empty'>('loading');

	type SigmaInstance = import('sigma').default;

	let sigmaInstance: SigmaInstance | null = null;

	$effect(() => {
		if (!browser) return;
		const nodeList = nodes;
		const edgeList = edges;
		const kind = variant;
		void mountGraph(nodeList, edgeList, kind);
		return () => {
			sigmaInstance?.kill();
			sigmaInstance = null;
		};
	});

	async function mountGraph(
		nodeList: GraphNodeDTO[],
		edgeList: SimpleEdge[],
		kind: 'data' | 'ontology'
	) {
		if (!rootEl || !browser) return;

		if (nodeList.length === 0) {
			status = 'empty';
			sigmaInstance?.kill();
			sigmaInstance = null;
			return;
		}

		status = 'loading';
		sigmaInstance?.kill();
		sigmaInstance = null;
		const [{ default: Sigma }, { DirectedGraph }] = await Promise.all([
			import('sigma'),
			import('graphology')
		]);

		const graph = new DirectedGraph();
		const nodeById = new Map(nodeList.map((node) => [node.id, node]));
		const edgeById = new Map<string, SimpleEdge>();
		const nodeCount = nodeList.length || 1;
		for (let i = 0; i < nodeList.length; i++) {
			const node = nodeList[i];
			const isClass = kind === 'ontology';
			const angle = (2 * Math.PI * i) / nodeCount;
			graph.addNode(node.id, {
				label: node.label ?? node.id,
				x: Math.cos(angle) * 10,
				y: Math.sin(angle) * 10,
				size: isClass ? 8 : 6,
				color: isClass ? '#38bdf8' : '#a78bfa',
				labelColor: '#e2e8f0'
			});
		}
		for (const edge of edgeList) {
			if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
			const edgeId = edge.id || `${edge.source}-${edge.label ?? 'rel'}-${edge.target}`;
			if (graph.hasEdge(edgeId)) continue;
			edgeById.set(edgeId, edge);
			graph.addEdgeWithKey(edgeId, edge.source, edge.target, {
				label: edge.label ?? '',
				size: kind === 'ontology' ? 1.5 : 1,
				color: kind === 'ontology' ? '#64748b' : '#475569',
				type: 'arrow'
			});
		}

		sigmaInstance = new Sigma(graph, rootEl, {
			renderLabels: true,
			labelDensity: 0.07,
			labelRenderedSizeThreshold: 6,
			defaultEdgeType: 'arrow',
			defaultNodeType: 'circle',
			allowInvalidContainer: true
		});

		sigmaInstance.on('clickNode', ({ node }) => {
			const dto = nodeById.get(node);
			if (dto) onNodeClick?.(dto);
		});
		sigmaInstance.on('clickEdge', ({ edge }) => {
			const dto = edgeById.get(edge);
			if (dto) onEdgeClick?.(dto);
		});

		status = 'ready';
	}
</script>

<div class="sigma-root" bind:this={rootEl}>
	{#if status === 'empty'}
		<p class="muted">No graph nodes to display.</p>
	{/if}
</div>

<style>
	.sigma-root {
		flex: 1 1 auto;
		min-height: 0;
		width: 100%;
		position: relative;
		background: #0b0f14;
	}
	.muted {
		padding: 1rem;
		color: #64748b;
		font-family: system-ui, sans-serif;
		font-size: 0.85rem;
	}
</style>
