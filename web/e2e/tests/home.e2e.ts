import {test, expect, describe} from '../fixtures/test';

describe('Home Page', () => {
	test('should display the icon', async ({page}) => {
		await page.goto('/');

		const icon = page.locator('img[alt="Bleeps and The Bleeps DAO"]');
		await expect(icon).toBeVisible();
	});

	test('should have a link to the Bleeps page', async ({page}) => {
		await page.goto('/');

		const bleepsButton = page.getByRole('link', {name: /^bleeps( sale)?$/i});
		await expect(bleepsButton.first()).toBeVisible();
	});

	test('should keep the explainer graphics', async ({page}) => {
		await page.goto('/');

		// the four images the site has always led with
		for (const alt of ['Bleeps', 'Bleeper', 'Royalties', 'BleepsDAO']) {
			await expect(page.locator(`img[alt="${alt}"]`).first()).toBeVisible();
		}
	});
});

describe('Home Page - Navigation', () => {
	test('should navigate to the editor and back', async ({page}) => {
		await page.goto('/');

		const editorLink = page.getByRole('link', {name: /^editor$/i});
		await expect(editorLink).toBeVisible({timeout: 10000});

		// A click during SvelteKit hydration can be swallowed (the router installs
		// its handler mid-flight), so retry until the URL changes.
		await expect(async () => {
			await editorLink.click();
			await page.waitForURL(/editor/, {timeout: 3000});
		}).toPass({timeout: 15000});

		await expect(
			page.getByRole('heading', {name: /melody editor/i}),
		).toBeVisible({timeout: 10000});

		await page.goto('/');
		await page.waitForLoadState('load', {timeout: 15000});

		await expect(
			page.locator('img[alt="Bleeps and The Bleeps DAO"]'),
		).toBeVisible({timeout: 10000});
	});
});
