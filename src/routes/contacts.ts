import { Router, Response } from "express";
import { getDb } from "../config/db";
import { AuthRequest, authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db.all(`SELECT * FROM contacts WHERE user_id = ? ORDER BY name ASC`, [req.user!.id]);
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone } = req.body;
    const db = await getDb();

    // Vérifier si le contact s'inscrit aussi sur GlycoLife via son téléphone
    const matchingUser = await db.get(`SELECT id, avatar FROM users WHERE telephone = ?`, [phone]);

    const result = await db.run(
      `INSERT INTO contacts (user_id, contact_user_id, name, phone, avatar) VALUES (?, ?, ?, ?, ?)`,
      [
        req.user!.id,
        matchingUser ? matchingUser.id : null,
        name,
        phone,
        matchingUser ? matchingUser.avatar : null
      ]
    );

    const newContact = await db.get(`SELECT * FROM contacts WHERE id = ?`, [result.lastID]);
    res.status(201).json({
      ...newContact,
      is_glycolife_user: Boolean(matchingUser)
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;