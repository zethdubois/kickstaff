import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const period = params.period;
	if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
		throw error(400, 'Invalid month — expected format YYYY-MM.');
	}
	return { period };
};
