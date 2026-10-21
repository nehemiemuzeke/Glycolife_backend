"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Toutes les routes nécessitent un token valide
router.use(auth_1.authenticateToken);
const userId = (req) => req.user.userId || req.user.id;
// ═══════════════════════════════════════════════════════════
//  MEALS (repas)
// ═══════════════════════════════════════════════════════════
// POST /health/meals
router.post("/meals", async (req, res) => {
    try {
        const { description, type_repas, date_mesure, notes } = req.body;
        if (!description) {
            return res.status(400).json({ message: "La description est requise" });
        }
        const db = await (0, db_1.getDb)();
        const result = await db.run(`INSERT INTO meals (user_id, description, type_repas, date_mesure, notes)
       VALUES (?, ?, ?, ?, ?)`, [userId(req), description, type_repas || null, date_mesure || new Date().toISOString(), notes || null]);
        const newMeal = await db.get(`SELECT * FROM meals WHERE id = ?`, [result.lastID]);
        res.status(201).json(newMeal);
    }
    catch (err) {
        console.error("POST /meals error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// GET /health/meals
router.get("/meals", async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const meals = await db.all(`SELECT * FROM meals WHERE user_id = ? ORDER BY date_mesure DESC`, [userId(req)]);
        res.json(meals);
    }
    catch (err) {
        console.error("GET /meals error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// GET /health/meals/:id
router.get("/meals/:id", async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const meal = await db.get(`SELECT * FROM meals WHERE id = ? AND user_id = ?`, [req.params.id, userId(req)]);
        if (!meal) {
            return res.status(404).json({ message: "Repas introuvable" });
        }
        res.json(meal);
    }
    catch (err) {
        console.error("GET /meals/:id error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// PUT /health/meals/:id
router.put("/meals/:id", async (req, res) => {
    try {
        const { description, type_repas, date_mesure, notes } = req.body;
        const db = await (0, db_1.getDb)();
        const existing = await db.get(`SELECT * FROM meals WHERE id = ? AND user_id = ?`, [req.params.id, userId(req)]);
        if (!existing) {
            return res.status(404).json({ message: "Repas introuvable" });
        }
        await db.run(`UPDATE meals
       SET description = COALESCE(?, description),
           type_repas  = COALESCE(?, type_repas),
           date_mesure = COALESCE(?, date_mesure),
           notes       = COALESCE(?, notes)
       WHERE id = ? AND user_id = ?`, [description, type_repas, date_mesure, notes, req.params.id, userId(req)]);
        const updated = await db.get(`SELECT * FROM meals WHERE id = ?`, [req.params.id]);
        res.json(updated);
    }
    catch (err) {
        console.error("PUT /meals/:id error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// DELETE /health/meals/:id
router.delete("/meals/:id", async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.run(`DELETE FROM meals WHERE id = ? AND user_id = ?`, [req.params.id, userId(req)]);
        if (result.changes === 0) {
            return res.status(404).json({ message: "Repas introuvable" });
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error("DELETE /meals/:id error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// ═══════════════════════════════════════════════════════════
//  MEDICATIONS (médicaments)
// ═══════════════════════════════════════════════════════════
// POST /health/medications
router.post("/medications", async (req, res) => {
    try {
        const { nom, dosage, date_prise, notes } = req.body;
        if (!nom) {
            return res.status(400).json({ message: "Le nom du médicament est requis" });
        }
        const db = await (0, db_1.getDb)();
        const result = await db.run(`INSERT INTO medications (user_id, nom, dosage, date_prise, notes)
       VALUES (?, ?, ?, ?, ?)`, [userId(req), nom, dosage || null, date_prise || new Date().toISOString(), notes || null]);
        const newMed = await db.get(`SELECT * FROM medications WHERE id = ?`, [result.lastID]);
        res.status(201).json(newMed);
    }
    catch (err) {
        console.error("POST /medications error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// GET /health/medications
router.get("/medications", async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const meds = await db.all(`SELECT * FROM medications WHERE user_id = ? ORDER BY date_prise DESC`, [userId(req)]);
        res.json(meds);
    }
    catch (err) {
        console.error("GET /medications error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// GET /health/medications/:id
router.get("/medications/:id", async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const med = await db.get(`SELECT * FROM medications WHERE id = ? AND user_id = ?`, [req.params.id, userId(req)]);
        if (!med) {
            return res.status(404).json({ message: "Médicament introuvable" });
        }
        res.json(med);
    }
    catch (err) {
        console.error("GET /medications/:id error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// PUT /health/medications/:id
router.put("/medications/:id", async (req, res) => {
    try {
        const { nom, dosage, date_prise, notes } = req.body;
        const db = await (0, db_1.getDb)();
        const existing = await db.get(`SELECT * FROM medications WHERE id = ? AND user_id = ?`, [req.params.id, userId(req)]);
        if (!existing) {
            return res.status(404).json({ message: "Médicament introuvable" });
        }
        await db.run(`UPDATE medications
       SET nom       = COALESCE(?, nom),
           dosage    = COALESCE(?, dosage),
           date_prise = COALESCE(?, date_prise),
           notes     = COALESCE(?, notes)
       WHERE id = ? AND user_id = ?`, [nom, dosage, date_prise, notes, req.params.id, userId(req)]);
        const updated = await db.get(`SELECT * FROM medications WHERE id = ?`, [req.params.id]);
        res.json(updated);
    }
    catch (err) {
        console.error("PUT /medications/:id error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// DELETE /health/medications/:id
router.delete("/medications/:id", async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const result = await db.run(`DELETE FROM medications WHERE id = ? AND user_id = ?`, [req.params.id, userId(req)]);
        if (result.changes === 0) {
            return res.status(404).json({ message: "Médicament introuvable" });
        }
        res.json({ success: true });
    }
    catch (err) {
        console.error("DELETE /medications/:id error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
exports.default = router;
