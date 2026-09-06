import {test, expect, describe} from '../fixtures/test';

/**
 * THE APP'S NAME COMES FROM THE APP, not from a literal here.
 *
 * LITERALS HERE ON PURPOSE, unlike the template. `routes/+page.svelte` in this
 * repo does not read `web-config.json`: it declares its own
 * `const name = 'Bleeps and The Bleeps DAO'`, which is longer than the
 * `web-config.json` `name` ("Bleeps") the template's version reads. So the
 * literal below IS this app's single fact, and importing the config would
 * assert a name this page never renders.
 *
 * `routes/+page.svelte` renders `src/web-config.json`'s `name` as both the
 * icon's `alt` and the hero heading, so that file is the single fact and this
 * suite reads the same one. Spelling "Jolly Roger" out instead made these tests
 * assert the TEMPLATE's identity rather than the app's, which is invisible for
 * as long as a descendant keeps the inherited name and breaks the moment one
 * does the first thing anybody does with a template: rename it. `reveal-or-die`
 * renamed itself and inherited two failures that had nothing to do with its
 * home page, which rendered perfectly.
 */
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
