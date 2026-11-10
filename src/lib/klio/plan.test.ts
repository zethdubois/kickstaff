import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { callLine, parseKlioPlan, planTitle } from './plan.ts';

describe('parseKlioPlan', () => {
	it('titles a plan from the first sentence when title is missing', () => {
		const plan = parseKlioPlan(
			{
				summary: 'I will unhide 7100 Utilities. Nothing is changed until you confirm.',
				calls: [{ command: 'gl-update', args: ['--number', '7100', '--hidden', 'false'] }]
			},
			''
		);
		assert.equal(plan?.title, 'I will unhide 7100 Utilities.');
		assert.equal(callLine(plan!.calls[0]), 'gl-update --number 7100 --hidden false');
	});

	it('keeps a title she sent', () => {
		assert.equal(planTitle('Unhide utilities', 'Longer summary.'), 'Unhide utilities');
	});

	it('refuses a command outside the write list', () => {
		assert.equal(
			parseKlioPlan(
				{ summary: 'No.', calls: [{ command: 'gl-list', args: [] }] },
				'No.'
			),
			null
		);
	});
});
