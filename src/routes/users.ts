import { Router } from "express";
import type { Request, Response } from "express";
import { query } from "../db/connection.js";
import type { ApiResponse } from "../types/index.js";

const router = Router();

interface UserRow {
  id: number;
  email: string;
  name: string | null;
  created_at: string;
}

/** GET /users — returns all users (password hashes are never exposed). */
router.get("/", async (_req: Request, res: Response<ApiResponse>) => {
  try {
    const result = await query<UserRow>(
      "SELECT id, email, name, created_at FROM users ORDER BY id ASC;"
    );

    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Failed to fetch users:", err);
    res.status(500).json({ success: false, error: "Unable to fetch users" });
  }
});

/** POST /users — creates a new user. Expects { email, password, name }. */
router.post("/", async (req: Request, res: Response<ApiResponse>) => {
  const { email, password, name } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).json({
      success: false,
      error: "email and password are required",
    });
    return;
  }

  try {
    // NOTE: password hashing (bcrypt/argon2) should be wired in before this
    // endpoint is used for real accounts. Stored as-is for now.
    const result = await query<UserRow>(
      `INSERT INTO users (email, password_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, email, name, created_at;`,
      [email, password, name ?? null]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Failed to create user:", err);
    res.status(500).json({ success: false, error: "Unable to create user" });
  }
});

/** GET /users/:id — returns a single user by id. */
router.get("/:id", async (req: Request, res: Response<ApiResponse>) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    res.status(400).json({ success: false, error: "id must be an integer" });
    return;
  }

  try {
    const result = await query<UserRow>(
      "SELECT id, email, name, created_at FROM users WHERE id = $1;",
      [id]
    );

    const user = result.rows[0];
    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    console.error("Failed to fetch user:", err);
    res.status(500).json({ success: false, error: "Unable to fetch user" });
  }
});

export default router;
