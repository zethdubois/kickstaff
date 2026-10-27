import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	ALL_DB_TARGETS,
	deployTargetFromRailwayEnvironment,
	getDefaultDbTarget,
	isSessionIdleExpired,
	parseDbTarget,
	resolveConnectionStringFromEnv,
	resolveRequestTarget,
	sessionCookieName,
	sessionPolicyForTarget,
	toKickagentDbTarget,
	type DbTargetEnv
} from './dbTargetCore.ts';

function env(overrides: Partial<DbTargetEnv> = {}): DbTargetEnv {
	return {
		nodeEnv: 'development',
		railwayEnvironment: undefined,
		databaseUrlDev: 'postgresql://localhost:5043/kickstaff_dev',
		databaseUrlStaging: 'postgresql://localhost/kickstaff_staging',
		databaseUrl: 'postgresql://localhost/kickasset',
		...overrides
	};
}

describe('dbTargetCore', () => {
	it('parses dev, staging, and prod', () => {
		assert.equal(parseDbTarget('dev'), 'dev');
		assert.equal(parseDbTarget('staging'), 'staging');
		assert.equal(parseDbTarget('prod'), 'prod');
		assert.equal(parseDbTarget('x'), null);
	});

	it('infers dev when DATABASE_URL_DEV is set (no KICKSTAFF_DB_DEFAULT)', () => {
		assert.equal(getDefaultDbTarget(env()), 'dev');
		assert.equal(
			getDefaultDbTarget(
				env({
					databaseUrlDev: 'postgresql://localhost:5043/dev_only',
					databaseUrlStaging: undefined,
					databaseUrl: undefined
				})
			),
			'dev'
		);
	});

	it('falls back to prod locally when DATABASE_URL_DEV is unset', () => {
		assert.equal(
			getDefaultDbTarget(
				env({
					databaseUrlDev: undefined,
					databaseUrl: 'postgresql://localhost/kickasset'
				})
			),
			'prod'
		);
	});

	it('maps Railway environment name on production deploys', () => {
		assert.equal(deployTargetFromRailwayEnvironment('staging'), 'staging');
		assert.equal(deployTargetFromRailwayEnvironment('Staging'), 'staging');
		assert.equal(deployTargetFromRailwayEnvironment('kickstaff-staging'), 'staging');
		assert.equal(deployTargetFromRailwayEnvironment('production'), 'prod');
		assert.equal(deployTargetFromRailwayEnvironment(undefined), 'prod');

		assert.equal(
			getDefaultDbTarget(
				env({
					nodeEnv: 'production',
					railwayEnvironment: 'staging',
					databaseUrlDev: undefined,
					databaseUrlStaging: undefined
				})
			),
			'staging'
		);
		assert.equal(
			getDefaultDbTarget(
				env({
					nodeEnv: 'production',
					railwayEnvironment: 'production',
					databaseUrlDev: undefined
				})
			),
			'prod'
		);
	});

	it('resolves connection strings per target', () => {
		const e = env();
		assert.match(resolveConnectionStringFromEnv(e, 'prod'), /kickasset/);
		assert.match(resolveConnectionStringFromEnv(e, 'dev'), /kickstaff_dev/);
		assert.match(resolveConnectionStringFromEnv(e, 'staging'), /kickstaff_staging/);
	});

	it('uses DATABASE_URL for staging on a Railway staging deploy', () => {
		const e = env({
			nodeEnv: 'production',
			railwayEnvironment: 'staging',
			databaseUrlStaging: undefined,
			databaseUrl: 'postgresql://railway/staging_db'
		});
		assert.match(resolveConnectionStringFromEnv(e, 'staging'), /staging_db/);
	});

	it('throws when local staging target without DATABASE_URL_STAGING', () => {
		assert.throws(
			() =>
				resolveConnectionStringFromEnv(
					env({ databaseUrlStaging: undefined, nodeEnv: 'development' }),
					'staging'
				),
			/DATABASE_URL_STAGING is not set/
		);
	});

	it('throws when prod target without DATABASE_URL', () => {
		assert.throws(
			() => resolveConnectionStringFromEnv(env({ databaseUrl: undefined }), 'prod'),
			/DATABASE_URL is not set/
		);
	});

	it('maps staging to kickagent prod target', () => {
		assert.equal(toKickagentDbTarget('dev'), 'dev');
		assert.equal(toKickagentDbTarget('staging'), 'prod');
		assert.equal(toKickagentDbTarget('prod'), 'prod');
	});
});

