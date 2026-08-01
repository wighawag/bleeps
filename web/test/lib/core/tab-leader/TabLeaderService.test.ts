import {describe, it, expect, beforeEach, afterEach, vi} from 'vitest';
import {get} from 'svelte/store';

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
	getItem: (key: string) => store[key] ?? null,
	setItem: (key: string, value: string) => {
		store[key] = value;
	},
	removeItem: (key: string) => {
		delete store[key];
	},
};
Object.defineProperty(globalThis, 'localStorage', {
	value: localStorageMock,
	writable: true,
});

function clearStore() {
	for (const key of Object.keys(store)) {
		delete store[key];
	}
}

// Mock BroadcastChannel
type MessageHandler = ((event: MessageEvent) => void) | null;

class MockBroadcastChannel {
	static instances: MockBroadcastChannel[] = [];
	name: string;
	onmessage: MessageHandler = null;
	closed = false;

	constructor(name: string) {
		this.name = name;
		MockBroadcastChannel.instances.push(this);
	}

	postMessage(data: unknown) {
		if (this.closed) return;
		// Deliver to all other instances with the same channel name
		for (const instance of MockBroadcastChannel.instances) {
			if (
				instance !== this &&
				instance.name === this.name &&
				!instance.closed &&
				instance.onmessage
			) {
				instance.onmessage(new MessageEvent('message', {data}));
			}
		}
	}

	close() {
		this.closed = true;
		const idx = MockBroadcastChannel.instances.indexOf(this);
		if (idx >= 0) MockBroadcastChannel.instances.splice(idx, 1);
	}

	static reset() {
		MockBroadcastChannel.instances = [];
	}
}

Object.defineProperty(globalThis, 'BroadcastChannel', {
	value: MockBroadcastChannel,
	writable: true,
});

// Mock crypto.randomUUID
let uuidCounter = 0;
vi.stubGlobal('crypto', {
	randomUUID: () => `test-uuid-${++uuidCounter}`,
});

import {createTabLeaderService} from '$lib/core/tab-leader';

