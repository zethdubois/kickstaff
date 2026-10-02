import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	buildListDetailUpdateArgs,
	buildListFilterArgs,
	recordFromShowOutcome
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
});
