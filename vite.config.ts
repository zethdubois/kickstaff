import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()]
	// No server.allowedHosts needed: Vite allows `localhost` and `*.localhost` by default.
	// Use http://moscow.localhost:5173/ for local vanity testing (no /etc/hosts).
});
