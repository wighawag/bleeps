/**
 * Solidity lint config.
 *
 * The contracts under `src/` are, with one exception, FROZEN: Bleeps, its
 * tokenURI renderer and the DAO are live on mainnet and cannot be redeployed,
 * and MeloBleeps is live on Sepolia. `pnpm verify:bytecode` enforces that they
 * still compile to the deployed code, so any lint rule they violate is a rule
 * that can never be satisfied.
 *
 * Turning those on anyway would put 110 permanent errors in front of every
 * `pnpm lint`, which is the same as having no linter. So each rule below is
 * either on (the frozen code already passes it, so it guards new code) or off
 * with the count of existing violations and why they cannot be fixed.
 *
 * If a contract is ever unfrozen, re-enable the relevant rules first and clean
 * up as part of that work.
 */
export default [
	{
		rules: {
			'compatible-pragma': 'error',
			'id-denylist': 'error',
			'imports-on-top': 'error',
			'named-return-params': 'error',
			'naming-convention': 'off',
			'no-console': 'error',
			'no-duplicate-imports': 'error',
			'no-restricted-syntax': 'error',
			'no-tx-origin': 'error',
			'no-unchecked-calls': 'error',
			'no-uninitialized-immutable-references': 'error',
			'private-vars': 'off',
			'sort-imports': 'off',
			'sort-members': 'off',
			'sort-modifiers': 'error',

			// 52 violations. The codebase predates the convention and uses
			// `import "..."` throughout. Purely stylistic, and touching an import
			// changes the metadata hash of a deployed contract.
			'no-global-imports': 'off',

			// 18 violations: `uint`/`int` rather than `uint256`/`int256`.
			'explicit-types': 'off',

			// 10 violations, all state variables that are deliberately internal by
			// omission in the frozen contracts.
			'no-default-visibility': 'off',

			// 9 violations. `.transfer`/`.send` with their 2300 gas stipend is a real
			// hazard, and MeloBleepsAuctions is built around it: that is exactly why
			// it holds a WETH address, to fall back on when a payout to a contract
			// fails. Cannot be changed in deployed code.
			'no-send': 'off',

			// 7 violations, all interface implementations that must keep the
			// parameter names of the function they override.
			'no-unused-vars': 'off',

			// 5 violations in the frozen contracts.
			'require-revert-reason': 'off',

			// 3 violations: the OpenSea proxy and ENS interfaces are declared
			// alongside the contracts that use them.
			'one-contract-per-file': 'off',

			// 2 violations: empty constructors/receive functions that must stay.
			'no-empty-blocks': 'off',

			// 2 violations. Bleeps' and MeloBleeps' tokenURI renderers hold the
			// waveform tables as state; that is the whole design.
			'max-state-vars': 'off',

			// 2 violations, single-statement ifs without braces.
			curly: 'off',
		},
	},
	{
		// Test files. A test suite routinely needs small contracts alongside it -
		// a harness that exposes an abstract contract's internals, a stub that
		// misbehaves on purpose - and they are only meaningful next to the tests
		// that use them. Splitting them into files of their own would scatter the
		// suite without making anything easier to find.
		files: ['**/*.t.sol'],
		rules: {
			'one-contract-per-file': 'off',
		},
	},
];
