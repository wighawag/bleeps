// Modal Store Queue

import {writable} from 'svelte/store';
import type {ModalSettings} from './types';

function modalService() {
	const {subscribe, set, update} = writable<ModalSettings[]>([]);
	return {
		subscribe,
		set,
		update,
		/** Append to end of queue. */
		trigger: (modal: ModalSettings) => {
			update((mStore) => {
				mStore.unshift(modal);
				return mStore;
			});
		},

		/**  Remove first item in queue. */
		close: () => {
			update((mStore) => {
				if (mStore.length > 0) mStore.shift();
				return mStore;
			});
		},
		/** Remove all items from queue. */
		clear: () => set([]),
	};
}

export const modalStore = modalService();

// TODO remove, or better add option to auto inject stores
if (typeof window !== 'undefined') {
	(window as any).modalStore = modalStore;
}
