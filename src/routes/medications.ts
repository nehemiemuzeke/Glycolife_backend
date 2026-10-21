import { Router, Response } from "express";
import { getDb } from "../config/db";
import { AuthRequest, authenticateToken } from "../middleware/auth";

const router = Router();

router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { nom, dosage, date_prise, notes } = req.body;
    const db = await getDb();
    const dateToInsert = date_prise || new Date().toISOString();

    const result = await db.run(
      `INSERT INTO medications (user_id, nom, dosage, date_prise, notes) VALUES (?, ?, ?, ?, ?)`,
      [req.user!.id, nom, dosage || '', dateToInsert, notes || '']
    );

    const newRecord = await db.get(`SELECT * FROM medications WHERE id = ?`, [result.lastID]);
    res.status(201).json(newRecord);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM medications WHERE user_id = ? ORDER BY date_prise DESC`, [req.user!.id]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;