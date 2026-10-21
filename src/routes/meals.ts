import { Router, Response } from "express";
import { getDb } from "../config/db";
import { AuthRequest, authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { description, type_repas, date_mesure, notes } = req.body;
    const db = await getDb();
    const dateToInsert = date_mesure || new Date().toISOString();

    const result = await db.run(
      `INSERT INTO meals (user_id, description, type_repas, date_mesure, notes) VALUES (?, ?, ?, ?, ?)`,
      [req.user!.id, description, type_repas || 'Déjeuner', dateToInsert, notes || '']
    );

    const newRecord = await db.get(`SELECT * FROM meals WHERE id = ?`, [result.lastID]);
    res.status(201).json(newRecord);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM meals WHERE user_id = ? ORDER BY date_mesure DESC`, [req.user!.id]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;