import express, { type Application, type Request, type Response } from "express";
import cors from "cors";
import apiRouter from "./routes/index.js";
import { errorHandler, notFoundHandler, requestLogger } from "./middleware/index.js";
import { pingDatabase } from "./db/index.js";
import type { HealthStatus } from "./types/index.js";

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/health", async (_req: Request, res: Response<HealthStatus>) => {
  const database = await pingDatabase();

  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database,
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
