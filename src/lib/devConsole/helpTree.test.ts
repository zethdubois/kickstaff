import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSubscriberHelpNodes, formatHelpTree } from './helpTree.ts';

describe('formatHelpTree', () => {
	it('draws classic tree branches with hanging children', () => {
		const text = formatHelpTree('Subscriber: kickagent (v0.8.0)', [
			{
				label: 'resources.gl  GL Accounts',
				children: ['gl-create', 'gl-list', 'gl-update']
			},
			{
				label: 'resources.sites  Sites',
				children: ['sites-list', 'sites-show']
			},
			{
				label: 'resources.units  Units',
				children: ['units-list', 'units-show']
			}
		]);
		assert.equal(
			text,
			[
				'Subscriber: kickagent (v0.8.0)',
				'├── resources.gl  GL Accounts',
				'│   ├── gl-create',
				'│   ├── gl-list',
				'│   └── gl-update',
				'├── resources.sites  Sites',
				'│   ├── sites-list',
				'│   └── sites-show',
				'└── resources.units  Units',
				'    ├── units-list',
				'    └── units-show'
			].join('\n')
		);
	});

	it('keeps a leaf with no children as a single branch line', () => {
		assert.equal(
			formatHelpTree('Subscriber: kickagent', [
				{ label: 'hello', children: [] },
				{ label: 'resources.gl  GL Accounts', children: ['gl-list'] }
			]),
			[
				'Subscriber: kickagent',
				'├── hello',
				'└── resources.gl  GL Accounts',
				'    └── gl-list'
			].join('\n')
		);
	});
});

describe('buildSubscriberHelpNodes', () => {
	it('nests commands under resource parents', () => {
		assert.deepEqual(
			buildSubscriberHelpNodes(
				[
					'gl-list',
					'hello',
					'sites-list',
					'sites-show',
					'units-list',
					'site-units-import-af'
				],
				[
					{ key: 'gl', label: 'GL Accounts' },
					{ key: 'sites', label: 'Sites' },
					{ key: 'units', label: 'Units' }
				]
			),
			[
				{
					label: 'resources.gl  GL Accounts',
					children: ['gl-list']
				},
				{
					label: 'resources.sites  Sites',
					children: ['sites-list', 'sites-show']
				},
				{
					label: 'resources.units  Units',
					children: ['units-list']
				},
				{ label: 'hello', children: [] },
				{ label: 'site-units-import-af', children: [] }
			]
		);
	});

	it('infers resource parents from shared prefixes when refs are missing', () => {
		assert.deepEqual(
			buildSubscriberHelpNodes(
				[
					'gl-create',
					'gl-list',
					'hello',
					'sites-list',
					'sites-show',
					'site-units-import-af',
					'units-list',
					'units-show'
				],
				[]
			),
			[
				{
					label: 'resources.gl',
					children: ['gl-create', 'gl-list']
				},
				{
					label: 'resources.sites',
					children: ['sites-list', 'sites-show']
				},
				{
					label: 'resources.units',
					children: ['units-list', 'units-show']
				},
				{ label: 'hello', children: [] },
				{ label: 'site-units-import-af', children: [] }
			]
		);
	});
});
