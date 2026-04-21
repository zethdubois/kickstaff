export type ParsedBill = {
	serviceAccountNumber: string | null;
	billReference: string | null;
	billDate: string | null;
	dueDate: string | null;
	servicePeriodStart: string | null;
	servicePeriodEnd: string | null;
	currentChargesAmount: string | null;
	serviceAddress: string | null;
	rawText: string;
};

export interface BillParser {
	parse(pdfBuffer: Buffer): Promise<ParsedBill>;
}
