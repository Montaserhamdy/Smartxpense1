import express, { type Application, type Request, type Response } from "express";
import cors from "cors";
import apiRouter from "./routes/index.js";
import { errorHandler, notFoundHandler, requestLogger } from "./middleware/index.js";
import type { HealthStatus } from "./types/index.js";
import { checkDatabaseConnection } from "./db/connection.js";
import { runMigrations } from "./db/migrations.js";

const app: Application = express();

app.use(cors());
app.use(express.json());
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

async function start(): Promise<void> {
  const isConnected = await checkDatabaseConnection();

  if (isConnected) {
    try {
      await runMigrations();
    } catch (err) {
      console.error("Startup migrations failed:", err);
    }
  } else {
    console.error(
      "Starting server without a verified database connection. Database-backed routes will fail until connectivity is restored."
    );
  }

  app.listen(PORT, () => {
    console.log(`smartxpense-backend listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start smartxpense-backend:", err);
  process.exit(1);
});

export default app;
