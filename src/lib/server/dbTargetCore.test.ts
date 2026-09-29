import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	getConfiguredDefaultTarget,
	getDefaultDbTarget,
	parseDbTarget,
	resolveConnectionStringFromEnv,
	type DbTargetEnv
} from './dbTargetCore.ts';

function env(overrides: Partial<DbTargetEnv> = {}): DbTargetEnv {
	return {
		nodeEnv: 'development',
		dbDefault: undefined,
		databaseUrlDev: 'postgresql://localhost:5043/kickstaff_dev',
		databaseUrl: 'postgresql://localhost/kickasset',
		...overrides
	};
}

describe('dbTargetCore', () => {
	it('parses dev and prod', () => {
		assert.equal(parseDbTarget('dev'), 'dev');
		assert.equal(parseDbTarget('prod'), 'prod');
		assert.equal(parseDbTarget('x'), null);
	});

	it('uses KICKSTAFF_DB_DEFAULT when set', () => {
		assert.equal(getDefaultDbTarget(env({ dbDefault: 'prod' })), 'prod');
		assert.equal(getDefaultDbTarget(env({ dbDefault: 'dev' })), 'dev');
	});

	it('infers dev when only DATABASE_URL_DEV is set', () => {
		assert.equal(
			getDefaultDbTarget(
				env({
					dbDefault: undefined,
					databaseUrlDev: 'postgresql://localhost:5043/dev_only',
					databaseUrl: undefined
				})
			),
			'dev'
		);
	});

	it('forces prod default in production even when KICKSTAFF_DB_DEFAULT=dev', () => {
		assert.equal(
			getDefaultDbTarget(
				env({
					nodeEnv: 'production',
					dbDefault: 'dev',
					databaseUrlDev: undefined
				})
			),
			'prod'
		);
	});

	it('rejects invalid KICKSTAFF_DB_DEFAULT', () => {
		assert.throws(() => getConfiguredDefaultTarget(env({ dbDefault: 'staging' })), /KICKSTAFF_DB_DEFAULT/);
	});

	it('resolves connection strings per target', () => {
		const e = env();
		assert.match(resolveConnectionStringFromEnv(e, 'prod'), /kickasset/);
		assert.match(resolveConnectionStringFromEnv(e, 'dev'), /kickstaff_dev/);
	});

	it('throws when prod target without DATABASE_URL', () => {
		assert.throws(
			() => resolveConnectionStringFromEnv(env({ databaseUrl: undefined }), 'prod'),
			/DATABASE_URL is not set/
		);
	});
});
