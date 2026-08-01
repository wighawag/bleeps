/**
 * Accounts the burner wallet is allowed to impersonate in local/dev setups.
 *
 * Single source of truth: the app wiring (`context/index.ts`) configures the
 * burner wallet with these, and the e2e fixtures fund/impersonate the same set.
 * Keep it here so the app and the tests never drift.
 */
export const IMPERSONATE_ADDRESSES = [
	'0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // vitalik.eth
	'0xF78cD306b23031dE9E739A5BcDE61764e82AD5eF',
] as const;
