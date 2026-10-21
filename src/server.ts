import express from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { initDb } from "./config/db";

import authRoutes from "./routes/auth";
import glycemiaRoutes from "./routes/glycemia";
import messagesRoutes from "./routes/messages";
import usersRoutes from "./routes/users";
import patientRoutes from "./routes/patient";
import aiRoutes from "./routes/ai";
import contactsRoutes from "./routes/contacts";
import uploadRoutes from "./routes/upload";

dotenv.config();
const app = express();

// ── Middleware ──────────────────────────────
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Fichiers uploadés (audio, images des messages)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ── Health ─────────────────────────────────
app.get("/", (_req, res) =>
  res.json({
    status: "✅ GlycoLife API running",
    version: "1.0.0",
    endpoints: ["/api/v1/auth", "/api/v1/glycemia", "/api/v1/messages", "/api/v1/users", "/api/v1/patient", "/api/v1/ai"],
  })
);

// ── Routes principales /api/v1 ─────────────
const v1 = "/api/v1";
app.use(`${v1}/auth`, authRoutes);
app.use(`${v1}/glycemia`, glycemiaRoutes);
app.use(`${v1}/messages`, messagesRoutes);
app.use(`${v1}/users`, usersRoutes);
app.use(`${v1}/patient`, patientRoutes);
app.use(`${v1}/ai`, aiRoutes);
app.use(`${v1}/contacts`, contactsRoutes);
app.use(`${v1}/upload`, uploadRoutes);

// ── Alias pour ExportScreen qui utilise /api/glycemia ──
app.use("/api/glycemia", glycemiaRoutes);

// ── 404 ────────────────────────────────────
app.use("{*path}", (req, res) => {
  res.status(404).json({ message: `Route ${req.originalUrl} introuvable` });
});

// ── Start ──────────────────────────────────
const PORT = Number(process.env.PORT) || 4000;

initDb().then(() => {
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