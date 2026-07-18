import { pool } from "./connection.js";

/**
 * Creates the base schema if it does not already exist. This is a lightweight
 * bootstrap for initial development — not a replacement for a full migration
 * tool (e.g. Prisma migrate) in the long run.
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL,
        category VARCHAR(255),
        description TEXT,
        date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    `);

    await client.query("COMMIT");
    console.log("Database migrations applied successfully");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Failed to run database migrations:", err);
    throw err;
  } finally {
    client.release();
  }
}
