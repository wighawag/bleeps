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
		emptyMelody,
		encodeMelodyToString,
	} from '$lib/melodies/melody';
	import {instrumentName} from '$lib/melodies/notes';
	import {createMelodyEditor} from '$lib/melodies/melody-editor';
	import {createMelodyPreview} from './lib/preview';
	import {melodyFromHash} from './lib/share-link';
	import {mintMelody} from './lib/mintMelody';
	import RequiresMelodies from '$lib/melodies/RequiresMelodies.svelte';

	const context = getAppContext();
	const {publicClient, deployments, account, accountCannotSend, errorDetails} =
		context;
	const currentDeployments = deployments.get();

	const melody = writable(emptyMelody());
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

	$effect(() => {
		loadFromHash();
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

	let isMinting = $state(false);

	async function mint() {
		if (isMinting) {
			return;
		}
		isMinting = true;
		try {
			const result = await mintMelody(context, $melody);
			if (result.status === 'submitted') {
				toast.success('Melody submitted', {
					description: 'It will appear once the transaction is mined.',
				});
			} else if (result.status === 'cannot-send') {
				accountCannotSend.show();
			} else if (result.status === 'error') {
				toast.error('Could not mint', {
					description: result.message,
					duration: 8000,
					closeButton: true,
					action: {
						label: 'Details',
						onClick: () => errorDetails.show(result.details),
					},
				});
			}
		} finally {
			isMinting = false;
		}
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

				<Button onclick={mint} disabled={isMinting}>
					{#if isMinting}
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
</RequiresMelodies>
