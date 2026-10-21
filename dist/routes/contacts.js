"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const rows = await db.all(`SELECT * FROM contacts WHERE user_id = ? ORDER BY name ASC`, [req.user.id]);
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const { name, phone } = req.body;
        const db = await (0, db_1.getDb)();
        // Vérifier si le contact s'inscrit aussi sur GlycoLife via son téléphone
        const matchingUser = await db.get(`SELECT id, avatar FROM users WHERE telephone = ?`, [phone]);
        const result = await db.run(`INSERT INTO contacts (user_id, contact_user_id, name, phone, avatar) VALUES (?, ?, ?, ?, ?)`, [
            req.user.id,
            matchingUser ? matchingUser.id : null,
            name,
            phone,
            matchingUser ? matchingUser.avatar : null
        ]);
        const newContact = await db.get(`SELECT * FROM contacts WHERE id = ?`, [result.lastID]);
        res.status(201).json({
            ...newContact,
            is_glycolife_user: Boolean(matchingUser)
        });
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.default = router;
