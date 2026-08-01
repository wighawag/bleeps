<script lang="ts">
	import type {ComponentProps} from 'svelte';
	import * as Modal from './index.js';
	type ModalProps = ComponentProps<typeof Modal.Root>;

	interface Props extends Omit<ModalProps, 'title' | 'description'> {
		title: string;
		cancel?:
			| {
					label?: string;
					onclick?: () => void;
					disabled?: boolean;
			  }
			| true;
		confirm?: {
			label?: string;
			onclick: () => void;
			disabled?: boolean;
		};
	}

	let {children, title, cancel, confirm, ...rest}: Props = $props();
</script>

<Modal.Root {...rest}>
	<Modal.Title>{title}</Modal.Title>

	{@render children?.()}
	<Modal.Footer>
		{#if cancel}
			<button
				disabled={typeof cancel === 'object' && cancel.disabled}
				type="button"
				class="btn preset-tonal"
				onclick={typeof cancel === 'object' && cancel.onclick
					? cancel.onclick
					: rest.onCancel}
				>{#if typeof cancel === 'object' && cancel.label}{cancel.label}{:else}Cancel{/if}</button
			>
		{/if}
		{#if confirm}
			<button
				disabled={confirm.disabled}
				type="button"
				class="btn preset-filled"
				onclick={confirm.onclick}
				>{#if confirm.label}{confirm.label}{:else}Confirm{/if}</button
			>
		{/if}
	</Modal.Footer>
</Modal.Root>
