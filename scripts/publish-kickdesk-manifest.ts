/**
 * Publish operational manifest to ~/.config/publicweb/manifest.json
 *
 *   pnpm kickdesk:publish-manifest
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { buildKickdeskManifest } from './kickdesk-manifest.ts';

const EXPECTED_APP_PORT = 5000;
const EXPECTED_DB_PORT = 5043;

function warnIfPortDrift() {
	const root = process.cwd();
	const warnings: string[] = [];

	try {
		const vite = readFileSync(join(root, 'vite.config.ts'), 'utf8');
		if (!new RegExp(`port:\\s*${EXPECTED_APP_PORT}\\b`).test(vite)) {
			warnings.push(
				`vite.config.ts may not use port ${EXPECTED_APP_PORT} (manifest primary_port / app role)`
			);
		}
	} catch {
		warnings.push('could not read vite.config.ts for port cross-check');
	}

	try {
		const compose = readFileSync(join(root, 'docker-compose.yml'), 'utf8');
		if (!new RegExp(`"${EXPECTED_DB_PORT}:5432"`).test(compose)) {
			warnings.push(
				`docker-compose.yml may not map host ${EXPECTED_DB_PORT} (manifest db role)`
			);
		}
	} catch {
		warnings.push('could not read docker-compose.yml for port cross-check');
	}

	for (const msg of warnings) {
		console.error(`kickdesk publish warning: ${msg}`);
	}
}

function main() {
	warnIfPortDrift();

	const manifest = buildKickdeskManifest();
	const configDir = join(homedir(), '.config', 'publicweb');
	const outPath = join(configDir, 'manifest.json');

	try {
		mkdirSync(configDir, { recursive: true });
		writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
		console.log(`wrote ${outPath}`);
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
}

main();
