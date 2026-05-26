import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { devDatabaseInspectionDisabledMessage, isDevDatabaseInspectionEnabled } from './devDbApi.ts';
import { isLocalDevDatabaseFeaturesEnabled } from './runtimeEnv.ts';

describe('devDbApi', () => {
	it('returns a stable disabled message for production guard', () => {
		assert.equal(
			devDatabaseInspectionDisabledMessage(),
			'Database inspection is only available in local development'
		);
	});

	it('matches runtimeEnv local-dev guard', () => {
		assert.equal(isDevDatabaseInspectionEnabled(), isLocalDevDatabaseFeaturesEnabled());
	});

	it('is disabled in production runtime', () => {
		const prev = process.env.NODE_ENV;
		process.env.NODE_ENV = 'production';
		try {
			assert.equal(isLocalDevDatabaseFeaturesEnabled('postgres://localhost/dev'), false);
		} finally {
			process.env.NODE_ENV = prev;
		}
	});
});
