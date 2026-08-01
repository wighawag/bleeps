import {test, expect, describe} from '../fixtures/test';

describe('Home Page', () => {
	test('should display the icon', async ({page}) => {
		await page.goto('/');

		const icon = page.locator('img[alt="Bleeps"]');
		await expect(icon).toBeVisible();
	});

	test('should have a link to the editor', async ({page}) => {
		await page.goto('/');

		const editorButton = page.getByRole('link', {name: /compose a melody/i});
		await expect(editorButton).toBeVisible();
		await expect(editorButton).toHaveAttribute('href', /\/editor/);
	});
});

describe('Home Page - Navigation', () => {
	test('should navigate to the editor and back', async ({page}) => {
		await page.goto('/');

		const editorLink = page.getByRole('link', {name: /compose a melody/i});
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

		await expect(page.getByRole('heading', {name: /^bleeps$/i})).toBeVisible({
			timeout: 10000,
		});
	});
});
