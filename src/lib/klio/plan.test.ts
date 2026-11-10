import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { callLine, parseKlioPlan, planTitle } from './plan.ts';

describe('parseKlioPlan', () => {
	it('uses the title Kickagent sent and keeps the reply as summary', () => {
		const reply =
			'I have queued the unhide operations for all 4 hidden liability accounts:\n\n1. 2110 Last Month\'s Rent';
		const plan = parseKlioPlan(
			{
				title: 'Unhide 4 accounts',
				summary: reply,
				calls: [{ command: 'gl-hide', args: ['--number', '2110', '--undo'] }]
			},
			reply
		);
		assert.equal(plan?.title, 'Unhide 4 accounts');
		assert.equal(plan?.summary, reply);
		assert.equal(callLine(plan!.calls[0]), 'gl-hide --number 2110 --undo');
	});

	it('does not take a heading from the reply when title is missing', () => {
		const plan = parseKlioPlan(
			{
				summary: 'I will unhide 7100 Utilities. Nothing is changed until you confirm.',
				calls: [{ command: 'gl-update', args: ['--number', '7100', '--hidden', 'false'] }]
			},
			''
		);
		assert.equal(plan?.title, 'plan');
		assert.equal(planTitle(undefined), 'plan');
		assert.equal(planTitle('  Unhide 4 accounts  '), 'Unhide 4 accounts');
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
