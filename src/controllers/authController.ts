import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { signAccessToken, signRefreshToken } from "../lib/jwt.js";

const registerSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function setRefreshCookie(res: Response, token: string) {
  const secure = process.env.NODE_ENV === "production";
  res.cookie("refresh_token", token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    maxAge: (() => {
      const v = process.env.JWT_REFRESH_TTL ?? "30d";
      const days = Number(v.replace(/[^0-9]/g, "")) || 30;
      return days * 24 * 60 * 60 * 1000;
    })(),
    path: "/",
  });
}

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: parsed.error.errors[0]?.message ?? "Invalid input" });

  const { name, username, email, password } = parsed.data;
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) return res.status(409).json({ success: false, error: "Email or username already in use" });

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { name, username, email, passwordHash } });

  const rawRefresh = crypto.randomBytes(64).toString("hex");
  const refreshHash = hashToken(rawRefresh);
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  const accessToken = signAccessToken({ userId: user.id });
  const refreshToken = signRefreshToken({ userId: user.id, sessionId: session.id });
  setRefreshCookie(res, rawRefresh);

  return res.status(201).json({
    success: true,
    data: { token: accessToken, user: { id: user.id, name: user.name, username: user.username, email: user.email } },
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Invalid input" });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ success: false, error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ success: false, error: "Invalid email or password" });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const rawRefresh = crypto.randomBytes(64).toString("hex");
  const refreshHash = hashToken(rawRefresh);
  const session = await prisma.session.create({
    data: {
      userId: user.id,
      refreshTokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      userAgent: req.headers["user-agent"] as string | undefined,
      ipAddress: (req.ip ?? req.socket.remoteAddress) as string | undefined,
    },
  });

  const accessToken = signAccessToken({ userId: user.id });
  const refreshToken = signRefreshToken({ userId: user.id, sessionId: session.id });
  setRefreshCookie(res, rawRefresh);

  return res.status(200).json({
    success: true,
    data: { token: accessToken, user: { id: user.id, name: user.name, username: user.username, email: user.email } },
  });
}

export async function me(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ success: false, error: "User not found" });
  return res.status(200).json({ success: true, data: { id: user.id, name: user.name, username: user.username, email: user.email } });
}

export async function logout(req: Request, res: Response) {
  const rawRefresh = req.cookies?.refresh_token as string | undefined;
  if (rawRefresh) {
    const refreshHash = hashToken(rawRefresh);
    await prisma.session.deleteMany({ where: { refreshTokenHash: refreshHash } });
  }
  res.clearCookie("refresh_token", { path: "/" });
  return res.status(200).json({ success: true });
}
