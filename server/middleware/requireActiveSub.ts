import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Middleware to ensure user has active subscription
export async function requireActiveSub(req: Request, res: Response, next: NextFunction) {
  const userId = req.session?.userId;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const user = await storage.getUser(userId);
  if (!user) {
    return res.status(401).json({ error: "User not found" });
  }

  // Check subscription status
  if (user.subscriptionStatus !== 'active' && user.subscriptionStatus !== 'trialing') {
    return res.status(402).json({ 
      error: 'Subscription required',
      message: 'Please subscribe to access this feature'
    });
  }

  next();
}
