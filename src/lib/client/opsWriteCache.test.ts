import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { commandTargetId, opsWriteTargets } from './opsWriteCache.ts';

const resources = ['gl', 'sites', 'units'];

describe('ops write cache', () => {
	it('reads an id flag', () => {
		assert.equal(commandTargetId(['--id', '4', '--undo']), '4');
		assert.equal(commandTargetId(['--id=4']), '4');
		assert.equal(commandTargetId(['--id', '--undo']), null);
		assert.equal(commandTargetId(['--hidden', 'true']), null);
	});

	it('targets the resource and id of a write', () => {
		assert.deepEqual(opsWriteTargets('gl-hide', ['--id', '4'], 'shortcut', resources), {
			resources: ['gl'],
			id: '4'
		});
		assert.deepEqual(opsWriteTargets('kickagent:gl-import', [], 'structural', resources), {
			resources: ['gl'],
			id: null
		});
		assert.deepEqual(
			opsWriteTargets('site-units-import-af', [], 'structural', resources),
			{ resources: ['units'], id: null }
		);
	});

	it('ignores queries and commands with no resource', () => {
		assert.equal(opsWriteTargets('gl-list', [], 'query', resources), null);
		assert.equal(opsWriteTargets('gl-show', ['--id', '4'], 'query', resources), null);
		assert.equal(opsWriteTargets('write-audit-list', ['--limit', '20'], 'query', resources), null);
		assert.equal(opsWriteTargets('gl-hide', ['--id', '4'], undefined, resources), null);
		assert.equal(opsWriteTargets('hello', [], 'write', resources), null);
	});
});
