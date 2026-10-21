import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import patientRoutes from "./routes/patients";
import aiRoutes from "./routes/ai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// 🟢 CORS totalement ouvert pour le mobile & web
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "10mb" }));

// Routes API
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/patients", patientRoutes);
app.use("/api/v1/ai", aiRoutes);

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