describe('TabLeaderService', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		clearStore();
		MockBroadcastChannel.reset();
		uuidCounter = 0;
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('becomes leader on start when no other tabs exist', () => {
		const service = createTabLeaderService();
		service.start();

		expect(get(service.isLeader)).toBe(true);

		service.stop();
	});

	it('stops being leader on stop', () => {
		const service = createTabLeaderService();
		service.start();
		expect(get(service.isLeader)).toBe(true);

		service.stop();
		expect(get(service.isLeader)).toBe(false);
	});

	it('resolves leadership conflict between two tabs deterministically', () => {
		const service1 = createTabLeaderService();
		service1.start();
		expect(get(service1.isLeader)).toBe(true);

		const service2 = createTabLeaderService();
		service2.start();

		// One should be leader, one should not
		const leader1 = get(service1.isLeader);
		const leader2 = get(service2.isLeader);
		expect(leader1 !== leader2).toBe(true);

		service1.stop();
		service2.stop();
	});

	it('follower becomes leader on LEADER_RESIGN via graceful stop', () => {
		const service1 = createTabLeaderService();
		service1.start();

		const service2 = createTabLeaderService();
		service2.start();

		// Determine which is leader, which is follower
		const s1IsLeader = get(service1.isLeader);
		const leader = s1IsLeader ? service1 : service2;
		const follower = s1IsLeader ? service2 : service1;

		expect(get(leader.isLeader)).toBe(true);
		expect(get(follower.isLeader)).toBe(false);

		// Leader resigns gracefully (broadcasts LEADER_RESIGN)
		leader.stop();

		// Advance past the election debounce (100ms) - fast path
		vi.advanceTimersByTime(150);

		expect(get(follower.isLeader)).toBe(true);

		follower.stop();
	});

	it('follower becomes leader after timeout when leader crashes (no LEADER_RESIGN)', () => {
		const service1 = createTabLeaderService();
		service1.start();

		const service2 = createTabLeaderService();
		service2.start();

		// Determine which is leader, which is follower
		const s1IsLeader = get(service1.isLeader);
		const leaderChannelIdx = s1IsLeader ? 0 : 1;
		const follower = s1IsLeader ? service2 : service1;

		expect(get(follower.isLeader)).toBe(false);

		// Simulate leader crash:
		// 1. Close its BroadcastChannel (prevents LEADER_RESIGN from being sent)
		// 2. Remove lock from localStorage (simulates stale lock after crash)
		// In production, the lock would become stale after STALE_THRESHOLD (6s)
		// We remove it directly to isolate testing the timeout detection path
		const leaderChannel = MockBroadcastChannel.instances[leaderChannelIdx];
		leaderChannel.close();
		localStorage.removeItem('tx-observer-leader-lock');

		// Follower should NOT be leader yet (hasn't timed out)
		expect(get(follower.isLeader)).toBe(false);

		// Advance time but not past timeout - follower still waiting
		vi.advanceTimersByTime(3000);
		expect(get(follower.isLeader)).toBe(false);

		// Advance past leader timeout (5s total) + election debounce (100ms)
		vi.advanceTimersByTime(2200);

		// Now follower should have detected timeout and claimed leadership
		expect(get(follower.isLeader)).toBe(true);

		follower.stop();
	});

	it('leader sends heartbeats on interval', () => {
		const service = createTabLeaderService();
		service.start();

		const channel = MockBroadcastChannel.instances[0];
		const spy = vi.spyOn(channel, 'postMessage');

		// Advance one heartbeat interval
		vi.advanceTimersByTime(2000);

		const heartbeats = spy.mock.calls.filter(
			(call) => (call[0] as {type: string}).type === 'LEADER_HEARTBEAT',
		);
		expect(heartbeats.length).toBeGreaterThanOrEqual(1);

		service.stop();
	});

	it('cleans up BroadcastChannel on stop', () => {
		const service = createTabLeaderService();
		service.start();

		expect(MockBroadcastChannel.instances.length).toBe(1);

		service.stop();

		expect(MockBroadcastChannel.instances.length).toBe(0);
	});

	it('falls back to always-leader when BroadcastChannel unavailable', () => {
		const originalBC = globalThis.BroadcastChannel;
		// @ts-expect-error - removing BroadcastChannel
		delete globalThis.BroadcastChannel;
		Object.defineProperty(globalThis, 'BroadcastChannel', {
			value: undefined,
			writable: true,
			configurable: true,
		});

		const service = createTabLeaderService();
		service.start();
		expect(get(service.isLeader)).toBe(true);

		service.stop();

		Object.defineProperty(globalThis, 'BroadcastChannel', {
			value: originalBC,
			writable: true,
			configurable: true,
		});
	});

	it('subscribers are notified of leadership changes', () => {
		const service = createTabLeaderService();
		const values: boolean[] = [];
		service.isLeader.subscribe((v) => values.push(v));

		service.start();
		service.stop();

		// Should have: initial false, true on start, false on stop
		expect(values).toContain(true);
		expect(values[values.length - 1]).toBe(false);
	});

	it('broadcasts LEADER_RESIGN on graceful stop', () => {
		const service = createTabLeaderService();
		service.start();

		const channel = MockBroadcastChannel.instances[0];
		const spy = vi.spyOn(channel, 'postMessage');

		service.stop();

		const resignMessages = spy.mock.calls.filter(
			(call) => (call[0] as {type: string}).type === 'LEADER_RESIGN',
		);
		expect(resignMessages.length).toBe(1);
	});

	it('follower starts election immediately on LEADER_RESIGN', () => {
		const service1 = createTabLeaderService();
		service1.start();

		const service2 = createTabLeaderService();
		service2.start();

		// Determine which is leader, which is follower
		const s1IsLeader = get(service1.isLeader);
		const leader = s1IsLeader ? service1 : service2;
		const follower = s1IsLeader ? service2 : service1;

		expect(get(leader.isLeader)).toBe(true);
		expect(get(follower.isLeader)).toBe(false);

		// Leader resigns gracefully
		leader.stop();

		// Advance past the election debounce (100ms)
		vi.advanceTimersByTime(150);

		// Follower should now be leader (much faster than the 5s timeout)
		expect(get(follower.isLeader)).toBe(true);

		follower.stop();
	});
});
