import {test, expect, describe} from '../fixtures/test';

describe('Contracts Page', () => {
	test('should show contract selection dropdown', async ({page}) => {
		await page.goto('/contracts');

		// Addressed by an explicit hook. The fallback this used to carry matched on
		// a Tailwind class substring (`[class*="select"]`), which pins the test to
		// styling rather than to the control, and put `.first()` on only one branch
		// of the `.or()` - leaving the combined locator free to match both. That
		// fallback was also the only reason the test passed: the trigger renders as
		// a plain button, so the `getByRole('combobox')` branch never matched.
		await expect(page.getByTestId('contract-selector')).toBeVisible({
			timeout: 5000,
		});
	});

	test('should display Bleeps contract by default', async ({page}) => {
		await page.goto('/contracts');

		// The selected contract's own heading, not merely the string "Bleeps"
		// somewhere on the page: `getByText('Bleeps').first()` matched the navbar's
		// tab label, which is hidden, so the assertion failed on an element the test
		// was never about.
		await expect(
			page.getByRole('heading', {name: 'Bleeps', level: 2}),
		).toBeVisible({timeout: 5000});
	});

	test('should display contract address', async ({page}) => {
		await page.goto('/contracts');

		// Should show an Ethereum address (0x...)
		const addressElement = page.locator('text=/0x[a-fA-F0-9]{4,}/');
		await expect(addressElement.first()).toBeVisible({timeout: 5000});
	});

	test('should have Read and Write tabs', async ({page}) => {
		await page.goto('/contracts');

		// Should have Read and Write tabs
		await expect(page.getByRole('tab', {name: 'Read'})).toBeVisible({
			timeout: 5000,
		});
		await expect(page.getByRole('tab', {name: 'Write'})).toBeVisible();
	});

	test('should display view functions in Read tab', async ({page}) => {
		await page.goto('/contracts');

		// Wait for Read tab to be visible and click it
		const readTab = page.getByRole('tab', {name: 'Read'});
		await expect(readTab).toBeVisible({timeout: 5000});
		await readTab.click();

		// Should show "View Functions" heading
		await expect(
			page.getByRole('heading', {name: 'View Functions'}),
		).toBeVisible({timeout: 5000});

		// Should list Bleeps' own view functions, addressed by the function name
		// rather than by page text. Two things were wrong before: the card title
		// renders "<name> <stateMutability>", so `getByText('owners')` matched
		// several cards, and `.first()` sat on each BRANCH of the `.or()` instead of
		// on the combined locator - which still resolves to both and trips strict
		// mode. `.first()` has to go last.
		const owners = page.locator(
			'[data-testid="contract-function"][data-function-name="owners"]',
		);
		const tokenURI = page.locator(
			'[data-testid="contract-function"][data-function-name="tokenURI"]',
		);
		await expect(owners.or(tokenURI).first()).toBeVisible({timeout: 5000});
	});

	test('should display write functions in Write tab', async ({page}) => {
		await page.goto('/contracts');

		const writeTab = page.getByRole('tab', {name: 'Write'});
		await expect(writeTab).toBeVisible({timeout: 5000});
		await writeTab.click();

		// `transferFrom` is on every ERC721 and needs no sale or minter role
		await expect(page.getByText('transferFrom').first()).toBeVisible({
			timeout: 5000,
		});
	});
});
