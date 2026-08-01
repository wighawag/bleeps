import {LOCK_KEY, STALE_THRESHOLD} from './constants';

export type LockData = {
	tabId: string;
	timestamp: number;
};

/**
 * Attempts to acquire the leader lock for the given tab.
 *
 * Note: The read-check-write pattern here is not atomic (TOCTOU race).
 * On a fresh page load with multiple tabs starting simultaneously, all could read
 * "no lock", all could write their own lock, and all briefly become leaders.
 * This is intentional and safe because the BroadcastChannel conflict resolution
 * in TabLeaderService will quickly resolve any dual-leader situation.
 */
export function acquireLock(tabId: string): boolean {
	const now = Date.now();
	const existing = readLock();

	if (existing && existing.tabId !== tabId) {
		// Another tab holds the lock — check if it's still alive
		// A lock is considered stale if not refreshed within the threshold
		if (now - existing.timestamp < STALE_THRESHOLD) {
			return false;
		}
	}

	writeLock({tabId, timestamp: now});
	return true;
}

export function refreshLock(tabId: string): boolean {
	const existing = readLock();
	if (!existing || existing.tabId !== tabId) {
		return false;
	}
	writeLock({tabId, timestamp: Date.now()});
	return true;
}

export function releaseLock(tabId: string): void {
	const existing = readLock();
	if (existing && existing.tabId === tabId) {
		try {
			localStorage.removeItem(LOCK_KEY);
		} catch {
			// Ignore storage errors
		}
	}
}

export function readLock(): LockData | undefined {
	try {
		const raw = localStorage.getItem(LOCK_KEY);
		if (!raw) return undefined;
		return JSON.parse(raw) as LockData;
	} catch {
		return undefined;
	}
}

function writeLock(data: LockData): void {
	try {
		localStorage.setItem(LOCK_KEY, JSON.stringify(data));
	} catch {
		// Ignore storage errors
	}
}
