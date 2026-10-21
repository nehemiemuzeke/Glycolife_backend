"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const init_1 = require("../db/init");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Toutes les routes de ce fichier nécessitent un token valide
router.use(auth_1.authenticateToken);
const userId = (req) => req.user.userId;
// ═══════════════════════════════════════════════════════════
//  MEALS  (repas)
// ═══════════════════════════════════════════════════════════
// POST /health/meals
router.post("/meals", async (req, res) => {
    try {
        const { description, type_repas, date_mesure, notes } = req.body;
        if (!description) {
            return res.status(400).json({ message: "La description est requise" });
        }
        const result = await init_1.pool.query(`INSERT INTO meals (user_id, description, type_repas, date_mesure, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [userId(req), description, type_repas || null, date_mesure || new Date(), notes || null]);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error("POST /meals error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// GET /health/meals
router.get("/meals", async (req, res) => {
    try {
        const result = await init_1.pool.query(`SELECT * FROM meals
       WHERE user_id = $1
       ORDER BY date_mesure DESC`, [userId(req)]);
        res.json(result.rows);
    }
    catch (err) {
        console.error("GET /meals error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// GET /health/meals/:id
router.get("/meals/:id", async (req, res) => {
    try {
        const result = await init_1.pool.query(`SELECT * FROM meals WHERE id = $1 AND user_id = $2`, [req.params.id, userId(req)]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Repas introuvable" });
        }
        res.json(result.rows[0]);
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
        const result = await init_1.pool.query(`UPDATE meals
       SET description = COALESCE($1, description),
           type_repas  = COALESCE($2, type_repas),
           date_mesure = COALESCE($3, date_mesure),
           notes       = COALESCE($4, notes)
       WHERE id = $5 AND user_id = $6
       RETURNING *`, [description, type_repas, date_mesure, notes, req.params.id, userId(req)]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Repas introuvable" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error("PUT /meals/:id error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// DELETE /health/meals/:id
router.delete("/meals/:id", async (req, res) => {
    try {
        const result = await init_1.pool.query(`DELETE FROM meals WHERE id = $1 AND user_id = $2 RETURNING id`, [req.params.id, userId(req)]);
        if (result.rows.length === 0) {
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
//  MEDICATIONS  (médicaments)
// ═══════════════════════════════════════════════════════════
// POST /health/medications
router.post("/medications", async (req, res) => {
    try {
        const { nom, dosage, date_prise, notes } = req.body;
        if (!nom) {
            return res.status(400).json({ message: "Le nom du médicament est requis" });
        }
        const result = await init_1.pool.query(`INSERT INTO medications (user_id, nom, dosage, date_prise, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [userId(req), nom, dosage || null, date_prise || new Date(), notes || null]);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error("POST /medications error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// GET /health/medications
router.get("/medications", async (req, res) => {
    try {
        const result = await init_1.pool.query(`SELECT * FROM medications
       WHERE user_id = $1
       ORDER BY date_prise DESC`, [userId(req)]);
        res.json(result.rows);
    }
    catch (err) {
        console.error("GET /medications error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// GET /health/medications/:id
router.get("/medications/:id", async (req, res) => {
    try {
        const result = await init_1.pool.query(`SELECT * FROM medications WHERE id = $1 AND user_id = $2`, [req.params.id, userId(req)]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Médicament introuvable" });
        }
        res.json(result.rows[0]);
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
        const result = await init_1.pool.query(`UPDATE medications
       SET nom       = COALESCE($1, nom),
           dosage    = COALESCE($2, dosage),
           date_prise = COALESCE($3, date_prise),
           notes     = COALESCE($4, notes)
       WHERE id = $5 AND user_id = $6
       RETURNING *`, [nom, dosage, date_prise, notes, req.params.id, userId(req)]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Médicament introuvable" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error("PUT /medications/:id error:", err.message);
        res.status(500).json({ message: "Erreur serveur" });
    }
});
// DELETE /health/medications/:id
router.delete("/medications/:id", async (req, res) => {
    try {
        const result = await init_1.pool.query(`DELETE FROM medications WHERE id = $1 AND user_id = $2 RETURNING id`, [req.params.id, userId(req)]);
        if (result.rows.length === 0) {
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
