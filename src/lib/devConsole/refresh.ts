export type RefreshTarget = () => void | Promise<void>;

const targets = new Map<string, RefreshTarget>();

export function registerRefreshTarget(key: string, target: RefreshTarget): void {
  targets.set(key, target);
}

export function unregisterRefreshTarget(key: string): void {
  targets.delete(key);
}

export function listRefreshTargets(): string[] {
  return [...targets.keys()].sort();
}

export async function runRefreshTarget(key: string): Promise<boolean> {
  const target = targets.get(key);
  if (!target) return false;
  await target();
  return true;
}
