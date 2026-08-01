import {writable} from 'svelte/store';
import type {OnchainOperation} from '$lib/account/AccountData';

type PendingOperationModalState = {
	open: boolean;
	operationKey: string | null;
	operation: OnchainOperation | null;
};

function createPendingOperationStore() {
	const {subscribe, set} = writable<PendingOperationModalState>({
		open: false,
		operationKey: null,
		operation: null,
	});

	return {
		subscribe,
		open: (key: string, operation: OnchainOperation) => {
			set({open: true, operationKey: key, operation});
		},
		close: () => {
			set({open: false, operationKey: null, operation: null});
		},
	};
}

export const pendingOperationModal = createPendingOperationStore();
