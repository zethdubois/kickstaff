import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { BillParser, ParsedBill } from '../types';

const DATE_RE = /\b(\d{2}\/\d{2}\/\d{4})\b/g;
const ACCOUNT_RE = /\b\d{3,}-\d{3,}\b/;
const MONEY_RE = /\$?\s*([0-9]+\.[0-9]{2})/;

function parseUsDateToIso(date: string | null) {
	if (!date) return null;
	const [mm, dd, yyyy] = date.split('/');
	if (!mm || !dd || !yyyy) return null;
	return `${yyyy}-${mm}-${dd}`;
}

function extractLineNear(text: string, label: string) {
	const idx = text.toLowerCase().indexOf(label.toLowerCase());
	if (idx < 0) return null;
	const chunk = text.slice(Math.max(0, idx - 80), idx + 120);
	return chunk;
}

function firstMatch(regex: RegExp, text: string) {
	const m = text.match(regex);
	return m?.[0] ?? null;
}

function firstMoneyFromChunk(chunk: string | null) {
	if (!chunk) return null;
	const m = chunk.match(MONEY_RE);
	return m?.[1] ?? null;
}

function findServicePeriod(text: string) {
	const lines = text.split(/\r?\n/);
	for (const line of lines) {
		const dates = [...line.matchAll(DATE_RE)].map((m) => m[1]);
		if (dates.length >= 2) {
			return { start: parseUsDateToIso(dates[0]), end: parseUsDateToIso(dates[1]) };
		}
	}
	return { start: null, end: null };
}

export class MoscowUtilityBillParser implements BillParser {
	async parse(pdfBuffer: Buffer): Promise<ParsedBill> {
		const loadingTask = getDocument({
			// pdfjs-dist expects Uint8Array input in Node runtimes.
			data: new Uint8Array(pdfBuffer)
		});
		const pdf = await loadingTask.promise;
		const pages: string[] = [];
		for (let i = 1; i <= pdf.numPages; i += 1) {
			const page = await pdf.getPage(i);
			const content = await page.getTextContent();
			const text = content.items
				.map((item) => ('str' in item ? item.str : ''))
				.join('\n');
			pages.push(text);
		}
		const rawText = pages.join('\n');

		const dueChunk = extractLineNear(rawText, 'Due Date');
		const billChunk = extractLineNear(rawText, 'Statement');
		const currentChargesChunk =
			extractLineNear(rawText, 'Total Current Charges') || extractLineNear(rawText, 'CURRENT CHARGES');
		const serviceAddressChunk = extractLineNear(rawText, 'Service Address');
		const accountChunk = extractLineNear(rawText, 'Account Number');

		const dueDateRaw = firstMatch(DATE_RE, dueChunk || rawText);
		const billDateRaw = firstMatch(DATE_RE, billChunk || rawText);
		const servicePeriod = findServicePeriod(rawText);

		const serviceAccountNumber = firstMatch(ACCOUNT_RE, accountChunk || rawText);
		const billReference = serviceAccountNumber;
		const amount = firstMoneyFromChunk(currentChargesChunk);

		let serviceAddress: string | null = null;
		if (serviceAddressChunk) {
			const m = serviceAddressChunk.match(/Service Address[:\s]+([^\n]+)/i);
			serviceAddress = m?.[1]?.trim() || null;
		}

		return {
			serviceAccountNumber,
			billReference,
			billDate: parseUsDateToIso(billDateRaw),
			dueDate: parseUsDateToIso(dueDateRaw),
			servicePeriodStart: servicePeriod.start,
			servicePeriodEnd: servicePeriod.end,
			currentChargesAmount: amount,
			serviceAddress,
			rawText
		};
	}
}

export const moscowUtilityParser = new MoscowUtilityBillParser();
