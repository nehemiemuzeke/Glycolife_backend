"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET / - Liste complète des rendez-vous de l'utilisateur
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const rows = await db.all(`SELECT * FROM appointments 
       WHERE user_id = ? 
       ORDER BY date ASC`, [req.user.id]);
        res.json(rows);
    }
    catch (e) {
        console.error("Erreur appointments:", e);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
// POST /appointments — créer
router.post("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const { type, title, description, date, recurrence, notification_enabled, notification_minutes_before, doctor_name, doctor_specialty, medication_dosage, } = req.body;
        if (!title || !date) {
            return res.status(400).json({ message: "Titre et date requis" });
        }
        const db = await (0, db_1.getDb)();
        const result = await db.run(`INSERT INTO appointments
        (user_id, type, title, description, date, recurrence,
         notification_enabled, notification_minutes_before,
         doctor_name, doctor_specialty, medication_dosage, completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`, [
            req.user.id, type, title, description || "",
            date, recurrence || "none",
            notification_enabled ? 1 : 0,
            notification_minutes_before || 30,
            doctor_name || null, doctor_specialty || null,
            medication_dosage || null,
        ]);
        const created = await db.get(`SELECT * FROM appointments WHERE id = ?`, [result.lastID]);
        res.status(201).json(created);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// PUT /appointments/:id — modifier / toggle complete
router.put("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const db = await (0, db_1.getDb)();
        // Vérifier que le RDV appartient à l'utilisateur
        const existing = await db.get(`SELECT * FROM appointments WHERE id = ? AND user_id = ?`, [id, req.user.id]);
        if (!existing) {
            return res.status(404).json({ message: "Rendez-vous introuvable" });
        }
        // Merge partiel : ne mettre à jour que les champs fournis
        const fields = [
            "type", "title", "description", "date", "recurrence",
            "notification_enabled", "notification_minutes_before",
            "doctor_name", "doctor_specialty", "medication_dosage", "completed",
        ];
        const updates = [];
        const values = [];
        for (const f of fields) {
            if (req.body[f] !== undefined) {
                updates.push(`${f} = ?`);
                values.push(typeof req.body[f] === "boolean" ? (req.body[f] ? 1 : 0) : req.body[f]);
            }
        }
        if (updates.length === 0) {
            return res.status(400).json({ message: "Aucun champ à modifier" });
        }
        values.push(id, req.user.id);
        await db.run(`UPDATE appointments SET ${updates.join(", ")}
       WHERE id = ? AND user_id = ?`, values);
        const updated = await db.get(`SELECT * FROM appointments WHERE id = ?`, [id]);
        res.json(updated);
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// DELETE /appointments/:id
router.delete("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.run(`DELETE FROM appointments WHERE id = ? AND user_id = ?`, [req.params.id, req.user.id]);
        if (result.changes === 0) {
            return res.status(404).json({ message: "Rendez-vous introuvable" });
        }
        res.json({ message: "Supprimé" });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
exports.default = router;
