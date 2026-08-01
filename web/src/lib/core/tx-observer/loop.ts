import type {TransactionObserver} from '@etherkit/tx-observer';
import type {TabLeaderService} from '$lib/core/tab-leader';

/**
 * Run a transaction-observer processing loop, gated on tab leadership.
 *
 * Only the leader tab processes transactions, so N open tabs don't all poll the
 * chain. While this tab is leader it processes immediately and then on an
 * interval; when it loses leadership it stops. Leadership changes and each
 * process are surfaced via optional callbacks (e.g. to record debug stats) so
 * this module stays free of any app-specific state shape.
 *
 * @returns a stop function that tears down the subscription and interval.
 */
export function startTxObserverLoop(params: {
	tabLeader: TabLeaderService;
	txObserver: TransactionObserver;
	intervalMs: number;
	/** Called on every process tick (immediate and each interval). */
	onProcess?: () => void;
	/** Called whenever leadership is gained (`true`) or lost (`false`). */
	onLeadershipChange?: (isLeader: boolean) => void;
}): () => void {
	const {tabLeader, txObserver, intervalMs, onProcess, onLeadershipChange} =
		params;

	let interval: ReturnType<typeof setInterval> | undefined;

	function process(): void {
		onProcess?.();
		txObserver.process();
	}

	const unsubscribe = tabLeader.isLeader.subscribe((leader) => {
		if (leader) {
			// Became leader: process immediately, then on the interval.
			onLeadershipChange?.(true);
			process();
			interval = setInterval(process, intervalMs);
		} else {
			// Lost leadership: stop processing.
			onLeadershipChange?.(false);
			if (interval !== undefined) {
				clearInterval(interval);
				interval = undefined;
			}
		}
	});

	return () => {
		unsubscribe();
		if (interval !== undefined) {
			clearInterval(interval);
			interval = undefined;
		}
	};
}
