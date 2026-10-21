"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/:contactPhone", auth_1.authenticateToken, async (req, res) => {
    try {
        const { contactPhone } = req.params;
        const db = await (0, db_1.getDb)();
        const targetUser = await db.get(`SELECT id FROM users WHERE telephone = ?`, [contactPhone]);
        if (!targetUser) {
            return res.json([]);
        }
        const rows = await db.all(`SELECT * FROM messages 
       WHERE (sender_id = ? AND receiver_id = ?) 
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`, [req.user.id, targetUser.id, targetUser.id, req.user.id]);
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const { contactPhone, content, type } = req.body;
        const db = await (0, db_1.getDb)();
        let targetUser = await db.get(`SELECT id FROM users WHERE telephone = ?`, [contactPhone]);
        if (!targetUser) {
            // Si pas encore d'utilisateur avec ce numéro, on en crée un fantôme pour stocker le chat
            const placeholderEmail = `guest_${Date.now()}@glycolife.local`;
            const resultUser = await db.run(`INSERT INTO users (email, telephone, nom) VALUES (?, ?, ?)`, [placeholderEmail, contactPhone, contactPhone]);
            targetUser = { id: resultUser.lastID };
        }
        const result = await db.run(`INSERT INTO messages (sender_id, receiver_id, contact_phone, content, type) VALUES (?, ?, ?, ?, ?)`, [req.user.id, targetUser.id, contactPhone, content, type || 'text']);
        const newMsg = await db.get(`SELECT * FROM messages WHERE id = ?`, [result.lastID]);
        res.status(201).json(newMsg);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.default = router;
