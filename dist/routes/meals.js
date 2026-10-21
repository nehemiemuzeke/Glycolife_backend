"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const { description, type_repas, date_mesure, notes } = req.body;
        const db = await (0, db_1.getDb)();
        const dateToInsert = date_mesure || new Date().toISOString();
        const result = await db.run(`INSERT INTO meals (user_id, description, type_repas, date_mesure, notes) VALUES (?, ?, ?, ?, ?)`, [req.user.id, description, type_repas || 'Déjeuner', dateToInsert, notes || '']);
        const newRecord = await db.get(`SELECT * FROM meals WHERE id = ?`, [result.lastID]);
        res.status(201).json(newRecord);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const rows = await db.all(`SELECT * FROM meals WHERE user_id = ? ORDER BY date_mesure DESC`, [req.user.id]);
        res.json(rows);
    }
    catch (error) {
        res.status(500).json({ message: error.message });
    }
});
exports.default = router;
