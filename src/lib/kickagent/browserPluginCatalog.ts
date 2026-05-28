/**
 * Browser-safe Phase 1 command catalog (no `pg`, no `kickagent/plugin` import).
 * Keeps Vite/Rollup from requiring the kickagent `./plugin` export at build time.
 * Phase 2 uses manifest load instead; server hub metadata uses full COMMAND_CATALOG.
 */
import type { CommandOutcome } from '$lib/devConsole';
import type { KickagentHostContext, KlogBroadcaster } from 'kickagent';

export type BrowserPluginCommand = {
	name: string;
	handler: (
		args: string[],
		ctx: KickagentHostContext
	) => Promise<CommandOutcome | void>;
};

/** Matches kickagent hello/foo plugin commands (see kickagent src/hello.ts, foo.ts). */
export const BROWSER_PLUGIN_CATALOG: readonly BrowserPluginCommand[] = [
	{
		name: 'hello',
		handler: async (_args, ctx) => ({
			log: `Hi-YA, ${ctx.userEmail}! Kick to the head.`,
			level: 'info' as const
		})
	},
	{
		name: 'foo',
		handler: async (_args, ctx) => ({
			log: `FOO says: ${ctx.userEmail} (id=${ctx.userId})`,
			level: 'info' as const
		})
	}
];

export type { KlogBroadcaster };
