import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "glycolife_secret_key_2025_sqlite";

export interface AuthRequest extends Request {
  user?: {
    id: number | string;
    email: string;
    role?: string;
  };
}

export type AuthenticatedRequest = AuthRequest;

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Acc�s refus�. Jeton manquant." });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ error: "Jeton invalide ou expir�." });
    }
    req.user = decoded;
    next();
  });
};

export default authenticateToken;
