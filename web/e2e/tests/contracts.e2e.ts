import {test, expect, describe} from '../fixtures/test';

describe('Contracts Page', () => {
	test('should show contract selection dropdown', async ({page}) => {
		await page.goto('/contracts');

		// The contract selector should be visible
		const selector = page
			.getByRole('combobox')
			.or(page.locator('[class*="select"]').first());
		await expect(selector).toBeVisible({timeout: 5000});
	});

	test('should display Bleeps contract by default', async ({page}) => {
		await page.goto('/contracts');

		// Should show the Bleeps contract (as button or heading)
		await expect(page.getByText('Bleeps').first()).toBeVisible({
			timeout: 5000,
		});
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

		// Should list Bleeps' own view functions
		await expect(
			page.getByText('owners').first().or(page.getByText('tokenURI').first()),
		).toBeVisible({timeout: 5000});
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
