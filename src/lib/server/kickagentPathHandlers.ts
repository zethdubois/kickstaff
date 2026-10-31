import { env } from '$env/dynamic/private';
import type { RequestHandler } from '@sveltejs/kit';
import {
	KICKAGENT_PROXY_METHODS,
	proxyKickagentPath,
	requireKickagentProxyUser,
	type KickagentProxyMethod
} from '$lib/server/kickagentPathProxy';
import { resolveKickagentApiBaseUrl } from '$lib/server/kickagentRemoteRun';

function resolveKickagentServiceToken(): string | undefined {
	return (
		env.KICKAGENT_SERVICE_TOKEN?.trim() ||
		process.env.KICKAGENT_SERVICE_TOKEN?.trim() ||
		undefined
	);
}

function makeHandler(): RequestHandler {
	return async ({ request, locals }) => {
		requireKickagentProxyUser(locals.user);
		return proxyKickagentPath({
			baseUrl: resolveKickagentApiBaseUrl(),
			token: resolveKickagentServiceToken(),
			user: locals.user,
			request
		});
	};
}

/** GET/HEAD/POST/PUT/DELETE handlers shared by /wiki and /progress catch-alls. */
export function kickagentPathHandlers(): Record<KickagentProxyMethod, RequestHandler> {
	const handler = makeHandler();
	const out = {} as Record<KickagentProxyMethod, RequestHandler>;
	for (const method of KICKAGENT_PROXY_METHODS) {
		out[method] = handler;
	}
	return out;
}
