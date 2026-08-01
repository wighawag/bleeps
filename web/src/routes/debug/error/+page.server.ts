import {error, redirect} from '@sveltejs/kit';
import {dev} from '$app/environment';
import type {PageServerLoad} from './$types';

/**
 * Debug route for testing error page rendering.
 *
 * Usage:
 * - /debug/error?status=404 → Throws 404 error
 * - /debug/error?status=500 → Throws 500 error
 * - /debug/error?status=403 → Throws 403 error
 * - /debug/error?status=401 → Throws 401 error
 * - /debug/error?status=418 → Throws 418 "I'm a teapot" error
 * - /debug/error?message=Custom%20message → Custom error message
 *
 * Default: Shows a page with links to test various scenarios
 */
export const load: PageServerLoad = async ({url}) => {
	// Only allow in development mode
	if (!dev) {
		redirect(302, '/');
	}

	const status = url.searchParams.get('status');
	const message = url.searchParams.get('message');

	if (status) {
		const statusCode = parseInt(status, 10);

		if (isNaN(statusCode) || statusCode < 400 || statusCode > 599) {
			error(400, {
				message: `Invalid status code: ${status}. Must be between 400-599.`,
			});
		}

		const defaultMessages: Record<number, string> = {
			400: 'Bad Request',
			401: 'Unauthorized - Please log in',
			403: 'Access Denied - You do not have permission',
			404: 'Page Not Found - The requested resource does not exist',
			418: "I'm a teapot - The server refuses to brew coffee",
			429: 'Too Many Requests - Please slow down',
			500: 'Internal Server Error - Something went wrong on our end',
			502: 'Bad Gateway - Invalid response from upstream server',
			503: 'Service Unavailable - Please try again later',
			504: 'Gateway Timeout - Upstream server took too long',
		};

		error(statusCode, {
			message:
				message || defaultMessages[statusCode] || `HTTP ${statusCode} Error`,
		});
	}

	// If no status param, return data for the test page
	return {
		availableErrors: [
			{status: 400, label: 'Bad Request'},
			{status: 401, label: 'Unauthorized'},
			{status: 403, label: 'Forbidden'},
			{status: 404, label: 'Not Found'},
			{status: 418, label: "I'm a Teapot"},
			{status: 429, label: 'Too Many Requests'},
			{status: 500, label: 'Internal Server Error'},
			{status: 502, label: 'Bad Gateway'},
			{status: 503, label: 'Service Unavailable'},
			{status: 504, label: 'Gateway Timeout'},
		],
	};
};
