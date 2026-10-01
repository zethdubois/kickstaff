import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	accountFromShowOutcome,
	accountOutcomeMessage,
	buildGlListArgs,
	buildGlUpdateArgs,
	glDetailFields
} from './glAccountForm.ts';

const columns = [
	{ key: 'number', label: 'Number', type: 'string' as const },
	{ key: 'name', label: 'Name', type: 'string' as const },
	{ key: 'hidden', label: 'Hidden', type: 'boolean' as const }
];

const account = {
	id: 'acc-1',
	number: '1000',
	name: 'Cash',
	parentNumber: '4000',
	offsetNumber: null,
	hidden: false
};

describe('glAccountForm', () => {
	it('reads data.account and does not use log text as fields', () => {
		const parsed = accountFromShowOutcome({
			level: 'info',
			log: ['1000 | Cash | should-not-parse'],
			data: { account: { id: 'acc-1', name: 'Cash' } },
			presentationRef: 'gl.detail'
		});
		assert.equal(parsed?.name, 'Cash');
		assert.equal(accountFromShowOutcome({ level: 'error', log: 'account not found' }), null);
		assert.equal(
			accountOutcomeMessage({ level: 'error', log: 'account not found' }),
			'account not found'
		);
	});

	it('keeps number read-only and shows detail-only fields', () => {
		const fields = glDetailFields(columns, ['number', 'name', 'hidden', 'offsetNumber']);
		const number = fields.find((field) => field.key === 'number');
		const offset = fields.find((field) => field.key === 'offsetNumber');
		assert.equal(number?.editable, false);
		assert.equal(fields.find((field) => field.key === 'name')?.editable, true);
		assert.equal(offset?.editable, true);
		assert.ok(fields.some((field) => field.key === 'sourceSystem' && !field.editable));
	});

	it('builds gl-update args only for changed fields', () => {
		assert.deepEqual(
			buildGlUpdateArgs(account, { ...account, name: 'Operating Cash' }, ['name', 'number']),
			['--id', 'acc-1', '--name', 'Operating Cash']
		);
		assert.deepEqual(buildGlUpdateArgs(account, { ...account }, ['name']), []);
		assert.deepEqual(
			buildGlUpdateArgs(account, { ...account, offsetNumber: '' }, ['offsetNumber']),
			[]
		);
		assert.deepEqual(
			buildGlUpdateArgs(account, { ...account, parentNumber: '' }, ['parentNumber']),
			['--id', 'acc-1', '--parent', 'none']
		);
		assert.deepEqual(
			buildGlUpdateArgs(account, { ...account, hidden: true }, ['hidden']),
			['--id', 'acc-1', '--hidden', 'true']
		);
	});

	it('builds list flags for hidden, retired, and type', () => {
		assert.deepEqual(
			buildGlListArgs({
				includeHidden: true,
				includeRetired: true,
				accountType: ' Expense '
			}),
			['--include-hidden', '--include-retired', '--type', 'Expense']
		);
		assert.deepEqual(
			buildGlListArgs({ includeHidden: false, includeRetired: false }),
			[]
		);
	});
});
