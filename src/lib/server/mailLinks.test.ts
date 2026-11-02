import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { absoluteAppPath, appOrigin, normalizeSiteBase } from './mailLinks.ts';

describe('mail links', () => {
	it('strips wrapping quotes and a trailing slash', () => {
		assert.equal(
			normalizeSiteBase('"https://kickstaff-staging.up.railway.app/"'),
			'https://kickstaff-staging.up.railway.app'
		);
	});

	it('prefers the request origin over PUBLIC_BASE_URL', () => {
		assert.equal(
			appOrigin('https://kickstaff-staging.up.railway.app', 'https://www.kickassetmanagement.com'),
			'https://kickstaff-staging.up.railway.app'
		);
	});

	it('falls back to the public base, then a relative path', () => {
		assert.equal(
			absoluteAppPath('/reset-password?token=abc', undefined, 'https://www.example.com'),
			'https://www.example.com/reset-password?token=abc'
		);
		assert.equal(absoluteAppPath('/reset-password?token=abc'), '/reset-password?token=abc');
	});
});
