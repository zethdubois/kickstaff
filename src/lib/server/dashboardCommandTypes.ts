export type CommandCatalogDefaults = {
	label: string;
	description: string;
	category: string;
	sortOrder: number;
	execution?: 'local' | 'remote';
};
