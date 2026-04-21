export type ParsedUtilityBill = {
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

export interface UtilityBillParser {
	parse(pdfBuffer: Buffer): Promise<ParsedUtilityBill>;
}
