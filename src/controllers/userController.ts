import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const changeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export async function changePassword(req: Request, res: Response) {
  const parsed = changeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, error: "Invalid input" });

  const userId = (req as any).userId as string;
  const { currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ success: false, error: "User not found" });

  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, error: "Current password incorrect" });

  const newHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
  return res.status(200).json({ success: true });
}

export async function updateProfile(req: Request, res: Response) {
  const userId = (req as any).userId as string;
  const { name } = req.body as { name?: string };
  const user = await prisma.user.update({ where: { id: userId }, data: { name } });
  return res.status(200).json({ success: true, data: { id: user.id, name: user.name, email: user.email } });
}
