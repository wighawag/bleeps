<script lang="ts">
	import * as Modal from '$lib/core/ui/modal/index.js';
	import {Button} from '$lib/shadcn/ui/button';
	import {Spinner} from '$lib/shadcn/ui/spinner';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import MusicIcon from '@lucide/svelte/icons/music';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import {instrumentName} from '$lib/melodies/notes';
	import {wayOutOf} from '../lib/mint-problem';
	import type {MintFlow} from '../lib/mint-flow';

	type Props = {
		flow: MintFlow;
		/** Show the raw error text. */
		onDetails: (details: string) => void;
		/** Put the cursor in the name field. The dialog has already closed. */
		onRename: () => void;
	};

	let {flow, onDetails, onRename}: Props = $props();

	const flowState = $derived($flow);
	// The dialog cannot be dismissed mid-mint: the transaction is already on its
	// way to the wallet and closing would only hide it.
	const dismissable = $derived(flowState.step !== 'minting');

	// Set by "Pick another name" so the hand-back to the name field happens when
	// the dialog has finished closing, rather than racing its exit animation.
	let handBackToName = $state(false);

	function pickAnotherName() {
		handBackToName = true;
		flow.close();
	}

	const instruments = $derived(
		flowState.step === 'closed'
			? []
			: [
					...new Set(
						flowState.melody.slots
							.filter((slot) => slot.volume > 0)
							.map((slot) => instrumentName(slot.instrument)),
					),
				],
	);
</script>

<!-- A page's own view overlay: the user started a mint from the editor. The
     system layer is for modals raised by domain state (the wallet-action and
     insufficient-funds modals this mint can raise), which have to cover this
     one. -->
<Modal.Root
	layer="modal"
	openWhen={flowState.step !== 'closed'}
	onCancel={dismissable ? () => flow.close() : undefined}
	focusOnClose={handBackToName
		? () => {
				handBackToName = false;
				onRename();
			}
		: null}
>
	{#if flowState.step === 'confirming' || flowState.step === 'minting'}
		<Modal.Title>Mint this melody?</Modal.Title>

		<div class="flex flex-col gap-4 py-2">
			<dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
				<dt class="text-muted-foreground">Name</dt>
				<dd class="font-medium">
					{#if flowState.melody.name}
						{flowState.melody.name}
					{:else}
						<span class="text-muted-foreground">unnamed</span>
					{/if}
				</dd>
				<dt class="text-muted-foreground">Speed</dt>
				<dd>{flowState.melody.speed}</dd>
				{#if instruments.length > 0}
					<dt class="text-muted-foreground">Instruments</dt>
					<dd>{instruments.join(', ')}</dd>
				{/if}
			</dl>

			<p class="text-sm text-muted-foreground">
				{#if flowState.melody.name}
					Minting claims this name on chain for good: no one else can ever mint
					a melody called
					<span class="font-medium text-foreground"
						>{flowState.melody.name}</span
					>, and you cannot rename it later.
				{:else}
					This melody will be minted without a name. An unnamed melody reserves
					nothing, so any name it could have had stays free for someone else.
				{/if}
			</p>

			<Modal.Footer>
				<Button
					variant="outline"
					disabled={flowState.step === 'minting'}
					onclick={() => flow.close()}
				>
					Cancel
				</Button>
				<Button
					disabled={flowState.step === 'minting'}
					onclick={() => flow.confirm()}
				>
					{#if flowState.step === 'minting'}
						<Spinner class="size-4" />
						Minting...
					{:else}
						<MusicIcon class="size-4" />
						Mint
					{/if}
				</Button>
			</Modal.Footer>
		</div>
	{:else if flowState.step === 'failed'}
		<Modal.Title>
			<span class="flex items-center gap-2 text-destructive">
				<AlertCircleIcon class="size-5 shrink-0" />
				{flowState.problem.message}
			</span>
		</Modal.Title>

		<div class="flex flex-col gap-4 py-2">
			<p class="text-sm text-muted-foreground">
				{flowState.problem.explanation}
			</p>

			<Modal.Footer>
				<Button variant="ghost" onclick={() => onDetails(flowState.details)}>
					Details
				</Button>
				<Button variant="outline" onclick={() => flow.close()}>Close</Button>
				{#if wayOutOf(flowState.problem.code) === 'rename'}
					<Button onclick={pickAnotherName}>
						<PencilIcon class="size-4" />
						Pick another name
					</Button>
				{:else if wayOutOf(flowState.problem.code) === 'retry'}
					<Button onclick={() => flow.confirm()}>Try again</Button>
				{/if}
			</Modal.Footer>
		</div>
	{/if}
</Modal.Root>
