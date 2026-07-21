import express, { type Application, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRouter from "./routes/index.js";
import { errorHandler, notFoundHandler, requestLogger } from "./middleware/index.js";
import type { HealthStatus } from "./types/index.js";

const app: Application = express();

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(requestLogger);

app.get("/health", (_req: Request, res: Response<HealthStatus>) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", apiRouter);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`smartxpense-backend listening on port ${PORT}`);
});

export default app;
