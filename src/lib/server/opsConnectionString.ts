/**
 * Ops database on the same Postgres instance as a product URL.
 * The path after the host is the database name (not a schema).
 * Laptop product `kickstaff_dev` → `kickagent_ops_dev`.
 * Any other product database (staging/prod) → `kickagent_ops` on that same host and port.
 *
 * Temporary until the host passes `opsDatabase` from a dataset row.
 */
export function opsConnectionString(productUrl: string): string {
  const url = new URL(productUrl);
  const productDb = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const opsDb = productDb === "kickstaff_dev" ? "kickagent_ops_dev" : "kickagent_ops";
  url.pathname = `/${opsDb}`;
  return url.toString();
}
