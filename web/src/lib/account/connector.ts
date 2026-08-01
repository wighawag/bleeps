/**
 * A connector wires some external source (a wallet client, a tx observer, an
 * account-data map) to a sink, for the lifetime between `connect()` and
 * `disconnect()`.
 *
 * `createConnector` owns the repetitive lifecycle bookkeeping so each connector
 * only has to describe its wiring: `setup()` registers listeners and returns a
 * single teardown. `connect()` is idempotent (it disconnects first), and
 * `disconnect()` is safe to call when not connected.
 */
export type Connector = {
	connect(): void;
	disconnect(): void;
};

/** Combine several unsubscribe callbacks into one teardown. */
export function combineTeardowns(
	teardowns: Array<(() => void) | undefined>,
): () => void {
	return () => {
		for (const teardown of teardowns) teardown?.();
	};
}

export function createConnector(setup: () => () => void): Connector {
	let teardown: (() => void) | undefined;

	function disconnect() {
		teardown?.();
		teardown = undefined;
	}

	function connect() {
		disconnect();
		teardown = setup();
	}

	return {connect, disconnect};
}
