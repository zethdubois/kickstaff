#!/usr/bin/env node
/**
 * Prints PUBLIC_VANITY_HOST_* as Vite would load them from .env (same as SvelteKit dev server).
 * Run: pnpm run env:vanity
 */
import { loadEnv } from 'vite';

const mode = process.env.NODE_ENV || 'development';
const env = loadEnv(mode, process.cwd(), '');
const keys = ['PUBLIC_VANITY_HOST_CDA', 'PUBLIC_VANITY_HOST_MOS', 'PUBLIC_VANITY_HOST_SPT'];

console.log(`loadEnv(mode=${JSON.stringify(mode)}, cwd=${process.cwd()})\n`);
for (const k of keys) {
	console.log(`${k}=${env[k] ?? '(not set)'}`);
}
