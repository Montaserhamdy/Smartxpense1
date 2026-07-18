import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

/**
 * Central Postgres connection pool.
 *
 * Configuration is sourced from environment variables. `DATABASE_URL` takes
 * precedence when present (the common case on Railway); otherwise the
 * individual PG* variables are used.
 */
const connectionString = process.env.DATABASE_URL;

export const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl:
          process.env.NODE_ENV === "production"
            ? { rejectUnauthorized: false }
            : undefined,
      }
    : {
        host: process.env.PGHOST ?? "localhost",
        port: Number(process.env.PGPORT) || 5432,
        user: process.env.PGUSER ?? "postgres",
        password: process.env.PGPASSWORD ?? "postgres",
        database: process.env.PGDATABASE ?? "smartxpense",
      }
);

pool.on("error", (err: Error) => {
  console.error("Unexpected error on idle Postgres client", err);
});

/**
 * Verifies the pool can reach the database. Intended to be called once on
 * application startup so failures are surfaced early and loudly.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  let client: PoolClient | undefined;

  try {
    client = await pool.connect();
    await client.query("SELECT 1");
    console.log("Database connection established successfully");
    return true;
  } catch (err) {
    console.error("Failed to connect to the database:", err);
    return false;
  } finally {
    client?.release();
  }
}

/** Thin typed wrapper around `pool.query` for use across the app. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export default pool;
