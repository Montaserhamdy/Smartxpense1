import type { Request, Response } from "express";
import type { HealthStatus } from "../types/index.js";

export function getHealth(_req: Request, res: Response<HealthStatus>): void {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
}
