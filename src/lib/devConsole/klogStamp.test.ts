import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { showsKlogTimestamp } from './klogStamp.ts';

describe('showsKlogTimestamp', () => {
	it('stamps the first line of a result and not the following rows', () => {
		const source = 'command:kickagent:gl-list';
		const prompt = { ts: 1, source: 'kam:prompt' };
		const head = { ts: 2, source };
		const row = { ts: 2, source };
		assert.equal(showsKlogTimestamp(prompt, null), true);
		assert.equal(showsKlogTimestamp(head, prompt), true);
		assert.equal(showsKlogTimestamp(row, head), false);
	});
});
