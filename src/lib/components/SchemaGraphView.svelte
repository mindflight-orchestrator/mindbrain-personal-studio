<script lang="ts">
	import { browser } from '$app/environment';
	import type { SchemaGraphEdge, SchemaGraphNode } from '$lib/brain/schemaGraphModel';
	import {
		SCHEMA_LEGEND_ROWS,
		styleSchemaEdge,
		styleSchemaNode
	} from '$lib/brain/schemaGraphVisuals';
	import { applyGraphLayout } from '$lib/graph/layoutTemplates';

	let {
		nodes,
		edges,
		showEdgeLabels = false,
		onNodeClick,
		onEdgeClick
	}: {
		nodes: SchemaGraphNode[];
		edges: SchemaGraphEdge[];
		showEdgeLabels?: boolean;
		onNodeClick?: (node: SchemaGraphNode) => void;
		onEdgeClick?: (edge: SchemaGraphEdge) => void;
	} = $props();

	let rootEl = $state<HTMLDivElement | undefined>(undefined);
	let status = $state<'loading' | 'ready' | 'empty' | 'error'>('loading');
	let mountError = $state<string | null>(null);

	type SigmaInstance = import('sigma').default;

	let sigmaInstance: SigmaInstance | null = null;
	let mountGeneration = 0;

	$effect(() => {
		if (!browser) return;
		const container = rootEl;
		const nodeList = nodes;
		const edgeList = edges;
		const edgeLabels = showEdgeLabels;
		if (!container) return;

		const generation = ++mountGeneration;
		void mountGraph(container, nodeList, edgeList, edgeLabels, generation);

		return () => {
			mountGeneration++;
			sigmaInstance?.kill();
			sigmaInstance = null;
		};
	});

	async function mountGraph(
		container: HTMLDivElement,
		nodeList: SchemaGraphNode[],
		edgeList: SchemaGraphEdge[],
		edgeLabels: boolean,
		generation: number
	) {
		sigmaInstance?.kill();
		sigmaInstance = null;
		mountError = null;

		if (nodeList.length === 0) {
			status = 'empty';
			return;
		}

		status = 'loading';

		try {
			const [{ default: Sigma }, { MultiDirectedGraph }, layoutMod, fa2mod] = await Promise.all([
				import('sigma'),
				import('graphology'),
				import('graphology-layout'),
				import('graphology-layout-forceatlas2')
			]);

			if (generation !== mountGeneration || rootEl !== container) return;

			const graph = new MultiDirectedGraph();
			const nodeById = new Map(nodeList.map((node) => [node.id, node]));
			const edgeById = new Map<string, SchemaGraphEdge>();

			for (const node of nodeList) {
				const visual = styleSchemaNode(node);
				graph.addNode(node.id, {
					label: visual.label,
					size: visual.size,
					x: 0,
					y: 0,
					color: visual.color,
					labelColor: visual.labelColor,
					forceLabel: visual.forceLabel,
					zIndex: visual.zIndex,
					schemaAbstract: node.abstract || node.synthetic,
					schemaDomain:
						typeof node.metadata?.ontology_key === 'string' ? node.metadata.ontology_key : null
				});
			}

			for (const edge of edgeList) {
				if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
				if (graph.hasEdge(edge.id)) continue;
				const visual = styleSchemaEdge(edge);
				edgeById.set(edge.id, edge);
				try {
					graph.addEdgeWithKey(edge.id, edge.source, edge.target, {
						label: edgeLabels && edge.importantLabel ? visual.label : '',
						size: visual.size,
						color: visual.color,
						labelColor: visual.labelColor,
						forceLabel: edgeLabels && edge.kind === 'relation' && edge.importantLabel,
						type: 'arrow',
						zIndex: visual.zIndex,
						schemaKind: edge.kind
					});
				} catch {
					// Skip duplicate edge keys (should not happen with unique ids).
					edgeById.delete(edge.id);
				}
			}

			applyGraphLayout(
				graph,
				layoutMod,
				fa2mod.default,
				'circular_force',
				(nodeId) => {
					const domain = graph.getNodeAttribute(nodeId, 'schemaDomain');
					return typeof domain === 'string' && domain ? domain : null;
				}
			);

			if (generation !== mountGeneration || rootEl !== container) return;

			sigmaInstance = new Sigma(graph, container, {
				renderLabels: true,
				renderEdgeLabels: edgeLabels,
				labelDensity: 0.08,
				labelSize: 12,
				labelWeight: '600',
				labelColor: { attribute: 'labelColor', color: '#f0f9ff' },
				edgeLabelSize: 10,
				edgeLabelWeight: '500',
				edgeLabelColor: { attribute: 'labelColor', color: '#ede9fe' },
				labelRenderedSizeThreshold: 9,
				zIndex: true,
				defaultEdgeType: 'arrow',
				enableEdgeEvents: true,
				allowInvalidContainer: true,
				edgeReducer(edge, data) {
					const kind = graph.getEdgeAttribute(edge, 'schemaKind');
					if (kind === 'is_a') {
						return { ...data, size: 1, color: '#475569' };
					}
					return data;
				}
			});

			sigmaInstance.on('clickNode', ({ node }) => {
				const dto = nodeById.get(node);
				if (dto) onNodeClick?.(dto);
			});
			sigmaInstance.on('clickEdge', ({ edge }) => {
				const dto = edgeById.get(edge);
				if (dto) onEdgeClick?.(dto);
			});

			sigmaInstance.refresh();
			sigmaInstance.getCamera().animatedReset({ duration: 0 });

			status = 'ready';
		} catch (e) {
			if (generation !== mountGeneration) return;
			mountError = e instanceof Error ? e.message : String(e);
			status = 'error';
		}
	}
