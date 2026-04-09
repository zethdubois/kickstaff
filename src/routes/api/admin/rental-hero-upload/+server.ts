import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isCitySlug } from '$lib/cities';

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 4 * 1024 * 1024;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ message: 'Unauthorized' }, { status: 401 });
	}

	const form = await request.formData();
	const cityRaw = String(form.get('citySlug') ?? '').trim();
	if (!isCitySlug(cityRaw)) {
		return json({ message: 'Invalid city.' }, { status: 400 });
	}

	const file = form.get('file');
	if (!(file instanceof File)) {
		return json({ message: 'Expected file field.' }, { status: 400 });
	}
	if (file.size === 0) {
		return json({ message: 'Empty file.' }, { status: 400 });
	}
	if (file.size > MAX_BYTES) {
		return json({ message: 'Image must be 4 MB or smaller.' }, { status: 400 });
	}

	const type = file.type;
	if (!ALLOWED.has(type)) {
		return json({ message: 'Use JPEG, PNG, WebP, or GIF.' }, { status: 400 });
	}

	const ext =
		type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'gif';
	const filename = `${randomUUID()}.${ext}`;
	const dir = join(process.cwd(), 'static', 'rental-media', cityRaw);
	await mkdir(dir, { recursive: true });

	const buffer = Buffer.from(await file.arrayBuffer());
	await writeFile(join(dir, filename), buffer);

	const publicPath = `/rental-media/${cityRaw}/${filename}`;
	return json({ path: publicPath });
};
