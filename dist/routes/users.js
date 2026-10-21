"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Middleware d'authentification sur toutes les routes utilisateurs
router.use(auth_1.authenticateToken);
// GET / - Profil de l'utilisateur connecté
const getProfileHandler = async (req, res) => {
    try {
        const db = await (0, db_1.getDb)();
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: "Utilisateur non identifié" });
        }
        const user = await db.get("SELECT id, name, email, role, telephone, avatar, created_at FROM users WHERE id = ?", [userId]);
        if (!user) {
            return res.status(404).json({ error: "Utilisateur non trouvé" });
        }
        res.json(user);
    }
    catch (error) {
        console.error("Erreur récupération profil:", error);
        res.status(500).json({ error: "Erreur serveur" });
    }
};
router.get("/", getProfileHandler);
router.get("/me/profile", getProfileHandler);
exports.default = router;
