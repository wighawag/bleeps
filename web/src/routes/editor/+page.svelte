<script lang="ts">
	import {writable} from 'svelte/store';
	import DefaultHead from '$lib/metadata/DefaultHead.svelte';
	import {Button} from '$lib/shadcn/ui/button';
	import {Input} from '$lib/shadcn/ui/input';
	import {Spinner} from '$lib/shadcn/ui/spinner';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import Share2Icon from '@lucide/svelte/icons/share-2';
	import {toast} from 'svelte-sonner';
	import {getAppContext} from '$lib';
	import MusicIcon from '@lucide/svelte/icons/music';
	import MelodyCanvas from '$lib/melodies/MelodyCanvas.svelte';
	import {
		DEFAULT_SPEED,
		defaultMelody,
		encodeMelodyToString,
	} from '$lib/melodies/melody';
	import {instrumentName} from '$lib/melodies/notes';
	import {createMelodyEditor} from '$lib/melodies/melody-editor';
	import {createMelodyPreview} from './lib/preview';
	import {melodyFromHash} from './lib/share-link';
	import {createMintFlow} from './lib/mint-flow';
	import MintMelodyDialog from './components/MintMelodyDialog.svelte';
	import RequiresMelodies from '$lib/melodies/RequiresMelodies.svelte';

	const context = getAppContext();
	const {publicClient, deployments, account, accountCannotSend, errorDetails} =
		context;
	const currentDeployments = deployments.get();

	// Read the hash BEFORE creating the writable so the melody starts with the
	// right value. Loading in $effect instead races with the name input: the
	// shadcn Input uses `bind:value` internally, which reads the DOM value back
	// into its $bindable prop after mount. If the store is first set to
	// defaultMelody() and then updated to the hash melody in $effect, the input
	// can capture the default name from the DOM before the hash melody is
	// applied, and the field never updates (the melody canvas does, because it
	// reads the store reactively without bind:value). Reading the hash at init
	// means there is no second update to lose.
	const initialFromHash = melodyFromHash(
		typeof location === 'undefined' ? '' : location.hash,
	);
	const melody = writable(
		initialFromHash.status === 'ok' ? initialFromHash.melody : defaultMelody(),
	);
	const editor = createMelodyEditor(melody);
	const preview = createMelodyPreview({
		melody,
		publicClient,
		deployments: currentDeployments,
	});

	const INSTRUMENTS = Array.from({length: 9}, (_, i) => i);
	const SPEEDS = [8, 12, 16, 20, 24, 32];

	// The melody lives in the hash, so a reload or a shared link restores it.
	// Written back only on demand: doing it on every edit would bury the page in
	// history entries.
	let applyingHash = false;

	function loadFromHash() {
		const result = melodyFromHash(
			typeof location === 'undefined' ? '' : location.hash,
		);
		if (result.status === 'ok') {
			applyingHash = true;
			melody.set(result.melody);
			applyingHash = false;
		} else if (result.status === 'error') {
			toast.error('Could not load melody from link', {
				description: result.reason,
				duration: 8000,
				closeButton: true,
			});
		}
	}

	// The initial hash was already read at component init; this effect exists
	// only to surface a malformed-hash error as a toast, which cannot run during
	// SSR (and there is no hash during SSR anyway, so there is nothing to report).
	$effect(() => {
		if (initialFromHash.status === 'error') {
			toast.error('Could not load melody from link', {
				description: initialFromHash.reason,
				duration: 8000,
				closeButton: true,
			});
		}
	});

	function share() {
		const encoded = encodeMelodyToString($melody);
		location.hash = `melody=${encoded}`;
		const url = location.href;
		navigator.clipboard
			?.writeText(url)
			.then(() => toast.success('Link copied'))
			.catch(() => toast.info('Link is in the address bar'));
	}

	// Shown under the name on the canvas, so a composer can see whose melody it
	// will be. Undefined until a wallet is connected.
	const creator = $derived($account);

	// Minting is a dialog rather than a button and a toast. It claims a name on
	// chain permanently, and the way it usually fails (the name is already taken)
	// is something the composer has to go and fix, which needs more room than a
	// corner notification and a place to put the fix. See lib/mint-flow.ts.
	const mintFlow = createMintFlow({
		deps: context,
		onSubmitted: () =>
			toast.success('Melody submitted', {
				description: 'It will appear once the transaction is mined.',
			}),
		onCannotSend: () => accountCannotSend.show(),
	});

	let nameInput = $state<HTMLInputElement | null>(null);

	// Where the dialog hands back to when the name was the problem: the field that
	// holds the fix, with the old name selected so typing replaces it. The dialog
	// closes itself first, so this only has to move the cursor.
	function focusNameField() {
		nameInput?.focus();
		nameInput?.select();
	}
