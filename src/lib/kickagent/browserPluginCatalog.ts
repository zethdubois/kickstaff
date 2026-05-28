/**
 * Browser-safe Phase 1 catalog for publicweb (no `pg`).
 * Prefer `kickagent/plugin` when the installed package exports it; otherwise
 * register hello/foo via deep imports that do not pull COMMAND_CATALOG.
 */
import type { CommandOutcome } from '$lib/devConsole';
import type { KickagentHostContext } from 'kickagent';

export type BrowserPluginCommand = {
	name: string;
	handler: (
		args: string[],
		ctx: KickagentHostContext
	) => Promise<CommandOutcome | void>;
};

async function loadCatalog(): Promise<readonly BrowserPluginCommand[]> {
	try {
		const mod = await import('kickagent/plugin');
		return mod.PLUGIN_COMMAND_CATALOG;
	} catch {
		const { helloWorld } = await import('kickagent/hello');
		const { fooWorld } = await import('kickagent/foo');
		return [
			{
				name: 'hello',
				handler: async (_args, ctx) => {
					const res = await helloWorld(ctx.userId, ctx.userEmail, ctx.logger);
					return { log: res.message, level: 'info' as const };
				}
			},
			{
				name: 'foo',
				handler: async (_args, ctx) => {
					const res = await fooWorld(ctx.userId, ctx.userEmail, ctx.logger);
					return { log: res.message, level: 'info' as const };
				}
			}
		] as const;
	}
}

let catalogPromise: Promise<readonly BrowserPluginCommand[]> | null = null;

export function getBrowserPluginCatalog(): Promise<readonly BrowserPluginCommand[]> {
	if (!catalogPromise) {
		catalogPromise = loadCatalog();
	}
	return catalogPromise;
}
