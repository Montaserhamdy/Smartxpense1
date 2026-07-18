import { Router } from "express";
import type { Request, Response } from "express";
import { getHealth } from "../controllers/healthController.js";
import databaseRouter from "./database.js";
import usersRouter from "./users.js";
import type { ApiResponse, StatusInfo } from "../types/index.js";

const router = Router();

router.get("/health", getHealth);

router.use("/db", databaseRouter);
router.use("/users", usersRouter);

router.get("/status", (_req: Request, res: Response<ApiResponse<StatusInfo>>) => {
  res.status(200).json({
    success: true,
    data: {
      service: "smartxpense-backend",
      environment: process.env.NODE_ENV ?? "development",
      version: "0.1.0",
    },
  });
});

router.post("/echo", (req: Request, res: Response<ApiResponse>) => {
  res.status(200).json({
    success: true,
    data: req.body,
  });
});

export default router;
