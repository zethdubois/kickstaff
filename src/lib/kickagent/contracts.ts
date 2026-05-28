/**
 * Host/plugin contract (aligned with kickagent package types).
 * Duplicated here so publicweb does not depend on the kickagent npm/git package at build time.
 */

export type CommandOutcome = {
	refresh?: string[];
	log?: string | string[];
	level?: 'log' | 'info' | 'warn' | 'error';
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
