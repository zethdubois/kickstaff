/**
 * Host/plugin contract (aligned with kickagent package types).
 * Duplicated here so publicweb does not depend on the kickagent npm/git package at build time.
 */

export type CommandPresentationFieldType =
	| 'string'
	| 'number'
	| 'integer'
	| 'boolean'
	| 'date'
	| 'datetime'
	| 'uuid'
	| 'json'
	| 'money-dollars'
	| 'percent-bps';

export type CommandPresentationColumn = {
	key: string;
	label: string;
	type: CommandPresentationFieldType;
};

export type CommandPresentationField = CommandPresentationColumn & {
	editable?: boolean;
	required?: boolean;
};

export type CommandPresentation =
	| {
			kind: 'table';
			rowsKey: string;
			primaryKey: string;
			columns: CommandPresentationColumn[];
	  }
	| {
			kind: 'record';
			titleKey: string;
			fields: CommandPresentationField[];
	  }
	| {
			kind: 'form';
			titleKey: string;
			submitCommand: string;
			fields: CommandPresentationField[];
			readonlyKeys?: string[];
	  };

export type CommandOutcome = {
	refresh?: string[];
	log?: string | string[];
	level?: 'log' | 'info' | 'warn' | 'error';
	data?: unknown;
	/** Host resolves against manifest `resources` when set. */
	presentationRef?: string;
	presentation?: CommandPresentation;
};

export interface KlogBroadcaster {
	log(msg: string): void;
	info(msg: string): void;
	warn(msg: string): void;
	error(msg: string): void;
}

export interface KickagentHostContext {
	userId: string;
	userEmail: string;
	logger: KlogBroadcaster;
	apiBaseUrl?: string;
}

export type CommandHandler = (
	args: string[],
	ctx: KickagentHostContext
) => Promise<CommandOutcome | void>;

export interface KickagentRegistry {
	register(name: string, handler: CommandHandler): void;
}
