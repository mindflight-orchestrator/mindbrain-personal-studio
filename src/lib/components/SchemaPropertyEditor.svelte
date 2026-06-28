<script lang="ts">
	let {
		ontologyId,
		domainClass,
		kind = 'datatype',
		initialName = '',
		initialRange = 'string',
		initialTarget = '',
		onSaved,
		onCancel
	}: {
		ontologyId: string;
		domainClass: string;
		kind?: 'datatype' | 'object';
		initialName?: string;
		initialRange?: string;
		initialTarget?: string;
		onSaved?: () => void;
		onCancel?: () => void;
	} = $props();

	let name = $state('');
	let range = $state('string');
	let targetClass = $state('');
	let required = $state(false);
	let saving = $state(false);
	let error = $state<string | null>(null);

	$effect(() => {
		name = initialName;
		range = initialRange;
		targetClass = initialTarget;
	});

	async function save() {
		if (!name.trim()) {
			error = 'Name is required.';
			return;
		}
		saving = true;
		error = null;
		try {
			const body =
				kind === 'object'
					? {
							ontology_id: ontologyId,
							edge_type: name.trim(),
							source_entity_type: domainClass,
							target_entity_type: targetClass.trim() || 'unit',
							directed: true,
							metadata_json: JSON.stringify({ required })
						}
					: {
							ontology_id: ontologyId,
							name: name.trim(),
							kind: 'datatype',
							domain: domainClass,
							range: range.trim() || 'string',
							required,
							metadata_json: JSON.stringify({})
						};
			const path =
				kind === 'object' ? '/api/brain/ontology/edge-type' : '/api/brain/ontology/property';
			const res = await fetch(path, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
			if (!res.ok) throw new Error(await res.text());
			onSaved?.();
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}
</script>

<form class="property-editor" onsubmit={(e) => (e.preventDefault(), save())}>
	<h4>{kind === 'object' ? 'Add relation' : 'Add property'} · {domainClass}</h4>
	<label>
		<span>Name</span>
		<input bind:value={name} placeholder={kind === 'object' ? 'owns' : 'quotePart'} />
	</label>
	{#if kind === 'datatype'}
		<label>
			<span>Range</span>
			<select bind:value={range}>
				<option value="string">string</option>
				<option value="date">date</option>
				<option value="integer">integer</option>
				<option value="number">number</option>
				<option value="boolean">boolean</option>
			</select>
		</label>
	{:else}
		<label>
			<span>Target class</span>
			<input bind:value={targetClass} placeholder="unit" />
		</label>
	{/if}
	<label class="checkbox">
		<input type="checkbox" bind:checked={required} />
		<span>Required</span>
	</label>
	{#if error}
		<p class="error">{error}</p>
	{/if}
	<div class="actions">
		<button type="button" class="secondary" onclick={() => onCancel?.()}>Cancel</button>
		<button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
	</div>
</form>

<style>
	.property-editor {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
		padding: 0.5rem 0;
		font-family: system-ui, sans-serif;
		font-size: 0.75rem;
		color: #e2e8f0;
	}
	h4 {
		margin: 0;
		font-size: 0.72rem;
		color: #94a3b8;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	label span {
		color: #64748b;
		font-size: 0.68rem;
	}
	input,
	select {
		background: #0f172a;
		border: 1px solid #334155;
		border-radius: 6px;
		color: #e2e8f0;
		padding: 0.35rem 0.45rem;
		font-size: 0.75rem;
	}
	.checkbox {
		flex-direction: row;
		align-items: center;
		gap: 0.35rem;
	}
	.actions {
		display: flex;
		gap: 0.35rem;
		justify-content: flex-end;
	}
	button {
		background: #6366f1;
		border: 1px solid #4f46e5;
		color: #eef2ff;
		border-radius: 6px;
		padding: 0.3rem 0.65rem;
		cursor: pointer;
		font-size: 0.72rem;
	}
	button.secondary {
		background: #1e293b;
		border-color: #334155;
		color: #cbd5e1;
	}
	button:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.error {
		margin: 0;
		color: #f87171;
	}
</style>
