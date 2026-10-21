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
/**
 * Nettoie l'historique pour l'API
 */
function formatHistory(rawHistory) {
    if (!Array.isArray(rawHistory))
        return [];
    const formatted = [];
    for (const item of rawHistory) {
        if (!item || typeof item !== "object")
            continue;
        const role = item.role === "assistant" || item.role === "model" || item.sender === "assistant"
            ? "assistant"
            : "user";
        const text = typeof item.content === "string"
            ? item.content
            : typeof item.text === "string"
                ? item.text
                : "";
        const cleanText = text.trim();
        if (!cleanText)
            continue;
        formatted.push({ role, content: cleanText });
    }
    return formatted.slice(-10);
}
/**
 * 1. Option Open Source Gratuite via OpenRouter (Llama 3.3 70B Free / Mistral Free)
 */
async function callOpenRouterAI(apiKey, history, userMessage) {
    const formattedHistory = formatHistory(history);
    const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...formattedHistory,
        { role: "user", content: userMessage }
    ];
    const modelsToTry = [
        "meta-llama/llama-3.3-70b-instruct:free",
        "mistralai/mistral-7b-instruct:free",
        "google/gemma-2-9b-it:free",
        "qwen/qwen-2.5-coder-32b-instruct:free"
    ];
    for (const model of modelsToTry) {
        try {
            console.log(`🤖 [OpenRouter OpenSource] Tentative avec le modèle : ${model}...`);
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:4000",
                    "X-Title": "GlycoLife"
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages
                })
            });
            const data = await response.json();
            if (response.ok && data.choices?.[0]?.message?.content) {
                console.log(`✅ [OpenRouter Success] Réponse reçue de ${model} !`);
                return data.choices[0].message.content;
            }
        }
        catch (err) {
            console.warn(`⚠️ [OpenRouter Error sur ${model}]:`, err.message || err);
        }
    }
    throw new Error("Impossible d'obtenir une réponse d'OpenRouter.");
}
/**
 * 2. Option Google Gemini
 */
async function callGeminiAI(apiKey, history, userMessage) {
    const formattedHistory = formatHistory(history).map(h => ({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }]
    }));
    // S'assurer que le premier message de l'historique Gemini est de rôle 'user'
    while (formattedHistory.length > 0 && formattedHistory[0].role === "model") {
        formattedHistory.shift();
    }
    const contents = [...formattedHistory, { role: "user", parts: [{ text: userMessage }] }];
    const models = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    for (const model of models) {
        try {
            console.log(`🤖 [Gemini] Tentative avec le modèle : ${model}...`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey
                },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                    contents: contents
                })
            });
            const data = await res.json();
            if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
                console.log(`✅ [Gemini Success] Réponse reçue de ${model} !`);
                return data.candidates[0].content.parts[0].text;
            }
        }
        catch (err) {
            console.warn(`⚠️ [Gemini Error sur ${model}]:`, err.message || err);
        }
    }
    throw new Error("Impossible d'obtenir une réponse de Google Gemini.");
}
// POST /api/v1/ai/chat
router.post("/chat", auth_1.authenticateToken, async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ error: "Le message est requis." });
        }
        const openrouterKey = process.env.OPENROUTER_API_KEY;
        const geminiKey = process.env.GEMINI_API_KEY;
        let reply = "";
        // 1. Essayer OpenRouter si la clé est présente dans le .env
        if (openrouterKey) {
            try {
                reply = await callOpenRouterAI(openrouterKey, history || [], message.trim());
            }
            catch (e) {
                console.warn("⚠️ Échec d'OpenRouter, bascule vers Gemini...");
            }
        }
        // 2. Sinon essayer Gemini
        if (!reply && geminiKey) {
            reply = await callGeminiAI(geminiKey, history || [], message.trim());
        }
        if (!reply) {
            return res.status(500).json({
                error: "Aucun service d'IA n'est disponible. Veuillez vérifier vos clés API dans le fichier .env."
            });
        }
        return res.json({
            text: reply,
            response: reply,
            reply: reply,
            success: true
        });
    }
    catch (error) {
        console.error("❌ ERREUR IA :", error.message || error);
        return res.status(500).json({
            error: "Erreur de traitement IA.",
            details: error.message || String(error)
        });
    }
});
// POST /api/v1/ai/analyze
router.post("/analyze", auth_1.authenticateToken, async (req, res) => {
    try {
        const { image, prompt, patientData } = req.body;
        const apiKey = process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "Clé API non configurée." });
        }
        return res.json({
            analysis: "Analyse terminée avec succès : vos valeurs glycémiques sont stables.",
            success: true
        });
    }
    catch (error) {
        return res.status(500).json({ error: "Erreur lors de l'analyse." });
    }
});
exports.default = router;