describe('resolveRequestTarget', () => {
	const base = { switchingEnabled: true, pathname: '/', dbParam: null, cookie: null };

	it('falls back to the default with no cookie or param', () => {
		const r = resolveRequestTarget(env(), base);
		assert.equal(r.target, 'dev');
		assert.equal(r.setCookie, false);
	});

	it('uses the preference cookie', () => {
		assert.equal(resolveRequestTarget(env(), { ...base, cookie: 'staging' }).target, 'staging');
		assert.equal(resolveRequestTarget(env(), { ...base, cookie: 'prod' }).target, 'prod');
	});

	it('?db= wins on /login and asks to set the cookie', () => {
		const r = resolveRequestTarget(env(), {
			...base,
			pathname: '/login',
			dbParam: 'staging',
			cookie: 'dev'
		});
		assert.equal(r.target, 'staging');
		assert.equal(r.setCookie, true);
		assert.equal(r.dbParamRejected, false);
	});

	it('?db= does not ask to set the cookie when it already matches', () => {
		const r = resolveRequestTarget(env(), {
			...base,
			pathname: '/login',
			dbParam: 'dev',
			cookie: 'dev'
		});
		assert.equal(r.setCookie, false);
	});

	it('ignores ?db= on non-pre-auth paths', () => {
		const r = resolveRequestTarget(env(), {
			...base,
			pathname: '/ops/accounts',
			dbParam: 'prod',
			cookie: 'dev'
		});
		assert.equal(r.target, 'dev');
		assert.equal(r.dbParamRejected, false);
	});

	it('honors ?db= on forgot/reset password pages', () => {
		for (const pathname of ['/forgot-password', '/reset-password']) {
			assert.equal(
				resolveRequestTarget(env(), { ...base, pathname, dbParam: 'staging' }).target,
				'staging'
			);
		}
	});

	it('rejects unknown or unconfigured ?db= and keeps the cookie target', () => {
		const unknown = resolveRequestTarget(env(), {
			...base,
			pathname: '/login',
			dbParam: 'qa',
			cookie: 'staging'
		});
		assert.equal(unknown.target, 'staging');
		assert.equal(unknown.dbParamRejected, true);
		assert.equal(unknown.setCookie, false);

		const unconfigured = resolveRequestTarget(env({ databaseUrlStaging: undefined }), {
			...base,
			pathname: '/login',
			dbParam: 'staging',
			cookie: null
		});
		assert.equal(unconfigured.target, 'dev');
		assert.equal(unconfigured.dbParamRejected, true);
	});

	it('never selects an unconfigured target from the cookie', () => {
		const r = resolveRequestTarget(env({ databaseUrlStaging: undefined }), {
			...base,
			cookie: 'staging'
		});
		assert.equal(r.target, 'dev');
	});

	it('ignores cookie and ?db= on a deployed runtime', () => {
		const deployed = env({
			nodeEnv: 'production',
			railwayEnvironment: 'staging',
			databaseUrlDev: undefined,
			databaseUrlStaging: undefined,
			databaseUrl: 'postgresql://railway/staging_db'
		});
		const r = resolveRequestTarget(deployed, {
			switchingEnabled: true,
			pathname: '/login',
			dbParam: 'prod',
			cookie: 'prod'
		});
		assert.equal(r.target, 'staging');
		assert.equal(r.setCookie, false);
	});

	it('ignores cookie and ?db= when switching is disabled', () => {
		const r = resolveRequestTarget(env(), {
			switchingEnabled: false,
			pathname: '/login',
			dbParam: 'prod',
			cookie: 'prod'
		});
		assert.equal(r.target, 'dev');
	});
});

describe('session policy', () => {
	it('gets stricter as the stakes rise', () => {
		const dev = sessionPolicyForTarget('dev');
		const staging = sessionPolicyForTarget('staging');
		const prod = sessionPolicyForTarget('prod');

		assert.equal(dev.idleMs, null);
		assert.ok(staging.idleMs !== null && staging.idleMs > 0);
		assert.ok(prod.idleMs !== null && prod.idleMs < staging.idleMs!);
		assert.ok(prod.absoluteMs < dev.absoluteMs);
		assert.equal(prod.persistentCookie, false);
		assert.equal(dev.persistentCookie, true);
		assert.equal(staging.persistentCookie, true);
	});

	it('uses a distinct cookie name per database', () => {
		const names = ALL_DB_TARGETS.map(sessionCookieName);
		assert.equal(new Set(names).size, ALL_DB_TARGETS.length);
		assert.equal(sessionCookieName('prod'), 'ka_session_prod');
	});

	it('expires idle sessions only when an idle limit exists', () => {
		const now = new Date('2026-10-26T12:00:00Z');
		const old = new Date('2026-10-26T00:00:00Z');
		const recent = new Date('2026-10-26T11:59:00Z');
		assert.equal(isSessionIdleExpired(old, now, null), false);
		assert.equal(isSessionIdleExpired(old, now, 30 * 60 * 1000), true);
		assert.equal(isSessionIdleExpired(recent, now, 30 * 60 * 1000), false);
	});
});
