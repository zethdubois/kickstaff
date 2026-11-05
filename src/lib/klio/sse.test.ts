import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { takeKlioSseEvents } from './sse.ts';

describe('takeKlioSseEvents', () => {
	it('reads deltas and keeps a partial trailing event', () => {
		const first = takeKlioSseEvents('data: {"delta":"Hello"}\n\ndata: {"del');
		assert.deepEqual(first.events, [{ delta: 'Hello' }]);
		assert.equal(first.rest, 'data: {"del');
		const second = takeKlioSseEvents(`${first.rest}ta":" there"}\n\ndata: {"done":true}\n\n`);
		assert.deepEqual(second.events, [{ delta: ' there' }, { done: true }]);
		assert.equal(second.rest, '');
	});
});
