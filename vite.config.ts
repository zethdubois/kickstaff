import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
        plugins: [sveltekit()],
        // Local dev and Replit webview both expect this port; keep in sync with `.replit` port mapping.
        server: {
                allowedHosts: true,
                host: '0.0.0.0',
                port: 5000,
                strictPort: true
        }
});
