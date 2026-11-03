/**
 * Kickagent hub cards are one link per manifest resource, seeded when the dashboard loads.
 * Running a command does not add a card. The argument is kept so existing call sites stay valid.
 */
export async function materializeDashboardCommand(_commandKey: string): Promise<void> {}
