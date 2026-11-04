/** One resource (or leftover bucket) in the subscriber help tree. */
export type SubscriberHelpNode = {
  label: string;
  children: string[];
};

/** Resource key + optional short label for the parent branch. */
export type HelpResourceRef = {
  key: string;
  label: string;
};

/**
 * Classic `tree`-style lines under a root header.
 * One child per line so pre-wrap cannot collapse the indent gutter.
 */
export function formatHelpTree(
  head: string,
  nodes: SubscriberHelpNode[],
): string {
  const lines = [head];
  nodes.forEach((node, i) => {
    const lastNode = i === nodes.length - 1;
    lines.push(`${lastNode ? "└── " : "├── "}${node.label}`);
    const pad = lastNode ? "    " : "│   ";
    node.children.forEach((child, j) => {
      const lastChild = j === node.children.length - 1;
      lines.push(`${pad}${lastChild ? "└── " : "├── "}${child}`);
    });
  });
  return lines.join("\n");
}

function resourceBranchLabel(key: string, label: string): string {
  const trimmed = label.trim();
  return trimmed ? `resources.${key}  ${trimmed}` : `resources.${key}`;
}

/**
 * Group short command names under resource parents.
 * Prefers explicit resource refs; if none, infers parents from shared `name-` prefixes
 * (at least two commands) so help still shows a hierarchy when the resource cache is empty.
 */
export function buildSubscriberHelpNodes(
  shorts: string[],
  resources: HelpResourceRef[],
): SubscriberHelpNode[] {
  const sortedShorts = [...shorts].sort();
  if (resources.length > 0) {
    const byLength = [...resources]
      .map((r) => r.key)
      .sort((a, b) => b.length - a.length);
    const labelByKey = new Map(
      resources.map((r) => [r.key, r.label] as const),
    );
    const grouped = new Map<string, string[]>();
    for (const r of resources) grouped.set(r.key, []);
    const leftover: string[] = [];
    for (const name of sortedShorts) {
      const key = byLength.find(
        (candidate) =>
          name === candidate || name.startsWith(`${candidate}-`),
      );
      if (key) grouped.get(key)!.push(name);
      else leftover.push(name);
    }
    const nodes: SubscriberHelpNode[] = [];
    for (const r of [...resources].sort((a, b) =>
      a.key.localeCompare(b.key),
    )) {
      const names = grouped.get(r.key) ?? [];
      if (names.length === 0) continue;
      nodes.push({
        label: resourceBranchLabel(r.key, labelByKey.get(r.key) ?? ""),
        children: names,
      });
    }
    for (const name of leftover) {
      nodes.push({ label: name, children: [] });
    }
    return nodes;
  }

  /** Infer parents from first hyphen segment when ≥2 commands share it. */
  const buckets = new Map<string, string[]>();
  const leftover: string[] = [];
  for (const name of sortedShorts) {
    const dash = name.indexOf("-");
    if (dash <= 0) {
      leftover.push(name);
      continue;
    }
    const prefix = name.slice(0, dash);
    const list = buckets.get(prefix) ?? [];
    list.push(name);
    buckets.set(prefix, list);
  }
  const nodes: SubscriberHelpNode[] = [];
  for (const prefix of [...buckets.keys()].sort()) {
    const names = buckets.get(prefix)!;
    if (names.length < 2) {
      leftover.push(...names);
      continue;
    }
    nodes.push({
      label: resourceBranchLabel(prefix, ""),
      children: names,
    });
  }
  leftover.sort();
  for (const name of leftover) {
    nodes.push({ label: name, children: [] });
  }
  return nodes;
}
