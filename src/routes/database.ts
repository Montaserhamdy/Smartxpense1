import { Router } from "express";
import type { Request, Response } from "express";
import { pool, query } from "../db/connection.js";
import type { ApiResponse } from "../types/index.js";

const router = Router();

/** GET /db/health — verifies the pool can reach Postgres. */
router.get("/health", async (_req: Request, res: Response<ApiResponse>) => {
  try {
    const result = await query<{ now: string }>("SELECT NOW() as now");
    res.status(200).json({
      success: true,
      data: {
        connected: true,
        serverTime: result.rows[0]?.now ?? null,
        totalConnections: pool.totalCount,
        idleConnections: pool.idleCount,
        waitingRequests: pool.waitingCount,
      },
    });
  } catch (err) {
    console.error("Database health check failed:", err);
    res.status(500).json({
      success: false,
      error: "Unable to connect to the database",
    });
  }
});

/** GET /db/tables — lists all tables in the public schema. */
router.get("/tables", async (_req: Request, res: Response<ApiResponse>) => {
  try {
    const result = await query<{ table_name: string }>(
      `SELECT table_name
       FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name;`
    );

    res.status(200).json({
      success: true,
      data: result.rows.map((row) => row.table_name),
    });
  } catch (err) {
    console.error("Failed to list tables:", err);
    res.status(500).json({
      success: false,
      error: "Unable to list database tables",
    });
  }
});

/** POST /db/test — writes and reads back a row to prove read/write works. */
router.post("/test", async (_req: Request, res: Response<ApiResponse>) => {
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS db_connection_tests (
        id SERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    const insertResult = await client.query<{ id: number; created_at: string }>(
      "INSERT INTO db_connection_tests DEFAULT VALUES RETURNING id, created_at;"
    );

    res.status(200).json({
      success: true,
      data: insertResult.rows[0],
    });
  } catch (err) {
    console.error("Database write/read test failed:", err);
    res.status(500).json({
      success: false,
      error: "Database write/read test failed",
    });
  } finally {
    client.release();
  }
});

export default router;
