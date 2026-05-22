import { getDb } from '$lib/server/db';
import { dashboardLinks } from '$lib/server/schema';

const MAX_LABEL = 512;
const MAX_DESC = 4096;
const MAX_CAT = 128;
const MAX_URL = 2048;

function parseHttpUrl(raw: unknown, required: boolean): { ok: true; value: string } | { ok: false; message: string } {
	const s = String(raw ?? '').trim();
	if (!s) {
		if (required) return { ok: false, message: 'URL is required.' };
		return { ok: true, value: '' };
	}
	if (s.length > MAX_URL) return { ok: false, message: 'URL is too long.' };
	let u: URL;
	try {
		u = new URL(s);
	} catch {
		return { ok: false, message: 'Invalid URL.' };
	}
	if (u.protocol !== 'http:' && u.protocol !== 'https:') {
		return { ok: false, message: 'URL must use http:// or https://' };
	}
	return { ok: true, value: s };
}

export async function createDashboardLinkFromForm(
	formData: FormData
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
	const label = String(formData.get('label') ?? '').trim();
	const description = String(formData.get('description') ?? '').trim();
	const category = String(formData.get('category') ?? '').trim();
	const sortRaw = String(formData.get('sort_order') ?? '').trim();
	const sort_order = sortRaw === '' ? 0 : Number.parseInt(sortRaw, 10);

	if (!label) return { ok: false, status: 400, message: 'Label is required.' };
	if (label.length > MAX_LABEL) return { ok: false, status: 400, message: 'Label is too long.' };
	if (description.length > MAX_DESC) return { ok: false, status: 400, message: 'Description is too long.' };
	if (!category) return { ok: false, status: 400, message: 'Category is required.' };
	if (category.length > MAX_CAT) return { ok: false, status: 400, message: 'Category is too long.' };
	if (!Number.isFinite(sort_order) || sort_order < -1000000 || sort_order > 1000000) {
		return { ok: false, status: 400, message: 'Sort order must be a reasonable number.' };
	}

	const href = parseHttpUrl(formData.get('hyperlink'), true);
	if (!href.ok) return { ok: false, status: 400, message: href.message };

	const db = getDb();
	const now = new Date();
	await db.insert(dashboardLinks).values({
		itemType: 'link',
		hyperlink: href.value,
		label,
		description,
		category,
		sortOrder: sort_order,
		updatedAt: now
	});

	return { ok: true };
}
