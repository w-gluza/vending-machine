import { readFile } from "node:fs/promises";
import type { Db } from "./client";

export const MIGRATION_PATH = new URL(
  "./migrations/001_initial.sql",
  import.meta.url,
);

export const migrate = async (db: Db): Promise<void> => {
  await db.query(await readFile(MIGRATION_PATH, "utf8"));
};
