<script lang="ts">
	import { browser } from '$app/environment';

	let {
		text,
		label = 'Help'
	}: {
		text: string;
		label?: string;
	} = $props();

	let open = $state(false);
	let rootEl = $state<HTMLSpanElement | undefined>(undefined);

	function toggle() {
		open = !open;
	}

	function close() {
		open = false;
	}

	$effect(() => {
		if (!browser || !open) return;

		function onKeyDown(e: KeyboardEvent) {
			if (e.key === 'Escape') close();
		}

		function onPointerDown(e: PointerEvent) {
			const target = e.target as Node | null;
			if (rootEl && target && !rootEl.contains(target)) close();
		}

		document.addEventListener('keydown', onKeyDown);
		document.addEventListener('pointerdown', onPointerDown, true);
		return () => {
			document.removeEventListener('keydown', onKeyDown);
			document.removeEventListener('pointerdown', onPointerDown, true);
		};
	});
</script>

<span class="help-wrap" bind:this={rootEl}>
	<button
		type="button"
		class="help-hint"
		aria-label={label}
		aria-expanded={open}
		onclick={toggle}
	>
		?
	</button>
	{#if open}
		<div class="help-popover" role="dialog" aria-label={label}>
			{text}
		</div>
	{/if}
</span>

<style>
	.help-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
	}
	.help-hint {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.05rem;
		height: 1.05rem;
		padding: 0;
		border-radius: 999px;
		border: 1px solid #64748b;
		background: transparent;
		color: #94a3b8;
		font-size: 0.62rem;
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
		font-family: system-ui, sans-serif;
	}
	.help-hint:hover,
	.help-hint:focus-visible {
		border-color: #94a3b8;
		color: #cbd5e1;
		outline: none;
	}
	.help-popover {
		position: absolute;
		top: calc(100% + 0.35rem);
		left: 50%;
		transform: translateX(-50%);
		z-index: 40;
		width: max-content;
		max-width: 280px;
		padding: 0.55rem 0.65rem;
		border-radius: 0.45rem;
		border: 1px solid #334155;
		background: #1e293b;
		color: #cbd5e1;
		font-size: 0.72rem;
		line-height: 1.45;
		font-family: system-ui, sans-serif;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
	}
</style>
