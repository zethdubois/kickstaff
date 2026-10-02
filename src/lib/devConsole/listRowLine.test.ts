import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { listRowLine, listRowLines } from './listRowLine.ts';

describe('listRowLine', () => {
	it('prints account number, name, and type', () => {
		assert.equal(
			listRowLine({ number: '1110', name: 'Operating Cash', accountType: 'Cash' }),
			'1110  Operating Cash  Cash'
		);
	});

	it('prints a name when the row is not an account', () => {
		assert.equal(listRowLine({ name: '10th Street' }), '10th Street');
	});

	it('reads data.rows and ignores the summary log', () => {
		assert.deepEqual(
			listRowLines({
				rows: [{ number: '1110', name: 'Operating Cash', accountType: 'Cash' }],
				count: 1
			}),
			['1110  Operating Cash  Cash']
		);
		assert.equal(listRowLines({ account: { name: 'Cash' } }), null);
	});
});
