import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCliDbArgv } from './dbCli.ts';

describe('parseCliDbArgv', () => {
	it('parses --db prod', () => {
		const r = parseCliDbArgv(['--db', 'prod']);
		assert.equal(r.dbTarget, 'prod');
		assert.equal(r.explicit, true);
		assert.deepEqual(r.argv, []);
	});

	it('parses --db dev', () => {
		const r = parseCliDbArgv(['--db', 'dev']);
		assert.equal(r.dbTarget, 'dev');
		assert.equal(r.explicit, true);
	});

	it('parses positional prod', () => {
		const r = parseCliDbArgv(['prod']);
		assert.equal(r.dbTarget, 'prod');
		assert.equal(r.explicit, true);
		assert.deepEqual(r.argv, []);
	});

	it('prefers --db over positional', () => {
		const r = parseCliDbArgv(['dev', '--db', 'prod']);
		assert.equal(r.dbTarget, 'prod');
		assert.equal(r.explicit, true);
	});

	it('leaves unknown args in argv', () => {
		const r = parseCliDbArgv(['--db', 'dev', 'extra']);
		assert.equal(r.dbTarget, 'dev');
		assert.deepEqual(r.argv, ['extra']);
	});

	it('does not treat non-target tokens as positional', () => {
		const r = parseCliDbArgv(['--help']);
		assert.equal(r.dbTarget, null);
		assert.equal(r.explicit, false);
		assert.deepEqual(r.argv, ['--help']);
	});

	it('throws on invalid --db value', () => {
		assert.throws(() => parseCliDbArgv(['--db', 'staging']), /usage:/);
	});
});
