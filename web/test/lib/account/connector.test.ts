import {describe, it, expect, vi} from 'vitest';
import {createConnector, combineTeardowns} from '$lib/account/connector';

describe('createConnector', () => {
	it('runs setup on connect and its teardown on disconnect', () => {
		const teardown = vi.fn();
		const setup = vi.fn(() => teardown);
		const c = createConnector(setup);

		c.connect();
		expect(setup).toHaveBeenCalledTimes(1);
		expect(teardown).not.toHaveBeenCalled();

		c.disconnect();
		expect(teardown).toHaveBeenCalledTimes(1);
	});

	it('is idempotent on connect: reconnect tears down the previous wiring first', () => {
		const teardowns = [vi.fn(), vi.fn()];
		let i = 0;
		const setup = vi.fn(() => teardowns[i++]);
		const c = createConnector(setup);

		c.connect(); // wiring 0
		c.connect(); // should tear down 0, then wire 1
		expect(teardowns[0]).toHaveBeenCalledTimes(1);
		expect(teardowns[1]).not.toHaveBeenCalled();
		expect(setup).toHaveBeenCalledTimes(2);

		c.disconnect();
		expect(teardowns[1]).toHaveBeenCalledTimes(1);
	});

	it('disconnect is safe when never connected and idempotent', () => {
		const teardown = vi.fn();
		const c = createConnector(() => teardown);

		expect(() => c.disconnect()).not.toThrow();
		expect(teardown).not.toHaveBeenCalled();

		c.connect();
		c.disconnect();
		c.disconnect(); // second disconnect is a no-op
		expect(teardown).toHaveBeenCalledTimes(1);
	});
});

describe('combineTeardowns', () => {
	it('calls every teardown, skipping undefined', () => {
		const a = vi.fn();
		const b = vi.fn();
		const combined = combineTeardowns([a, undefined, b]);
		combined();
		expect(a).toHaveBeenCalledTimes(1);
		expect(b).toHaveBeenCalledTimes(1);
	});
});
