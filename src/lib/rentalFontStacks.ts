/** Preset font stacks for rental WYSIWYG pickers (values stored in DB). */
export const RENTAL_FONT_STACK_OPTIONS: { value: string; label: string }[] = [
	{ value: '', label: 'Default (city theme)' },
	{ value: 'system-ui, sans-serif', label: 'System UI' },
	{ value: "Georgia, 'Times New Roman', serif", label: 'Georgia / serif' },
	{ value: 'ui-serif, Georgia, serif', label: 'Serif' },
	{ value: "'Segoe UI', Roboto, sans-serif", label: 'Segoe / Roboto' },
	{ value: 'ui-monospace, SFMono-Regular, Menlo, monospace', label: 'Monospace' }
];
