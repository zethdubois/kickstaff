import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	buildListDetailUpdateArgs,
	buildListFilterArgs,
	confirmMessage,
	hasDisplayValue,
	irreversibleChanges,
	isFieldLocked,
	isStatusField,
	recordFromShowOutcome,
	recordIdentityId
} from './listDetailForm.ts';
import type { ManifestListDetailDetail } from './manifestResourceCache.ts';

const detail: ManifestListDetailDetail = {
	command: 'gl-show',
	titleKey: 'name',
	recordKey: 'account',
	submitCommand: 'gl-update',
	fields: [
		{ key: 'id', label: 'Id', type: 'uuid', editable: false, flag: '--id' },
		{ key: 'number', label: 'Number', type: 'string', editable: false, flag: '--number' },
		{ key: 'name', label: 'Name', type: 'string', editable: true, flag: '--name' },
		{
			key: 'parentNumber',
			label: 'Parent',
			type: 'string',
			editable: true,
			flag: '--parent',
			clearValue: 'none'
		},
		{
			key: 'hidden',
			label: 'Hidden',
			type: 'boolean',
			editable: true,
			flag: '--hidden'
		},
		{
			key: 'retired',
			label: 'Retired',
			type: 'boolean',
			editable: true,
			flag: '--retired',
			irreversible: true,
			confirmText: 'Retire this account? It keeps its history but cannot be restored.'
		}
	]
};

describe('listDetailForm', () => {
	it('builds presence and exact filter args from schema', () => {
		assert.deepEqual(
			buildListFilterArgs(
				[
					{
						key: 'includeHidden',
						flag: '--include-hidden',
						type: 'boolean',
						match: 'presence',
						label: 'Include hidden'
					},
					{
						key: 'accountType',
						flag: '--type',
						type: 'string',
						match: 'exact',
						label: 'Type'
					}
				],
				{ includeHidden: true, includeRetired: false, accountType: ' Cash ' }
			),
			['--include-hidden', '--type', 'Cash']
		);
	});

	it('reads data[recordKey] and builds update args from field flags', () => {
		const record = {
			id: 'acc-1',
			number: '1000',
			name: 'Cash',
			parentNumber: '4000',
			hidden: false
		};
		assert.equal(
			recordFromShowOutcome(
				{ data: { account: record }, presentationRef: 'gl.detail' },
				'account'
			)?.name,
			'Cash'
		);
		assert.deepEqual(
			buildListDetailUpdateArgs(record, { ...record, name: 'Operating Cash' }, detail),
			['--id', 'acc-1', '--name', 'Operating Cash']
		);
		assert.deepEqual(
			buildListDetailUpdateArgs(record, { ...record, parentNumber: '' }, detail),
			['--id', 'acc-1', '--parent', 'none']
		);
		assert.deepEqual(buildListDetailUpdateArgs(record, { ...record }, detail), []);
	});

	describe('one-way (irreversible) fields', () => {
		const open = { id: 'acc-1', number: '1000', name: 'Cash', hidden: false, retired: false };
		const retired = { ...open, retired: true };

		it('sends the flag only when the user ticks it (deferred until Save)', () => {
			assert.deepEqual(buildListDetailUpdateArgs(open, { ...open }, detail), []);
			assert.deepEqual(buildListDetailUpdateArgs(open, { ...open, retired: true }, detail), [
				'--id',
				'acc-1',
				'--retired',
				'true'
			]);
		});

		it('batches retire with other edits in one save', () => {
			assert.deepEqual(
				buildListDetailUpdateArgs(open, { ...open, name: 'Reserve', retired: true }, detail),
				['--id', 'acc-1', '--name', 'Reserve', '--retired', 'true']
			);
		});

		it('locks once saved true and never sends an un-retire', () => {
			const field = detail.fields.find((f) => f.key === 'retired')!;
			assert.equal(isFieldLocked(field, retired), true);
			assert.equal(isFieldLocked(field, open), false);
			assert.equal(isFieldLocked(field, null), false);
			assert.deepEqual(
				buildListDetailUpdateArgs(retired, { ...retired, retired: false }, detail),
				[]
			);
			assert.deepEqual(
				buildListDetailUpdateArgs(retired, { ...retired, retired: false, name: 'X' }, detail),
				['--id', 'acc-1', '--name', 'X']
			);
		});

		it('asks to confirm only for a newly set one-way field', () => {
			assert.deepEqual(
				irreversibleChanges(open, { ...open, retired: true }, detail.fields).map((f) => f.key),
				['retired']
			);
			assert.deepEqual(irreversibleChanges(open, { ...open, hidden: true }, detail.fields), []);
			assert.deepEqual(irreversibleChanges(retired, { ...retired }, detail.fields), []);
		});

		it('uses confirmText, else a generic line naming the field', () => {
			const [withText] = irreversibleChanges(open, { ...open, retired: true }, detail.fields);
			assert.equal(
				confirmMessage([withText!]),
				'Retire this account? It keeps its history but cannot be restored.'
			);
			assert.equal(
				confirmMessage([{ ...withText!, confirmText: undefined }]),
				'Set "Retired"? This cannot be undone.'
			);
		});
	});

	describe('layout helpers', () => {
		it('treats group:status, irreversible, and --hidden as status fields', () => {
			assert.equal(isStatusField(detail.fields.find((f) => f.key === 'retired')!), true);
			assert.equal(isStatusField(detail.fields.find((f) => f.key === 'hidden')!), true);
			assert.equal(
				isStatusField({
					key: 'hidden',
					label: 'Hidden',
					type: 'boolean',
					editable: true,
					flag: '--hidden',
					group: 'status'
				}),
				true
			);
			assert.equal(
				isStatusField({
					key: 'includeOnCashFlow',
					label: 'Cash flow',
					type: 'boolean',
					editable: true,
					flag: '--cash-flow'
				}),
				false
			);
		});

		it('skips empty meta values and pulls id for the title bar', () => {
			assert.equal(hasDisplayValue(null), false);
			assert.equal(hasDisplayValue(''), false);
			assert.equal(hasDisplayValue('2500'), true);
			assert.equal(
				recordIdentityId({ id: 'acc-1', number: '2500' }, detail.fields),
				'acc-1'
			);
			assert.equal(recordIdentityId({ number: '2500' }, detail.fields), null);
		});
	});
});
