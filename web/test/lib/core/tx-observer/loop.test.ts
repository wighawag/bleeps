import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {writable} from 'svelte/store';
import {startTxObserverLoop} from '$lib/core/tx-observer';
import type {TabLeaderService} from '$lib/core/tab-leader';
import type {TransactionObserver} from '@etherkit/tx-observer';

/**
 * Fakes: the loop only touches `tabLeader.isLeader` (a boolean store) and
 * `txObserver.process()`, and reports out via optional callbacks. Small
 * interface -> tiny fakes.
 */
function makeLeaderStore(initial = false) {
	const isLeader = writable(initial);
	const tabLeader = {isLeader} as unknown as TabLeaderService;
	return {tabLeader, setLeader: (v: boolean) => isLeader.set(v)};
}

function makeTxObserver() {
	const process = vi.fn(async () => {});
	const txObserver = {process} as unknown as TransactionObserver;
	return {txObserver, process};
}

const INTERVAL = 2000;

describe('startTxObserverLoop', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('does nothing while this tab is not the leader', () => {
		const {tabLeader} = makeLeaderStore(false);
		const {txObserver, process} = makeTxObserver();
		const onProcess = vi.fn();

		const stop = startTxObserverLoop({
			tabLeader,
			txObserver,
			intervalMs: INTERVAL,
			onProcess,
		});

		vi.advanceTimersByTime(INTERVAL * 3);
		expect(process).not.toHaveBeenCalled();
		expect(onProcess).not.toHaveBeenCalled();
		stop();
	});

	it('processes immediately on becoming leader and reports leadership', () => {
		const {tabLeader, setLeader} = makeLeaderStore(false);
		const {txObserver, process} = makeTxObserver();
		const onProcess = vi.fn();
		const onLeadershipChange = vi.fn();

		const stop = startTxObserverLoop({
			tabLeader,
			txObserver,
			intervalMs: INTERVAL,
			onProcess,
			onLeadershipChange,
		});

		setLeader(true);
		expect(process).toHaveBeenCalledTimes(1);
		expect(onProcess).toHaveBeenCalledTimes(1);
		expect(onLeadershipChange).toHaveBeenLastCalledWith(true);
		stop();
	});

	it('keeps processing on the interval while leader', () => {
		const {tabLeader, setLeader} = makeLeaderStore(false);
		const {txObserver, process} = makeTxObserver();

		const stop = startTxObserverLoop({
			tabLeader,
			txObserver,
			intervalMs: INTERVAL,
		});

		setLeader(true); // immediate process (1)
		vi.advanceTimersByTime(INTERVAL * 3); // +3
		expect(process).toHaveBeenCalledTimes(4);
		stop();
	});

	it('stops processing and reports leadership loss', () => {
		const {tabLeader, setLeader} = makeLeaderStore(false);
		const {txObserver, process} = makeTxObserver();
		const onLeadershipChange = vi.fn();

		const stop = startTxObserverLoop({
			tabLeader,
			txObserver,
			intervalMs: INTERVAL,
			onLeadershipChange,
		});

		setLeader(true); // process (1)
		vi.advanceTimersByTime(INTERVAL); // process (2)
		expect(process).toHaveBeenCalledTimes(2);

		setLeader(false);
		expect(onLeadershipChange).toHaveBeenLastCalledWith(false);

		vi.advanceTimersByTime(INTERVAL * 5); // no more processing
		expect(process).toHaveBeenCalledTimes(2);
		stop();
	});

	it('stop() tears down the interval so no further processing happens', () => {
		const {tabLeader, setLeader} = makeLeaderStore(false);
		const {txObserver, process} = makeTxObserver();

		const stop = startTxObserverLoop({
			tabLeader,
			txObserver,
			intervalMs: INTERVAL,
		});

		setLeader(true); // process (1)
		expect(process).toHaveBeenCalledTimes(1);

		stop();
		vi.advanceTimersByTime(INTERVAL * 5);
		expect(process).toHaveBeenCalledTimes(1);
	});
});
