import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	devAdminBypassPasswordFromEnv,
	isDevAdminBypassLoginWithPassword
} from './devAuthBypassCore.ts';

describe('devAuthBypass', () => {
	it('returns no bypass password in production', () => {
		assert.equal(
			devAdminBypassPasswordFromEnv({ ADMIN_PASSWORD: 'secret' }, true),
			undefined
		);
	});

	it('reads ADMIN_PASSWORD in development', () => {
		assert.equal(
			devAdminBypassPasswordFromEnv({ ADMIN_PASSWORD: 'dev-master' }, false),
			'dev-master'
		);
	});

	it('prefers DEV_ADMIN_BYPASS_PASSWORD over ADMIN_PASSWORD', () => {
		assert.equal(
			devAdminBypassPasswordFromEnv(
				{ ADMIN_PASSWORD: 'seed-only', DEV_ADMIN_BYPASS_PASSWORD: 'override' },
				false
			),
			'override'
		);
	});

	it('accepts admin login when bypass password matches', () => {
		assert.equal(
			isDevAdminBypassLoginWithPassword(
				'dev-master',
				{ role: 'admin', email: 'a@example.com' },
				'dev-master'
			),
			true
		);
	});

	it('rejects non-admin users', () => {
		assert.equal(
			isDevAdminBypassLoginWithPassword(
				'dev-master',
				{ role: 'user', email: 'u@example.com' },
				'dev-master'
			),
			false
		);
	});
});
