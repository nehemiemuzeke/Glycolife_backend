import { Router, Response } from "express";
import { getDb } from "../config/db";
import { AuthRequest, authenticateToken } from "../middleware/auth";

const router = Router();

// 1. Ajouter une mesure de glycémie
router.post("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { valeur, date_mesure, moment, notes } = req.body;
    const db = await getDb();
    const dateToInsert = date_mesure || new Date().toISOString();

    const result = await db.run(
      `INSERT INTO glycemias (user_id, valeur, date_mesure, moment, notes) VALUES (?, ?, ?, ?, ?)`,
      [req.user!.id, valeur, dateToInsert, moment || 'Autre', notes || '']
    );

    const newRecord = await db.get(`SELECT * FROM glycemias WHERE id = ?`, [result.lastID]);
    res.status(201).json(newRecord);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 2. Obtenir l'historique de glycémie
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT * FROM glycemias WHERE user_id = ? ORDER BY date_mesure DESC`,
      [req.user!.id]
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// 3. Scanner QR Code : Décoder le Token QR et retourner l'historique réel
router.post("/share", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { qrToken } = req.body;
    if (!qrToken || typeof qrToken !== "string") {
      return res.status(400).json({ message: "Token QR manquant" });
    }

    const parts = qrToken.split("_");
    if (parts[0] !== "glycolife") {
      return res.status(400).json({ message: "Format de QR Code invalide" });
    }

    let targetUserId = req.user!.id;
    try {
      const decodedJson = Buffer.from(parts[1], "base64").toString("utf-8");
      const parsed = JSON.parse(decodedJson);
      if (parsed.id) targetUserId = parsed.id;
    } catch (err) {
      console.warn("Impossible de décoder l'ID du token QR, fallback sur l'utilisateur courant");
    }

    const db = await getDb();
    const rows = await db.all(
      `SELECT * FROM glycemias WHERE user_id = ? ORDER BY date_mesure DESC LIMIT 100`,
      [targetUserId]
    );

    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

export default router;