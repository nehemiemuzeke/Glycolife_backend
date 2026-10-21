import { Router, Response } from "express";
import { getDb } from "../config/db";
import { authenticateToken, AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

// Middleware d'authentification sur toutes les routes utilisateurs
router.use(authenticateToken as any);

// GET / - Profil de l'utilisateur connecté
const getProfileHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Utilisateur non identifié" });
    }

    const user = await db.get(
      "SELECT id, name, email, role, telephone, avatar, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    res.json(user);
  } catch (error) {
    console.error("Erreur récupération profil:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
};

router.get("/", getProfileHandler as any);
router.get("/me/profile", getProfileHandler as any);

export default router;