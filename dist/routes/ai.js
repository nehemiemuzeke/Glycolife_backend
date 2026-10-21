"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const SYSTEM_PROMPT = `Tu es GlycoIA, un assistant virtuel bienveillant, chaleureux et hautement qualifié, spécialisé dans l'accompagnement personnalisé des personnes atteintes de diabète (Type 1, Type 2, et Diabète Gestationnel).

RÈGLES IMPORTANTES :
1. Réponds TOUJOURS en Français.
2. Sois empathique, clair, encourageant et concis.
3. Ne donne JAMAIS de prescription médicale directe ni de modifications de dosages d'insuline strictes.
4. Aide à interpréter la glycémie, donner des conseils nutritionnels, et encourager l'activité physique adaptative.
5. Sois direct et réponds sans exposer tes réflexions internes.`;
let cachedWorkingModel = null;
/** Modèles de chat connus et fiables chez Groq (ordre de préférence) */
const PREFERRED_CHAT_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-70b-versatile",
    "llama-3.1-8b-instant",
    "llama3-70b-8192",
    "llama3-8b-8192",
    "mixtral-8x7b-32768",
    "gemma2-9b-it",
    "qwen/qwen3-32b",
];
function isChatModel(id) {
    if (!id)
        return false;
    const lower = id.toLowerCase();
    // Exclure les modèles non-chat (guard, whisper, TTS, vision-only, etc.)
    const blocked = [
        "guard", "prompt-guard", "whisper", "tts", "distil",
        "safety", "moderation", "embedding", "rerank", "tool-use"
    ];
    if (blocked.some((b) => lower.includes(b)))
        return false;
    return true;
}
function formatHistoryForGroq(rawHistory) {
    if (!Array.isArray(rawHistory))
        return [];
    const formatted = [];
    for (const item of rawHistory) {
        if (!item || typeof item !== "object")
            continue;
        const role = item.role === "assistant" || item.role === "model" || item.sender === "assistant"
            ? "assistant"
            : "user";
        const text = typeof item.content === "string" ? item.content
            : typeof item.text === "string" ? item.text
                : "";
        const clean = text.trim();
        if (!clean)
            continue;
        // Fusionner 2 messages consécutifs du même rôle
        if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
            formatted[formatted.length - 1].content += "\n" + clean;
        }
        else {
            formatted.push({ role, content: clean });
        }
    }
    return formatted.slice(-10);
}
async function getAvailableGroqChatModels(apiKey) {
    try {
        const response = await fetch("https://api.groq.com/openai/v1/models", {
            headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (!response.ok)
            throw new Error("list models failed");
        const data = await response.json();
        const ids = (data.data || [])
            .map((m) => m.id)
            .filter((id) => isChatModel(id));
        // Prioriser les modèles préférés s'ils sont présents
        const preferred = PREFERRED_CHAT_MODELS.filter((p) => ids.includes(p));
        const others = ids.filter((id) => !preferred.includes(id));
        const ordered = [...preferred, ...others];
        if (ordered.length > 0)
            return ordered;
    }
    catch {
        console.warn("⚠️ Liste dynamique Groq indisponible → fallback statique.");
    }
    return [...PREFERRED_CHAT_MODELS];
}
async function generateGroqChatResponse(apiKey, rawHistory, userMessage) {
    const available = await getAvailableGroqChatModels(apiKey);
    const modelsToTry = cachedWorkingModel
        ? [cachedWorkingModel, ...available]
        : available;
    const unique = Array.from(new Set(modelsToTry)).filter(isChatModel);
    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...formatHistoryForGroq(rawHistory),
        { role: "user", content: userMessage },
    ];
    let lastError = "";
    for (const model of unique) {
        try {
            console.log(`🤖 [Groq] Tentative : ${model}...`);
            const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature: 0.6,
                    max_tokens: 1024,
                }),
            });
            const data = await res.json();
            if (res.ok && data.choices?.[0]?.message?.content) {
                cachedWorkingModel = model;
                console.log(`✅ [Groq Success] ${model}`);
                return data.choices[0].message.content;
            }
            lastError = data.error?.message || JSON.stringify(data);
            console.warn(`⚠️ [Groq ${model}] ${lastError}`);
        }
        catch (err) {
            lastError = err.message || String(err);
            console.warn(`⚠️ [Groq ${model} fetch] ${lastError}`);
        }
    }
    throw new Error(`Tous les modèles Groq chat ont échoué. Dernière erreur : ${lastError}`);
}
router.post("/chat", auth_1.authenticateToken, async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ error: "Le champ 'message' est requis." });
        }
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "GROQ_API_KEY manquante dans .env" });
        }
        console.log(`📩 Message patient : "${message}"`);
        const reply = await generateGroqChatResponse(apiKey, history || [], message.trim());
        return res.json({ text: reply, response: reply, reply, success: true });
    }
    catch (error) {
        console.error("❌ ERREUR GROQ :", error.message || error);
        return res.status(500).json({
            error: "Impossible de contacter Groq.",
            details: error.message || String(error),
        });
    }
});
router.post("/analyze", auth_1.authenticateToken, async (req, res) => {
    try {
        const { prompt, patientData } = req.body;
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey)
            return res.status(500).json({ error: "GROQ_API_KEY non configurée." });
        const userMsg = `${prompt || "Analyse ces données glycémiques."}\nDonnées: ${JSON.stringify(patientData || {})}`;
        const analysis = await generateGroqChatResponse(apiKey, [], userMsg);
        return res.json({ analysis, success: true });
    }
    catch (error) {
        return res.status(500).json({ error: "Erreur analyse IA." });
    }
});
exports.default = router;