</script>

<div class="schema-graph">
	<div class="sigma-root" bind:this={rootEl}>
		{#if status === 'empty'}
			<p class="muted">No schema types to display.</p>
		{:else if status === 'error' && mountError}
			<p class="error">{mountError}</p>
		{/if}
	</div>
	<aside class="legend" aria-label="Schema graph legend">
		{#each SCHEMA_LEGEND_ROWS as row}
			<div class="legend-row">
				<span
					class="swatch"
					class:dashed={row.dashed}
					style:background={row.dashed ? 'transparent' : row.swatch}
					style:border-color={row.swatch}
				></span>
				<span class="legend-label">{row.label}</span>
			</div>
		{/each}
	</aside>
</div>

<style>
	.schema-graph {
		flex: 1 1 auto;
		min-height: 0;
		position: relative;
		display: flex;
	}
	.sigma-root {
		flex: 1 1 auto;
		min-height: 0;
		width: 100%;
		position: relative;
		background: #0b0f14;
	}
	.legend {
		position: absolute;
		right: 0.65rem;
		bottom: 0.65rem;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding: 0.5rem 0.65rem;
		border-radius: 0.45rem;
		border: 1px solid #1e293b;
		background: rgba(11, 15, 20, 0.92);
		font-family: system-ui, sans-serif;
		font-size: 0.68rem;
		color: #cbd5e1;
		pointer-events: none;
	}
	.legend-row {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}
	.swatch {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 999px;
		flex-shrink: 0;
		border: 2px solid transparent;
	}
	.swatch.dashed {
		border-style: dashed;
		border-width: 2px;
		border-radius: 2px;
		width: 1rem;
		height: 0;
	}
	.legend-label {
		line-height: 1.2;
	}
	.muted {
		padding: 1rem;
		color: #64748b;
		font-family: system-ui, sans-serif;
		font-size: 0.85rem;
	}
	.error {
		padding: 1rem;
		color: #f87171;
		font-family: system-ui, sans-serif;
		font-size: 0.85rem;
	}
</style>
