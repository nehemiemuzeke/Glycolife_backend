import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "glycolife_super_secret_key_2025";

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // Sur les routes d'IA (/api/v1/ai/*), on ne bloque JAMAIS le patient
  const isAIRoute = req.originalUrl.includes("/ai");

  if (!token) {
    if (isAIRoute) {
      (req as any).user = { id: "patient_guest", role: "patient" };
      return next();
    }
    return res.status(401).json({ error: "Jeton d'authentification manquant." });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      if (isAIRoute) {
        // En cas de jeton expiré sur l'IA, on laisse passer sans bloquer l'utilisateur
        (req as any).user = { id: "patient_guest", role: "patient" };
        return next();
      }
      return res.status(401).json({ error: "Session expirée. Veuillez vous reconnecter." });
    }

    (req as any).user = user;
    next();
  });
};