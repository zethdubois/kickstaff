/**
 * Operational Kickdesk manifest for publicweb (50xx family).
 * Single source for `pnpm kickdesk:publish-manifest`.
 */
export type KickdeskManifest = {
	id: string;
	port_family: number;
	primary_port: number;
	ports: { role: string; port: number }[];
	url: string;
	workflows: { start: string[]; stop: string[] };
	commands: Record<string, string>;
	status?: { migrate: string };
};

export const KICKDESK_CONFIG_DIR = '~/.config/publicweb';
export const KICKDESK_MIGRATE_STATUS_PATH = `${KICKDESK_CONFIG_DIR}/migrate-status`;

export function buildKickdeskManifest(): KickdeskManifest {
	return {
		id: 'publicweb',
		port_family: 50,
		primary_port: 5000,
		ports: [
			{ role: 'app', port: 5000 },
			{ role: 'db', port: 5043 }
		],
		url: 'http://localhost:5000',
		workflows: {
			start: ['db-up', 'migrate', 'up'],
			stop: ['stop-server', 'db-down']
		},
		commands: {
			up: 'pnpm dev',
			down: 'pnpm db:down',
			build: 'pnpm build',
			test: 'pnpm check',
			db: 'pnpm db:status',
			'db-up': 'pnpm db:up',
			'db-down': 'pnpm db:down',
			migrate: 'pnpm db:migrate',
			'migrate-status': 'pnpm db:migrate:status',
			'stop-server': 'fuser -k 5000/tcp 2>/dev/null || true'
		},
		status: {
			migrate: KICKDESK_MIGRATE_STATUS_PATH
		}
	};
}
