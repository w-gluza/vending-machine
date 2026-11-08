import { Pool, type PoolClient } from "pg";

export type QueryResult<Row> = { rows: Row[]; rowCount: number };

export type Db = {
  query<Row>(text: string, params?: unknown[]): Promise<QueryResult<Row>>;
  transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T>;
  end(): Promise<void>;
};

const STATEMENT_TIMEOUT_MS = 5_000;
const CONNECTION_TIMEOUT_MS = 5_000;
const IDLE_TIMEOUT_MS = 10_000;
const MAX_CONNECTIONS = 2;

export const createDb = (connectionString: string): Db => {
  const pool = new Pool({
    connectionString,
    max: MAX_CONNECTIONS,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    statement_timeout: STATEMENT_TIMEOUT_MS,
    query_timeout: STATEMENT_TIMEOUT_MS,
  });

  return {
    async query(text, params = []) {
      const result = await pool.query(text, params);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    },
    async transaction(work) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const value = await work(client);
        await client.query("COMMIT");
        return value;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    },
    end: () => pool.end(),
  };
};
