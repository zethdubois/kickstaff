import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { unitFromShowOutcome, unitShowErrorMessage } from './unitDetailLoad.ts';

describe('unitDetailLoad', () => {
	it('parses data.unit from units-show outcome', () => {
		const unit = unitFromShowOutcome({
			data: { unit: { id: 'u1', name: 'Test Unit' } }
		});
		assert.equal(unit?.id, 'u1');
		assert.equal(unit?.name, 'Test Unit');
	});

	it('returns log message when unit missing', () => {
		assert.equal(
			unitShowErrorMessage({ log: 'unit not found' }),
			'unit not found'
		);
	});
});
