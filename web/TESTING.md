# Testing Guide

This document describes how to run and write tests for the web application.

## Test Types

### Unit Tests (Vitest)

Unit tests run in isolation and test individual functions, stores, and components.

- **Location**: `test/` directory
- **Pattern**: `**/*.{test,spec}.{js,ts}` (server-side), `**/*.svelte.{test,spec}.{js,ts}` (browser)
- **Framework**: [Vitest](https://vitest.dev/) with [@vitest/browser-playwright](https://vitest.dev/guide/browser/) for component tests

### E2E Tests (Playwright)

End-to-end tests run against the full application with a real Ethereum node.

- **Location**: `e2e/tests/` directory
- **Pattern**: `**/*.e2e.ts`
- **Framework**: [Playwright](https://playwright.dev/)

## Running Tests

### Quick Commands

```bash
# Run all tests (unit + e2e)
pnpm test

# Run only unit tests
pnpm test:unit

# Run only e2e tests
pnpm test:e2e

# Run e2e tests with UI
pnpm test:e2e:ui

# Run e2e tests in debug mode
pnpm test:e2e:debug

# Run e2e tests in headed mode (visible browser)
pnpm test:e2e:headed
```

### Unit Tests in Watch Mode

During development, you can run tests in watch mode:

```bash
pnpm test:unit
```

This will re-run tests when files change.

## E2E Test Architecture

### Global Setup/Teardown

E2E tests automatically handle:

1. **Starting Hardhat Node**: A local Ethereum node starts on port 8545
2. **Contract Deployment**: Contracts are compiled and deployed to localhost
3. **Export Deployments**: Contract addresses/ABIs are exported to the web app
4. **Build Web App**: The SvelteKit app is built for localhost
5. **Cleanup**: Node is stopped after tests complete

### Test Fixtures

Tests can use custom fixtures for common operations:

```typescript
import {test, expect} from '../fixtures/test';

// Using connectedPage fixture - wallet is pre-connected
test('submit greeting', async ({connectedPage}) => {
	await connectedPage.getByPlaceholder('Enter your greeting...').fill('Hello!');
	await connectedPage.getByRole('button', {name: /send/i}).click();
	// ...
});

// Manual wallet connection
test('connect manually', async ({page, connectWallet}) => {
	await page.goto('/demo');
	// ... trigger connection modal ...
	await connectWallet(page);
});

// Wait for transactions
test('wait for tx', async ({connectedPage, waitForTransaction}) => {
	// Submit something
	await waitForTransaction(connectedPage);
});
```

## Writing Tests

### Unit Test Example

```typescript
// test/lib/mymodule.test.ts
import {describe, it, expect, vi} from 'vitest';
import {myFunction} from '$lib/mymodule';

describe('myFunction', () => {
	it('should do something', () => {
		expect(myFunction()).toBe(true);
	});
});
```

### Component Test Example

Component tests run in a real browser (the `client` project). Name them
`*.svelte.test.ts` so Vitest routes them to the browser project. Prefer
components with deterministic, prop-driven rendering (display components);
leave wallet-connect / tx-submission / funds-modal flows to E2E.

```typescript
// test/lib/core/ui/ethereum/Address.svelte.test.ts
import {describe, it, expect, vi} from 'vitest';
import {render} from 'vitest-browser-svelte';

// SvelteKit's generated `$env/*` modules are not available in the raw browser
// test runtime. If the component (or its import chain) reads them, stub them:
vi.mock('$env/dynamic/public', () => ({env: {}}));
vi.mock('$env/static/public', () => ({PUBLIC_USE_INTERNAL_EXPLORER: 'true'}));

import Address from '$lib/core/ui/ethereum/Address.svelte';

describe('Address.svelte', () => {
	it('truncates the address by default', async () => {
		const screen = render(Address, {
			value: '0x1234567890abcdef1234567890abcdef12345678',
		});
		await expect.element(screen.getByText('0x1234...5678')).toBeInTheDocument();
	});
});
```

### E2E Test Example

```typescript
// e2e/tests/mypage.e2e.ts
import {test, expect, describe} from '../fixtures/test';

describe('My Page', () => {
	test('should display title', async ({page}) => {
		await page.goto('/mypage');
		await expect(page.getByRole('heading')).toContainText('My Title');
	});

	test('should interact with wallet', async ({connectedPage}) => {
		// connectedPage already has wallet connected
		await connectedPage.getByRole('button', {name: 'Submit'}).click();
		// ...
	});
});
```

### Best Practices

1. **Use semantic selectors**: Prefer `getByRole`, `getByText`, `getByPlaceholder` over CSS selectors
2. **Avoid arbitrary waits**: Use `waitFor` with conditions instead of `waitForTimeout`
3. **Test user flows**: E2E tests should mimic real user behavior
4. **Isolate tests**: Each test should be independent
5. **Generate unique data**: Use timestamps for unique test data

## Test Configuration

### Playwright Config

See `playwright.config.ts` for full configuration including:

- Test directory and patterns
- Browser settings (Chromium by default)
- Timeouts (60s for tests, 10s for assertions)
- Retry configuration
- Report generation

### Vitest Config

See `vite.config.ts` for test configuration including:

- Browser vs server test projects
- Require assertions mode
- Include/exclude patterns

## CI/CD

Tests run automatically on GitHub Actions:

- **Push to main**: All tests run
- **Pull requests**: All tests run

The workflow includes:

1. **Unit Tests**: Fast, run in parallel
2. **E2E Tests**: Starts Hardhat node, deploys contracts, runs browser tests
3. **Contract Tests**: Solidity tests via Hardhat

### Artifacts

- Playwright HTML report is uploaded for all runs
- Test traces are uploaded on failure for debugging

## Troubleshooting

### E2E tests failing to start node

If the Hardhat node fails to start:

1. Check if port 8545 is already in use: `lsof -i :8545`
2. Kill any existing processes: `pkill -f "hardhat node"`
3. Try running manually: `pnpm contracts:node:local`

### Tests timing out

Blockchain operations can be slow. If tests time out:

1. Increase timeout in `playwright.config.ts`
2. Check if the node is responding: `curl -X POST http://localhost:8545`
3. Check logs in CI artifacts

### Wallet connection failing

If wallet connection fails in tests:

1. Ensure the app is built for localhost: `pnpm build localhost`
2. Check that `PUBLIC_USE_BURNER_WALLET` is set in `.env.localhost`
3. Verify the Dev Mode button appears in the connection modal
