import {writable, type Readable} from 'svelte/store';
import type {MelodyInfo} from '$lib/melodies/melody';
import {mintMelody, type MintMelodyDeps} from './mintMelody';
import type {MintProblem} from './mint-problem';

/**
 * The minting conversation, as a state machine.
 *
 * Minting used to be one button and a toast, which is the wrong shape for what
 * it does: a mint claims a name permanently, and the way it usually fails
 * (`NAME_ALREADY_TAKEN`) is something the composer has to go and fix. A toast
 * in the corner is easy to miss and has nowhere to put the fix. So the flow is
 * a dialog: confirm, then minting, then either it is away or the reason it is
 * not is on screen with a way out.
 *
 * Kept here rather than in the component because it is logic, and because the
 * failure states are worth testing without rendering anything.
 */
export type MintFlowState =
	| {step: 'closed'}
	/** Asking before claiming a name that cannot be given back. */
	| {step: 'confirming'; melody: MelodyInfo}
	/** Estimating, waiting for the wallet, sending. */
	| {step: 'minting'; melody: MelodyInfo}
	/** It did not go through, and we can say why. */
	| {
			step: 'failed';
			melody: MelodyInfo;
			problem: MintProblem;
			/** Raw error text, for the details modal. */
			details: string;
	  };

export type MintFlow = Readable<MintFlowState> & {
	/** Snapshot the melody and ask for confirmation. */
	open(melody: MelodyInfo): void;
	/** Mint the melody the flow is holding. */
	confirm(): Promise<void>;
	/** Back to the editor, whatever the flow was showing. */
	close(): void;
};

export function createMintFlow(params: {
	deps: MintMelodyDeps;
	/** The transaction is on its way. */
	onSubmitted: () => void;
	/** This account cannot send under the configured execution mode. */
	onCannotSend: () => void;
}): MintFlow {
	const {deps, onSubmitted, onCannotSend} = params;
	const state = writable<MintFlowState>({step: 'closed'});

	// The melody the flow is working on. Snapshotted at `open` so a mint always
	// sends what was confirmed, never something edited underneath it.
	let held: MelodyInfo | undefined;

	function open(melody: MelodyInfo) {
		held = {...melody, slots: melody.slots.map((slot) => ({...slot}))};
		state.set({step: 'confirming', melody: held});
	}

	function close() {
		held = undefined;
		state.set({step: 'closed'});
	}

	async function confirm() {
		const melody = held;
		if (!melody) {
			return;
		}
		state.set({step: 'minting', melody});

		const result = await mintMelody(deps, melody);

		if (result.status === 'submitted') {
			close();
			onSubmitted();
			return;
		}
		if (result.status === 'cannot-send') {
			close();
			onCannotSend();
			return;
		}
		if (result.status === 'cancelled') {
			// Rejected in the wallet or backed out of the funds modal. Not a
			// failure worth explaining: return to the confirmation so the composer
			// can simply try again.
			state.set({step: 'confirming', melody});
			return;
		}

		state.set({
			step: 'failed',
			melody,
			problem: {
				code: result.code,
				message: result.message,
				explanation: result.explanation,
			},
			details: result.details,
		});
	}

	return {subscribe: state.subscribe, open, confirm, close};
}
