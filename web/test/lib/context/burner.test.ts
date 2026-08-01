import {describe, it, expect} from 'vitest';
import {
	parseBurnerParam,
	resolveBurnerWallet,
} from '../../../src/lib/context/burner';

describe('parseBurnerParam', () => {
	it('is undefined when the param is absent', () => {
		expect(parseBurnerParam(undefined)).toBeUndefined();
	});

	it('treats false-ish values as false', () => {
		for (const v of ['false', '0', 'off', 'no', 'FALSE', 'Off']) {
			expect(parseBurnerParam(v)).toBe(false);
		}
	});

	it('treats true-ish values (and bare presence) as true', () => {
		for (const v of ['true', '1', 'on', 'yes', '', 'TRUE']) {
			expect(parseBurnerParam(v)).toBe(true);
		}
	});

	it('treats unrecognised values as present => true', () => {
		expect(parseBurnerParam('maybe')).toBe(true);
	});
});

describe('resolveBurnerWallet', () => {
	it('param=false always disables (no error)', () => {
		expect(
			resolveBurnerWallet(false, 'http://localhost:8545', 'http://node'),
		).toEqual({use: false});
		expect(resolveBurnerWallet(false, 'true', 'http://node')).toEqual({
			use: false,
		});
	});

	it('no param, env is an http url: enabled, points at that url', () => {
		expect(
			resolveBurnerWallet(undefined, 'http://localhost:8545', undefined),
		).toEqual({use: true, nodeURL: 'http://localhost:8545'});
	});

	it('no param, env truthy + fallback node url: enabled, points at node url', () => {
		expect(resolveBurnerWallet(undefined, 'true', 'http://node')).toEqual({
			use: true,
			nodeURL: 'http://node',
		});
	});

	it('no param, env truthy but no node url: disabled (no error)', () => {
		expect(resolveBurnerWallet(undefined, 'true', undefined)).toEqual({
			use: false,
		});
	});

	it('no param, env unset: disabled (no error)', () => {
		expect(resolveBurnerWallet(undefined, undefined, 'http://node')).toEqual({
			use: false,
		});
		expect(resolveBurnerWallet(undefined, '', 'http://node')).toEqual({
			use: false,
		});
	});

	it('param=true opts in when a node url is available', () => {
		expect(
			resolveBurnerWallet(true, 'http://localhost:8545', undefined),
		).toEqual({use: true, nodeURL: 'http://localhost:8545'});
		expect(resolveBurnerWallet(true, 'true', 'http://node')).toEqual({
			use: true,
			nodeURL: 'http://node',
		});
	});

	it('param=true errors when the app cannot honour it (no node url)', () => {
		const r1 = resolveBurnerWallet(true, 'true', undefined);
		expect(r1.use).toBe(false);
		expect(r1).toHaveProperty('error');

		const r2 = resolveBurnerWallet(true, undefined, undefined);
		expect(r2.use).toBe(false);
		expect(r2).toHaveProperty('error');
	});
});
