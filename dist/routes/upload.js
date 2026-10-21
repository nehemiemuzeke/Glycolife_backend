"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
const uploadDir = path_1.default.join(process.cwd(), "uploads");
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
const storage = multer_1.default.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
    },
});
const upload = (0, multer_1.default)({ storage, limits: { fileSize: 5 * 1024 * 1024 } });
// POST /api/v1/upload/photo
router.post("/photo", upload.single("photo"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: "Fichier manquant" });
        const photoUrl = `/uploads/${req.file.filename}`;
        await db_1.pool.query(`UPDATE users SET photo_url = ? WHERE id = ?`, [photoUrl, req.user.userId]);
        res.json({ success: true, photo_url: photoUrl });
    }
    catch (e) {
        res.status(500).json({ message: "Erreur upload" });
    }
});
// POST /api/v1/upload/audio (pour messages vocaux)
router.post("/audio", upload.single("audio"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: "Fichier manquant" });
        const audioUrl = `/uploads/${req.file.filename}`;
        res.json({ success: true, audio_url: audioUrl });
    }
    catch (e) {
        res.status(500).json({ message: "Erreur upload" });
    }
});
exports.default = router;
