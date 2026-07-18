import type { NextFunction, Request, Response } from "express";

/** Logs method, path, status code, and response time for every request. */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${durationMs.toFixed(1)}ms`
    );
  });

  next();
}

/** Catches unmatched routes and returns a consistent 404 payload. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

/** Centralized error handler. Must be registered last, after all routes. */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  console.error(err.stack ?? err.message);

  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
}
