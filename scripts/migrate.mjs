import { readFile } from "node:fs/promises";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = await readFile(
  new URL("../server/db/migrations/001_initial.sql", import.meta.url),
  "utf8",
);
const client = new pg.Client({ connectionString });
await client.connect();
try {
  await client.query(sql);
  console.log("Migration applied");
} finally {
  await client.end();
}
