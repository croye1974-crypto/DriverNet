import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Middleware to ensure user is admin or moderator
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  if (user.role !== 'admin' && user.role !== 'moderator') {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}
