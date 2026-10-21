"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Middleware d'authentification pour toutes les routes patient
router.use(auth_1.authenticateToken);
// GET / - Obtenir le profil/données du patient connecté
router.get("/", async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Non autorisé" });
        }
        const patient = await db.get("SELECT id, name, email, role, telephone, avatar, created_at FROM users WHERE id = ?", [userId]);
        if (!patient) {
            return res.status(404).json({ error: "Patient non trouvé" });
        }
        res.json(patient);
    }
    catch (error) {
        console.error("Erreur patient:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
});
exports.default = router;
