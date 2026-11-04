import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ManifestResources } from "../kickagent/manifestResourceCache.ts";
import {
  filterNavDestinations,
  listNavDestinations,
} from "./navDestinations.ts";

const resources = {
  units: { label: "Units", shortLabel: "Units" },
  listDetail: {
    gl: { label: "General Ledger Accounts", shortLabel: "GL" },
  },
} as unknown as ManifestResources;

describe("listNavDestinations", () => {
  it("hides admin and ops destinations from a non-admin", () => {
    const hrefs = listNavDestinations("user", resources).map((d) => d.href);
    assert.ok(hrefs.includes("/"));
    assert.ok(hrefs.includes("/rent/cda"));
    assert.ok(hrefs.includes("/settings/dashboard"));
    assert.equal(hrefs.includes("/admin/users"), false);
    assert.equal(hrefs.includes("/ops/gl"), false);
    assert.equal(hrefs.includes("/ops/units"), false);
  });

  it("includes admin pages and manifest ops pages for an admin", () => {
    const hrefs = listNavDestinations("admin", resources).map((d) => d.href);
    assert.ok(hrefs.includes("/admin/rental-links"));
    assert.ok(hrefs.includes("/admin/users"));
    assert.ok(hrefs.includes("/admin/datasets"));
    assert.ok(hrefs.includes("/ops/gl"));
    assert.ok(hrefs.includes("/ops/units"));
  });
});

describe("filterNavDestinations", () => {
  it("matches a substring of the label or path", () => {
    const all = listNavDestinations("admin", resources);
    const labels = filterNavDestinations(all, "ledger").map((d) => d.label);
    assert.deepEqual(labels, ["General Ledger Accounts"]);
    const byPath = filterNavDestinations(all, "/ops/gl").map((d) => d.href);
    assert.deepEqual(byPath, ["/ops/gl"]);
  });
});
