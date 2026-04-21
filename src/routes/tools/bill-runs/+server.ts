import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const TARGET = '/tools/bills/postings';

const handler: RequestHandler = ({ url }) => {
	const dest = TARGET + (url.search ?? '');
	throw redirect(308, dest);
};

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
