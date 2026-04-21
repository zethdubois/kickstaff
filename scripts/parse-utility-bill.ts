import 'dotenv/config';
import { parseUtilityBillDocumentById } from '../src/lib/server/utilityBills/parseDocument';

function arg(name: string) {
	const direct = process.argv.find((x) => x.startsWith(`--${name}=`));
	return direct ? direct.split('=').slice(1).join('=') : undefined;
}

async function main() {
	const id = arg('id');
	if (!id) {
		console.error('Usage: pnpm utility:parse --id=<utility_bill_documents.id>');
		process.exit(1);
	}
	const result = await parseUtilityBillDocumentById(id);
	console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
