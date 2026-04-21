import type { BillDocument, Unit } from '../../schema';

/**
 * Appfolio Vendor Bills bulk import column order. Asterisk denotes a required
 * column on Appfolio's side.
 *
 * @see docs/thirdparty/bulk_vendor_bill_upload_template__appfolio.csv
 */
export const APPFOLIO_VENDOR_BILL_HEADERS = [
	'Bill Property Code*',
	'Bill Unit Name',
	'Vendor Payee Name*',
	'Amount*',
	'Bill Account*',
	'Description',
	'Bill Date*',
	'Due Date*',
	'Posting Date*',
	'Bill Reference',
	'Bill Remarks',
	'Memo For Check',
	'Purchase Order Number',
	'Cash Account'
] as const;

export type AppfolioVendorBillRowInput = {
	unit: Pick<Unit, 'billPropertyCode' | 'billUnitName'>;
	vendorPayeeName: string;
	billAccount: string;
	description: string;
	cashAccount: string | null;
	doc: Pick<BillDocument, 'billReference' | 'serviceAccountNumber'>;
	currentChargesAmount: string;
	billDate: string;
	dueDate: string;
	period: string;
};

export function buildAppfolioVendorBillRow(input: AppfolioVendorBillRowInput): string[] {
	const fallbackReference = `${input.doc.serviceAccountNumber ?? 'unknown'}-${input.period}`;
	return [
		input.unit.billPropertyCode,
		input.unit.billUnitName ?? '',
		input.vendorPayeeName,
		input.currentChargesAmount,
		input.billAccount,
		input.description,
		input.billDate,
		input.dueDate,
		input.dueDate,
		input.doc.billReference ?? fallbackReference,
		'',
		'',
		'',
		input.cashAccount ?? ''
	];
}
