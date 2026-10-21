"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const patients_1 = __importDefault(require("./routes/patients"));
const ai_1 = __importDefault(require("./routes/ai"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// 🟢 CORS totalement ouvert pour le mobile & web
app.use((0, cors_1.default)({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json({ limit: "10mb" }));
// Routes API
app.use("/api/v1/auth", auth_1.default);
app.use("/api/v1/patients", patients_1.default);
app.use("/api/v1/ai", ai_1.default);
// Route de réveil / santé
app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "GlycoLife Backend" });
});
app.get("/api/v1", (_req, res) => {
    res.json({ status: "ok", message: "Bienvenue sur l'API GlycoLife" });
});
app.listen(PORT, () => {
    console.log(`
🚀 ═══════════════════════════════════════
   GlycoLife Backend démarré
   http://localhost:${PORT}
   API: http://localhost:${PORT}/api/v1
   ═══════════════════════════════════════
  `);
});
