<script lang="ts">
	import type {AbiParameter} from 'viem';
	import Label from '$lib/shadcn/ui/label/label.svelte';
	import Input from '$lib/shadcn/ui/input/input.svelte';
	import AddressInput from '$lib/core/ui/ethereum/AddressInput.svelte';
	import * as Alert from '$lib/shadcn/ui/alert';
	import CircleAlertIcon from '@lucide/svelte/icons/circle-alert';
	import {
		getInputFieldType,
		getInputPlaceholder,
		validateInputValue,
		getInputKey,
		getInputLabel,
	} from '../lib/utils';

	interface Props {
		inputs: readonly AbiParameter[];
		values: Record<string, any>;
		errors: Record<string, string>;
	}

	let {inputs, values, errors}: Props = $props();

	// Watch for changes in values and validate
	// Skip validation for address types since AddressInput handles its own validation
	$effect(() => {
		for (const [index, input] of inputs.entries()) {
			const key = getInputKey(input, index);
			// Skip address type validation - AddressInput handles it
			if (input.type === 'address') {
				delete errors[key];
				continue;
			}
			if (values[key] !== undefined) {
				const validation = validateInputValue(input.type, String(values[key]));
				if (!validation.valid && validation.error) {
					errors[key] = validation.error;
				} else {
					delete errors[key];
				}
			}
		}
	});
</script>

<div class="space-y-3">
	{#each inputs as input, index (index)}
		<div class="space-y-1">
			<Label for={`input-${index}`} class="text-sm">
				{getInputLabel(input, index)}
				<span class="ml-2 text-xs text-muted-foreground"
					>({input.internalType || input.type})</span
				>
			</Label>

			{#if input.type === 'address'}
				<AddressInput
					id={`input-${index}`}
					bind:value={values[getInputKey(input, index)]}
					class="text-sm"
				/>
			{:else if getInputFieldType(input.type) === 'select'}
				<select
					id={`input-${index}`}
					class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					bind:value={values[getInputKey(input, index)]}
				>
					<option value="">Select...</option>
					<option value="true">true</option>
					<option value="false">false</option>
				</select>
			{:else}
				<Input
					id={`input-${index}`}
					type={getInputFieldType(input.type)}
					placeholder={getInputPlaceholder(input.type)}
					bind:value={values[getInputKey(input, index)]}
					class="font-mono text-sm"
				/>
			{/if}

			{#if errors[getInputKey(input, index)]}
				<Alert.Root
					variant="destructive"
					class="max-w-full overflow-hidden py-2"
				>
					<CircleAlertIcon class="h-4 w-4 shrink-0" />
					<Alert.Description
						class="overflow-wrap-break-word max-h-32 min-w-0 overflow-y-auto text-xs wrap-break-word"
					>
						{errors[getInputKey(input, index)]}
					</Alert.Description>
				</Alert.Root>
			{/if}
		</div>
	{/each}
</div>
