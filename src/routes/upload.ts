import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { pool } from "../config/db";
import { authenticateToken, AuthRequest } from "../middleware/auth";

const router = Router();
router.use(authenticateToken);

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/v1/upload/photo
router.post("/photo", upload.single("photo"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Fichier manquant" });
    const photoUrl = `/uploads/${req.file.filename}`;
    await pool.query(`UPDATE users SET photo_url = ? WHERE id = ?`, [photoUrl, req.user!.userId]);
    res.json({ success: true, photo_url: photoUrl });
  } catch (e: any) {
    res.status(500).json({ message: "Erreur upload" });
  }
});

// POST /api/v1/upload/audio (pour messages vocaux)
router.post("/audio", upload.single("audio"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Fichier manquant" });
    const audioUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, audio_url: audioUrl });
  } catch (e: any) {
    res.status(500).json({ message: "Erreur upload" });
  }
});

export default router;