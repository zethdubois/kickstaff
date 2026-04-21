import 'dotenv/config';
import { parseBillDocumentById } from '../src/lib/server/bills/parseDocument';

function arg(name: string) {
	const direct = process.argv.find((x) => x.startsWith(`--${name}=`));
	return direct ? direct.split('=').slice(1).join('=') : undefined;
}

async function main() {
	const id = arg('id');
	if (!id) {
		console.error('Usage: pnpm utility:parse --id=<bill_documents.id>');
		process.exit(1);
	}
	const result = await parseBillDocumentById(id);
	console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
