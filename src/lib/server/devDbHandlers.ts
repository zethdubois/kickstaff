import {
	devDatabaseInspectionDisabledMessage,
	isDevDatabaseInspectionEnabled
} from '$lib/server/devDbApi';
import { listDatabaseTables, testDatabaseConnection } from '$lib/server/databaseInspect';
import { getMigrationStatus } from '$lib/server/migrationStatus';
import { getDbDisplayInfo, resolveConnectionString } from '$lib/server/dbTarget';

export function assertDevDatabaseInspection() {
	if (!isDevDatabaseInspectionEnabled()) {
		return { ok: false as const, status: 403, message: devDatabaseInspectionDisabledMessage() };
	}
	return { ok: true as const };
}

export async function buildDatabaseStatusPayload(canSwitch: boolean) {
	const info = getDbDisplayInfo();
	const connectionString = resolveConnectionString(info.target);
	const conn = await testDatabaseConnection(connectionString);
	return {
		target: info.target,
		label: info.label,
		host: info.host,
		database: info.database,
		canSwitch,
		connected: conn.ok,
		connectedError: conn.ok ? undefined : conn.message
	};
}

export async function buildDatabaseTablesPayload() {
	const connectionString = resolveConnectionString();
	const tables = await listDatabaseTables(connectionString);
	return { tables };
}

export async function buildDatabaseMigrationsPayload() {
	const connectionString = resolveConnectionString();
	const status = await getMigrationStatus(connectionString);
	return {
		state: status.state,
		journalCount: status.journalCount,
		appliedCount: status.appliedCount,
		pendingCount: status.pendingCount,
		pendingTags: status.pendingTags
	};
}