</script>

<svelte:window onhashchange={() => !applyingHash && loadFromHash()} />

<RequiresMelodies>
	<DefaultHead title="Melody editor" />

	<div class="mx-auto max-w-3xl px-4 py-8">
		<header class="mb-6 text-center">
			<h1 class="text-3xl font-bold">Melody editor</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				Drag in the tall strip to draw notes, in the short strip at the bottom
				to set volumes. Hold shift to repaint the instrument without moving the
				note.
			</p>
		</header>

		<div class="flex flex-col items-center gap-4">
			<MelodyCanvas {melody} {editor} editable {creator} />

			<div class="flex w-full flex-wrap items-end justify-center gap-3">
				<label class="flex flex-col gap-1 text-sm">
					<span class="text-muted-foreground">Name</span>
					<Input
						bind:ref={nameInput}
						value={$melody.name}
						maxlength={32}
						oninput={(event) =>
							editor.setName((event.currentTarget as HTMLInputElement).value)}
					/>
				</label>

				<label class="flex flex-col gap-1 text-sm">
					<span class="text-muted-foreground">Speed</span>
					<select
						class="h-9 rounded-md border border-input bg-background px-3 text-sm"
						value={$melody.speed}
						onchange={(event) =>
							editor.setSpeed(
								parseInt(
									(event.currentTarget as HTMLSelectElement).value,
									10,
								) || DEFAULT_SPEED,
							)}
					>
						{#each SPEEDS as speed (speed)}
							<option value={speed}>{speed}</option>
						{/each}
					</select>
				</label>

				<Button variant="outline" onclick={share}>
					<Share2Icon class="size-4" />
					Share
				</Button>

				<Button
					onclick={() => mintFlow.open($melody)}
					disabled={$mintFlow.step === 'minting'}
				>
					{#if $mintFlow.step === 'minting'}
						<Spinner class="size-4" />
					{:else}
						<MusicIcon class="size-4" />
					{/if}
					Mint
				</Button>
			</div>

			<div class="flex flex-wrap justify-center gap-2">
				{#each INSTRUMENTS as instrument (instrument)}
					<Button
						size="sm"
						variant={$editor.selectedInstrument === instrument
							? 'default'
							: 'outline'}
						onclick={() => editor.selectInstrument(instrument)}
					>
						{instrumentName(instrument)}
					</Button>
				{/each}
			</div>

			<section class="w-full text-center">
				{#if $preview.step === 'Rendering'}
					<p
						class="flex items-center justify-center gap-2 text-sm text-muted-foreground"
					>
						<Spinner class="size-4" />
						Rendering on chain...
					</p>
				{:else if $preview.step === 'Rendered'}
					<audio
						class="mx-auto w-full max-w-md"
						src={$preview.animationUrl}
						controls
						preload="auto"
					></audio>
				{:else if $preview.step === 'Failed'}
					<p
						class="flex items-center justify-center gap-2 text-sm text-destructive"
					>
						<AlertCircleIcon class="size-4" />
						{$preview.message}
					</p>
				{/if}
			</section>
		</div>
	</div>

	<MintMelodyDialog
		flow={mintFlow}
		onDetails={(details) => errorDetails.show(details, 'Mint error')}
		onRename={focusNameField}
	/>
</RequiresMelodies>
