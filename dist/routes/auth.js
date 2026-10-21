"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const google_auth_library_1 = require("google-auth-library");
const db_1 = require("../config/db");
const jwt_1 = require("../utils/jwt");
const router = (0, express_1.Router)();
const googleClient = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// ═══════════════════════════════════════════════
//  POST /auth/register
// ═══════════════════════════════════════════════
router.post("/register", async (req, res) => {
    try {
        const { email, password, prenom, nom, telephone } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email et mot de passe requis" });
        }
        const db = await (0, db_1.getDb)();
        const exists = await db.get(`SELECT id FROM users WHERE email = ?`, [email]);
        if (exists) {
            return res.status(400).json({ message: "Email déjà utilisé" });
        }
        const hash = await bcryptjs_1.default.hash(password, 10);
        const result = await db.run(`INSERT INTO users (email, password, prenom, nom, telephone, role, provider)
       VALUES (?, ?, ?, ?, ?, 'patient', 'local')`, [email, hash, prenom || "", nom || "", telephone || ""]);
        const user = await db.get(`SELECT id, email, prenom, nom, telephone, role, avatar FROM users WHERE id = ?`, [result.lastID]);
        const accessToken = (0, jwt_1.signToken)({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        res.status(201).json({ accessToken, token: accessToken, user });
    }
    catch (e) {
        console.error("Register error:", e);
        res.status(500).json({ message: e.message });
    }
});
// ═══════════════════════════════════════════════
//  POST /auth/login
// ═══════════════════════════════════════════════
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email et mot de passe requis" });
        }
        const db = await (0, db_1.getDb)();
        const user = await db.get(`SELECT * FROM users WHERE email = ?`, [email]);
        if (!user || !user.password) {
            return res.status(401).json({ message: "Identifiants invalides" });
        }
        const ok = await bcryptjs_1.default.compare(password, user.password);
        if (!ok) {
            return res.status(401).json({ message: "Identifiants invalides" });
        }
        const accessToken = (0, jwt_1.signToken)({
            id: user.id,
            email: user.email,
            role: user.role,
        });
        const { password: _, reset_token, reset_expires, ...safeUser } = user;
        res.json({ accessToken, token: accessToken, user: safeUser });
    }
    catch (e) {
        console.error("Login error:", e);
        res.status(500).json({ message: e.message });
    }
});
// ═══════════════════════════════════════════════
//  POST /auth/google
// ═══════════════════════════════════════════════
router.post("/google", async (req, res) => {
    try {
        const { token, email, given_name, family_name, sub } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email requis" });
        }
        // Vérif optionnelle du token Google
        if (token) {
            try {
                const ticket = await googleClient.getTokenInfo(token);
                if (ticket.email && ticket.email !== email) {
                    return res.status(401).json({ message: "Token Google invalide" });
                }
            }
            catch {
                console.warn("⚠️ Vérification token Google échouée (dev mode)");
            }
        }
        const db = await (0, db_1.getDb)();
        // Chercher par email OU google_id — SANS colonnes fragiles
        let user = await db.get(`SELECT id, email, prenom, nom, telephone, role, google_id, provider, avatar
       FROM users
       WHERE email = ? OR (google_id IS NOT NULL AND google_id = ?)`, [email, sub || ""]);
        if (!user) {
            // Créer le compte
            const insert = await db.run(`INSERT INTO users (email, prenom, nom, provider, google_id, role)
         VALUES (?, ?, ?, 'google', ?, 'patient')`, [email, given_name || "", family_name || "", sub || null]);
            user = await db.get(`SELECT id, email, prenom, nom, telephone, role, google_id, provider, avatar
         FROM users WHERE id = ?`, [insert.lastID]);
        }
        else {
            // Mettre à jour google_id si besoin
            if (sub && !user.google_id) {
                await db.run(`UPDATE users
           SET google_id = ?, provider = 'google', updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`, [sub, user.id]);
                user.google_id = sub;
                user.provider = "google";
            }
            // Compléter prénom/nom s'ils sont vides
            if ((!user.prenom || !user.nom) && (given_name || family_name)) {
                await db.run(`UPDATE users
           SET prenom = COALESCE(NULLIF(prenom, ''), ?),
               nom    = COALESCE(NULLIF(nom, ''), ?),
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`, [given_name || "", family_name || "", user.id]);
                user.prenom = user.prenom || given_name || "";
                user.nom = user.nom || family_name || "";
            }
        }
        if (!user) {
            return res.status(500).json({ message: "Impossible de créer / récupérer l'utilisateur" });
        }
        const accessToken = (0, jwt_1.signToken)({
            id: user.id,
            email: user.email,
            role: user.role || "patient",
        });
        // Ne jamais renvoyer password / tokens
        const safeUser = {
            id: user.id,
            email: user.email,
            prenom: user.prenom,
            nom: user.nom,
            telephone: user.telephone,
            role: user.role || "patient",
            avatar: user.avatar || null,
            provider: user.provider || "google",
        };
        res.json({ accessToken, token: accessToken, user: safeUser });
    }
    catch (e) {
        console.error("Google auth error:", e);
        res.status(500).json({ message: e.message });
    }
});
// ═══════════════════════════════════════════════
//  POST /auth/forgot-password
// ═══════════════════════════════════════════════
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        const db = await (0, db_1.getDb)();
        const user = await db.get(`SELECT id FROM users WHERE email = ?`, [email]);
        // Toujours OK pour ne pas révéler si l'email existe
        if (!user) {
            return res.json({ message: "Si l'email existe, un lien a été envoyé" });
        }
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const expires = new Date(Date.now() + 3600000).toISOString();
        await db.run(`UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?`, [token, expires, email]);
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        if (process.env.SMTP_USER && process.env.SMTP_PASS) {
            const transporter = nodemailer_1.default.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT || 587),
                secure: false,
                auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
            });
            await transporter.sendMail({
                from: `"GlycoLife" <${process.env.SMTP_USER}>`,
                to: email,
                subject: "Réinitialisation de votre mot de passe GlycoLife",
                html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#16a34a">GlycoLife</h2>
            <p>Cliquez pour réinitialiser votre mot de passe :</p>
            <a href="${resetLink}" style="display:inline-block;padding:12px 24px;
              background:#16a34a;color:white;border-radius:8px;text-decoration:none">
              Réinitialiser mon mot de passe
            </a>
            <p style="color:#888;font-size:12px">Expire dans 1 heure.</p>
          </div>`,
            });
        }
        else {
            console.log("🔗 Lien de reset (SMTP non configuré) :", resetLink);
        }
        res.json({ message: "Email de réinitialisation envoyé" });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
// ═══════════════════════════════════════════════
//  POST /auth/reset-password
// ═══════════════════════════════════════════════
router.post("/reset-password", async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).json({ message: "Token et mot de passe requis" });
        }
        const db = await (0, db_1.getDb)();
        const user = await db.get(`SELECT id FROM users
       WHERE reset_token = ?
         AND reset_expires IS NOT NULL
         AND datetime(reset_expires) > datetime('now')`, [token]);
        if (!user) {
            return res.status(400).json({ message: "Token invalide ou expiré" });
        }
        const hash = await bcryptjs_1.default.hash(password, 10);
        await db.run(`UPDATE users
       SET password = ?, reset_token = NULL, reset_expires = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`, [hash, user.id]);
        res.json({ message: "Mot de passe modifié avec succès" });
    }
    catch (e) {
        res.status(500).json({ message: e.message });
    }
});
exports.default = router;
