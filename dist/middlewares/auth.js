"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || "glycolife_super_secret_key_2025";
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    // Sur les routes d'IA (/api/v1/ai/*), on ne bloque JAMAIS le patient
    const isAIRoute = req.originalUrl.includes("/ai");
    if (!token) {
        if (isAIRoute) {
            req.user = { id: "patient_guest", role: "patient" };
            return next();
        }
        return res.status(401).json({ error: "Jeton d'authentification manquant." });
    }
    jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            if (isAIRoute) {
                // En cas de jeton expiré sur l'IA, on laisse passer sans bloquer l'utilisateur
                req.user = { id: "patient_guest", role: "patient" };
                return next();
            }
            return res.status(401).json({ error: "Session expirée. Veuillez vous reconnecter." });
        }
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
