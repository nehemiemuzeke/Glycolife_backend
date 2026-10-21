import { Router, Response } from "express";
import { getDb } from "../config/db";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();

// Middleware d'authentification pour toutes les routes patient
router.use(authenticateToken as any);

// GET / - Obtenir le profil/données du patient connecté
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Non autorisé" });
    }

    const patient = await db.get(
      "SELECT id, name, email, role, telephone, avatar, created_at FROM users WHERE id = ?",
      [userId]
    );

    if (!patient) {
      return res.status(404).json({ error: "Patient non trouvé" });
    }

    res.json(patient);
  } catch (error) {
    console.error("Erreur patient:", error);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

export default router;