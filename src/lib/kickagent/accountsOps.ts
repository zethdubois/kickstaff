/** Hub → chart of accounts page. */

export const ACCOUNTS_OPS_PATH = '/ops/accounts';

export const ACCOUNTS_LIST_COMMAND = 'gl-list';

export function isAccountsHubCommandKey(commandKey: string): boolean {
	const key = commandKey.trim().toLowerCase();
	return key === 'kickagent:gl-list' || key === ACCOUNTS_LIST_COMMAND;
}
