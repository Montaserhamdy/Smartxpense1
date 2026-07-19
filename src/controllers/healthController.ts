import type { Request, Response } from "express";
import { pingDatabase } from "../db/index.js";
import type { HealthStatus } from "../types/index.js";

export async function getHealth(_req: Request, res: Response<HealthStatus>): Promise<void> {
  const database = await pingDatabase();

  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database,
  });
}
