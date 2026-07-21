import type { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const forgotSchema = z.object({ email: z.string().email() });
const resetSchema = z.object({ email: z.string().email(), token: z.string().min(10), newPassword: z.string().min(6) });

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getTransporter() {
  if (process.env.NODE_ENV === "production") {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  // dev: fallback that logs to console
  return {
    sendMail: async (opts: any) => {
      console.log("DEV MAIL SEND", opts);
      return Promise.resolve();
    },
  } as unknown as nodemailer.Transporter;
}

export async function forgotPassword(req: Request, res: Response) {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Invalid email" });

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(200).json({ success: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.user.update({ where: { id: user.id }, data: { resetTokenHash: tokenHash, resetTokenExpiry: expiry } });

  const resetUrl = `${process.env.FRONTEND_URL?.replace(/\/$/, "")}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

  const transporter = await getTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_FROM ?? "no-reply@smartxpense.local",
    to: email,
    subject: "SmartXpense — Reset your password",
    html: `Click <a href="${resetUrl}">here to reset your password</a>. This link expires in one hour.`,
  });

  return res.status(200).json({ success: true });
}

export async function resetPassword(req: Request, res: Response) {
  const parsed = resetSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Invalid input" });

  const { email, token, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.resetTokenHash || !user.resetTokenExpiry) {
    return res.status(400).json({ success: false, error: "Invalid token or expired" });
  }

  if (user.resetTokenExpiry.getTime() < Date.now()) {
    return res.status(400).json({ success: false, error: "Invalid token or expired" });
  }

  const tokenHash = hashToken(token);
  if (tokenHash !== user.resetTokenHash) {
    return res.status(400).json({ success: false, error: "Invalid token or expired" });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash, resetTokenHash: null, resetTokenExpiry: null } });

  return res.status(200).json({ success: true });
}
