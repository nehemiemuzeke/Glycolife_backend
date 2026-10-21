import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "glycolife_super_secret_key_2025";

export interface AuthRequest extends Request {
  user?: any;
}

export type AuthenticatedRequest = AuthRequest;

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  const isAIRoute = req.originalUrl && req.originalUrl.includes("/ai");

  if (!token) {
    if (isAIRoute) {
      (req as AuthRequest).user = { id: "guest", role: "patient" };
      return next();
    }
    return res.status(401).json({ error: "Jeton d'authentification manquant." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (isAIRoute) {
        (req as AuthRequest).user = { id: "guest", role: "patient" };
        return next();
      }
      return res.status(401).json({ error: "Session expirée. Veuillez vous reconnecter." });
    }

    (req as AuthRequest).user = user;
    next();
  });
};