/**
 * Shared constants for the tab-leader election system.
 *
 * These values are tightly coupled and must maintain their relationships:
 * - STALE_THRESHOLD must always be > LEADER_TIMEOUT to avoid premature lock stealing
 * - HEARTBEAT_INTERVAL should be < LEADER_TIMEOUT to ensure followers detect active leaders
 */

/** How often the leader sends heartbeats to followers */
export const HEARTBEAT_INTERVAL = 2000;

/** How long followers wait before considering the leader dead */
export const LEADER_TIMEOUT = 5000;

/** Debounce time before starting a new election (prevents rapid elections from multiple tabs) */
export const ELECTION_DEBOUNCE = 100;

/**
 * How long a lock in localStorage is considered valid before it can be stolen.
 * Must be > LEADER_TIMEOUT to allow sufficient time for heartbeat updates.
 */
export const STALE_THRESHOLD = LEADER_TIMEOUT + 1000;

/** BroadcastChannel name for leader election messages */
export const CHANNEL_NAME = 'tx-observer-leader';

/** localStorage key for the leader lock */
export const LOCK_KEY = 'tx-observer-leader-lock';
