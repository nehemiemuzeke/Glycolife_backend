import { Router, Response } from "express";
import { getDb } from "../config/db";
import { AuthRequest, authenticateToken } from "../middleware/auth";

const router = Router();

router.get("/:contactPhone", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contactPhone } = req.params;
    const db = await getDb();

    const targetUser = await db.get(`SELECT id FROM users WHERE telephone = ?`, [contactPhone]);

    if (!targetUser) {
      return res.json([]);
    }

    const rows = await db.all(
      `SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [req.user!.id, targetUser.id, targetUser.id, req.user!.id]
    );

    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { contactPhone, content, type } = req.body;
    const db = await getDb();

    let targetUser = await db.get(`SELECT id FROM users WHERE telephone = ?`, [contactPhone]);

    if (!targetUser) {
      // Si pas encore d'utilisateur avec ce numéro, on en crée un fantôme pour stocker le chat
      const placeholderEmail = `guest_${Date.now()}@glycolife.local`;
      const resultUser = await db.run(
        `INSERT INTO users (email, telephone, nom) VALUES (?, ?, ?)`,
        [placeholderEmail, contactPhone, contactPhone]
      );
      targetUser = { id: resultUser.lastID };
    }

    const result = await db.run(
      `INSERT INTO messages (sender_id, receiver_id, contact_phone, content, type) VALUES (?, ?, ?, ?, ?)`,
      [req.user!.id, targetUser.id, contactPhone, content, type || 'text']
    );

    const newMsg = await db.get(`SELECT * FROM messages WHERE id = ?`, [result.lastID]);
    res.status(201).json(newMsg);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;