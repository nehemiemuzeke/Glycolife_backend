"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const auth_1 = __importDefault(require("./routes/auth"));
const glycemia_1 = __importDefault(require("./routes/glycemia"));
const messages_1 = __importDefault(require("./routes/messages"));
const users_1 = __importDefault(require("./routes/users"));
const patient_1 = __importDefault(require("./routes/patient"));
const ai_1 = __importDefault(require("./routes/ai"));
const contacts_1 = __importDefault(require("./routes/contacts"));
const upload_1 = __importDefault(require("./routes/upload"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// ── Middleware ──────────────────────────────
app.use((0, cors_1.default)({
    origin: [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ],
    credentials: true,
}));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// Fichiers uploadés (audio, images des messages)
app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads")));
// ── Health ─────────────────────────────────
app.get("/", (_req, res) => res.json({
    status: "✅ GlycoLife API running",
    version: "1.0.0",
    endpoints: ["/api/v1/auth", "/api/v1/glycemia", "/api/v1/messages", "/api/v1/users", "/api/v1/patient", "/api/v1/ai"],
}));
// ── Routes principales /api/v1 ─────────────
const v1 = "/api/v1";
app.use(`${v1}/auth`, auth_1.default);
app.use(`${v1}/glycemia`, glycemia_1.default);
app.use(`${v1}/messages`, messages_1.default);
app.use(`${v1}/users`, users_1.default);
app.use(`${v1}/patient`, patient_1.default);
app.use(`${v1}/ai`, ai_1.default);
app.use(`${v1}/contacts`, contacts_1.default);
app.use(`${v1}/upload`, upload_1.default);
// ── Alias pour ExportScreen qui utilise /api/glycemia ──
app.use("/api/glycemia", glycemia_1.default);
// ── 404 ────────────────────────────────────
app.use("{*path}", (req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} introuvable` });
});
// ── Start ──────────────────────────────────
const PORT = Number(process.env.PORT) || 4000;
(0, db_1.initDb)().then(() => {
    app.listen(PORT, () => {
        console.log(`\n🚀 ═══════════════════════════════════════`);
        console.log(`   GlycoLife Backend démarré`);
        console.log(`   http://localhost:${PORT}`);
        console.log(`   API: http://localhost:${PORT}/api/v1`);
        console.log(`   IA:  Groq (llama-3.3-70b-versatile)`);
        console.log(`   DB:  Supabase PostgreSQL`);
        console.log(`   ═══════════════════════════════════════\n`);
    });
});
