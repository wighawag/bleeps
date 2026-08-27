/**
 * The routes a smoke test walks. See the template's copy for why this is data
 * rather than literals in a suite.
 *
 * BLEEPS' LIST: `/bleeps/` stands in for the template's `/demo/`, which this app
 * replaced. That substitution is the whole reason this file is worth having
 * here: pointing an inherited suite at a route this app does not have does not
 * fail, it asserts against the 404 page and passes. This app has already been
 * bitten by exactly that once (see 4d09f4a1).
 */
export const SMOKE_ROUTES = [
	'/',
	'/bleeps/',
	'/transactions/',
	'/explorer/',
] as const;
