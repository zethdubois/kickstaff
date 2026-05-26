import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isLocalDevDatabaseFeaturesEnabled } from './runtimeEnv.ts';

describe('runtimeEnv (database inspection guard)', () => {
	it('is enabled in non-production when dev URL is configured', () => {
		const prev = process.env.NODE_ENV;
		process.env.NODE_ENV = 'development';
		try {
			assert.equal(isLocalDevDatabaseFeaturesEnabled('postgres://localhost:5043/publicweb_dev'), true);
		} finally {
			process.env.NODE_ENV = prev;
		}
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

	it('is disabled when dev URL is missing', () => {
		const prev = process.env.NODE_ENV;
		const prevDev = process.env.DATABASE_URL_DEV;
		process.env.NODE_ENV = 'development';
		delete process.env.DATABASE_URL_DEV;
		try {
			assert.equal(isLocalDevDatabaseFeaturesEnabled(), false);
		} finally {
			process.env.NODE_ENV = prev;
			if (prevDev !== undefined) process.env.DATABASE_URL_DEV = prevDev;
		}
	});
});
