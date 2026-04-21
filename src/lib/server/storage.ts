import { env } from '$env/dynamic/private';
import {
	GetObjectCommand,
	HeadObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3';

type BillKeyKind = 'raw' | 'parsed' | 'output' | 'error';

let client: S3Client | undefined;

function getStorageConfig() {
	const endpoint = env.UTILITY_BILL_S3_ENDPOINT;
	const region = env.UTILITY_BILL_S3_REGION || 'auto';
	const accessKeyId = env.UTILITY_BILL_S3_ACCESS_KEY_ID;
	const secretAccessKey = env.UTILITY_BILL_S3_SECRET_ACCESS_KEY;
	const bucket = env.UTILITY_BILL_S3_BUCKET;
	if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
		throw new Error(
			'Bill storage env is missing. Set UTILITY_BILL_S3_ENDPOINT, UTILITY_BILL_S3_ACCESS_KEY_ID, UTILITY_BILL_S3_SECRET_ACCESS_KEY, and UTILITY_BILL_S3_BUCKET.'
		);
	}
	return { endpoint, region, accessKeyId, secretAccessKey, bucket };
}

function getClient() {
	if (!client) {
		const cfg = getStorageConfig();
		client = new S3Client({
			region: cfg.region,
			endpoint: cfg.endpoint,
			credentials: {
				accessKeyId: cfg.accessKeyId,
				secretAccessKey: cfg.secretAccessKey
			}
		});
	}
	return client;
}

/**
 * Build an S3 key for a bill artifact. New writes use the `bills/{category}/...`
 * prefix; legacy `utility-bills/...` objects keep working because S3 keys are opaque
 * — the application reads by stored key, never by reconstructing the prefix.
 */
export function buildBillStorageKey(params: {
	kind: BillKeyKind;
	category?: string;
	vendor: string;
	year: string;
	month: string;
	sourceMessageId?: string;
	fileName: string;
}) {
	const category = (params.category || 'utility').toLowerCase();
	const vendor = params.vendor.toLowerCase();
	const cleanFileName = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
	const root = `bills/${category}`;
	if (params.kind === 'raw') {
		const sourceMessageId = (params.sourceMessageId || 'manual').replace(/[^a-zA-Z0-9._-]/g, '_');
		return `${root}/raw/${vendor}/${params.year}/${params.month}/${sourceMessageId}/${cleanFileName}`;
	}
	if (params.kind === 'parsed') {
		return `${root}/parsed/${vendor}/${params.year}/${params.month}/${cleanFileName}`;
	}
	if (params.kind === 'output') {
		return `${root}/output/${vendor}/${params.year}/${params.month}/${cleanFileName}`;
	}
	return `${root}/errors/${vendor}/${params.year}/${params.month}/${cleanFileName}`;
}

export async function putBillObject(params: {
	key: string;
	body: Buffer | Uint8Array | string;
	contentType: string;
	metadata?: Record<string, string>;
}) {
	const cfg = getStorageConfig();
	await getClient().send(
		new PutObjectCommand({
			Bucket: cfg.bucket,
			Key: params.key,
			Body: params.body,
			ContentType: params.contentType,
			Metadata: params.metadata
		})
	);
}

export async function getBillObject(key: string) {
	const cfg = getStorageConfig();
	const res = await getClient().send(
		new GetObjectCommand({
			Bucket: cfg.bucket,
			Key: key
		})
	);
	const bytes = await res.Body?.transformToByteArray();
	if (!bytes) {
		throw new Error(`No object body returned for key "${key}"`);
	}
	return Buffer.from(bytes);
}

export async function headBillObject(key: string) {
	const cfg = getStorageConfig();
	return getClient().send(
		new HeadObjectCommand({
			Bucket: cfg.bucket,
			Key: key
		})
	);
}

export async function listBillObjects(prefix: string) {
	const cfg = getStorageConfig();
	const res = await getClient().send(
		new ListObjectsV2Command({
			Bucket: cfg.bucket,
			Prefix: prefix
		})
	);
	return res.Contents ?? [];
}
