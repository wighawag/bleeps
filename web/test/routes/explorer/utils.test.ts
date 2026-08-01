import {describe, it, expect} from 'vitest';
import {
	classifySearchInput,
	formatBytecode,
	formatTransactionType,
	formatTxStatus,
	getEip1559FeeInfo,
	getLogAddresses,
	getTransactionTypeIcon,
	isContract,
	isValidAddress,
	isValidTxHash,
	truncateTxHash,
} from '../../../src/routes/explorer/lib/utils';
import type {Transaction, TransactionReceipt} from 'viem';

describe('formatTxStatus', () => {
	it('maps status to a human label', () => {
		expect(formatTxStatus('success')).toBe('Success');
		expect(formatTxStatus('reverted')).toBe('Failed');
	});
});

describe('isContract', () => {
	it('is false for empty code', () => {
		expect(isContract('0x')).toBe(false);
	});
	it('is true when bytecode is present', () => {
		expect(isContract('0x60006000')).toBe(true);
	});
});

describe('formatBytecode', () => {
	it('returns the code untouched when short enough', () => {
		expect(formatBytecode('0x1234', 200)).toBe('0x1234');
	});
	it('truncates long bytecode and reports length', () => {
		const code = ('0x' + 'ab'.repeat(200)) as `0x${string}`;
		const out = formatBytecode(code, 20);
		expect(out.startsWith('0x' + 'ab'.repeat(9))).toBe(true);
		expect(out).toContain(`(${code.length} bytes)`);
	});
});

describe('formatTransactionType', () => {
	it('maps known tx type hex to labels', () => {
		expect(formatTransactionType('0x0')).toBe('Legacy');
		expect(formatTransactionType('0x1')).toBe('EIP-2930');
		expect(formatTransactionType('0x2')).toBe('EIP-1559');
	});
	it('passes unknown types through', () => {
		expect(formatTransactionType('0x9')).toBe('0x9');
	});
});

describe('getTransactionTypeIcon', () => {
	it('uses the zap icon for EIP-1559', () => {
		expect(getTransactionTypeIcon('0x2')).toBe('ZapIcon');
		expect(getTransactionTypeIcon('EIP-1559')).toBe('ZapIcon');
	});
	it('falls back to the file icon otherwise', () => {
		expect(getTransactionTypeIcon('0x0')).toBe('FileTextIcon');
	});
});

describe('truncateTxHash', () => {
	it('keeps the 0x prefix, start chars and last 4', () => {
		const hash =
			'0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
		expect(truncateTxHash(hash)).toBe('0xabcdef01...6789');
	});
});

describe('getLogAddresses', () => {
	it('returns unique addresses preserving first-seen order', () => {
		const a = '0x1111111111111111111111111111111111111111';
		const b = '0x2222222222222222222222222222222222222222';
		const logs = [{address: a}, {address: b}, {address: a}] as any;
		expect(getLogAddresses(logs)).toEqual([a, b]);
	});
});

describe('classifySearchInput', () => {
	const tx = '0x' + 'a'.repeat(64);
	const addr = '0x' + '1'.repeat(40);

	it('classifies empty / tx / address / invalid', () => {
		expect(classifySearchInput('  ')).toEqual({kind: 'empty'});
		expect(classifySearchInput(tx)).toEqual({kind: 'tx', value: tx});
		expect(classifySearchInput(addr)).toEqual({kind: 'address', value: addr});
		expect(classifySearchInput('nope')).toEqual({kind: 'invalid'});
	});

	it('has consistent validators', () => {
		expect(isValidTxHash(tx)).toBe(true);
		expect(isValidTxHash(addr)).toBe(false);
		expect(isValidAddress(addr)).toBe(true);
		expect(isValidAddress(tx)).toBe(false);
	});
});

describe('getEip1559FeeInfo', () => {
	it('returns nulls for a legacy transaction', () => {
		const info = getEip1559FeeInfo(
			{type: 'legacy'} as Transaction,
			{effectiveGasPrice: 100n} as TransactionReceipt,
		);
		expect(info.isEIP1559).toBe(false);
		expect(info.maxPriorityFeePerGas).toBeNull();
		expect(info.baseFeeUsed).toBeNull();
	});

	it('derives base fee = effective - priority for EIP-1559', () => {
		const info = getEip1559FeeInfo(
			{
				type: 'eip1559',
				maxPriorityFeePerGas: 2n,
				maxFeePerGas: 50n,
			} as unknown as Transaction,
			{effectiveGasPrice: 30n} as TransactionReceipt,
		);
		expect(info.isEIP1559).toBe(true);
		expect(info.maxPriorityFeePerGas).toBe(2n);
		expect(info.maxFeePerGas).toBe(50n);
		expect(info.baseFeeUsed).toBe(28n);
	});

	it('leaves base fee null without a receipt', () => {
		const info = getEip1559FeeInfo(
			{
				type: 'eip1559',
				maxPriorityFeePerGas: 2n,
			} as unknown as Transaction,
			null,
		);
		expect(info.baseFeeUsed).toBeNull();
		expect(info.effectiveGasPrice).toBeNull();
	});
});
