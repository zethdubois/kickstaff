import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { ingestBillPdf } from '../src/lib/server/bills/intake';

function arg(name: string, fallback?: string) {
	const direct = process.argv.find((x) => x.startsWith(`--${name}=`));
	if (direct) return direct.split('=').slice(1).join('=');
	return fallback;
}

async function main() {
	const filePath = arg('file');
	const category = arg('category', 'utility');
	const vendor = arg('vendor', 'city-of-moscow');
	const city = arg('city', 'mos');
	const sourceMessageId = arg('message-id');
	if (!filePath) {
		console.error(
			'Usage: pnpm utility:ingest --file=/abs/path/file.pdf [--category=utility] [--vendor=city-of-moscow] [--city=mos]'
		);
		process.exit(1);
	}

	const pdfBuffer = await readFile(filePath);
	const res = await ingestBillPdf({
		pdfBuffer,
		fileName: basename(filePath),
		category: category || 'utility',
		vendor: vendor || 'city-of-moscow',
		city: city || 'mos',
		sourceMessageId
	});

	if (res.status === 'duplicate_skipped') {
		console.log(`Duplicate skipped. id=${res.id} sha256=${res.sha256}`);
		return;
	}
	console.log(`Ingested. id=${res.id} sha256=${res.sha256} storageKey=${res.storageKey}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
