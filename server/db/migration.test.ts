import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createInitialInventory } from "@/features/vending-machine/domain/coinInventory";
import { RATE_LIMIT_ATTEMPTS } from "@/server/rate-limit/rateLimiter";
import { MIGRATION_PATH } from "./migrate";

const sql = readFileSync(MIGRATION_PATH, "utf8");

describe("initial migration", () => {
  it("seeds the machine with the same coins as the in-memory store", () => {
    const seed = sql.match(/VALUES \(1, '(\{[^']+\})'::jsonb, 0, 0\)/)?.[1];
    expect(seed).toBeDefined();
    expect(JSON.parse(seed as string)).toEqual(createInitialInventory());
  });

  it("caps stored attempts at the rate limit", () => {
    expect(sql).toContain(
      `CHECK (cardinality(attempts_ms) <= ${RATE_LIMIT_ATTEMPTS})`,
    );
  });
});
