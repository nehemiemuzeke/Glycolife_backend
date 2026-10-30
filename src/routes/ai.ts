import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";

const router = Router();

const SYSTEM_PROMPT = `Tu es GlycoIA, un assistant virtuel bienveillant, chaleureux et hautement qualifié, spécialisé dans l'accompagnement personnalisé des personnes atteintes de diabète (Type 1, Type 2, et Diabète Gestationnel).

RÈGLES IMPORTANTES :
1. Réponds TOUJOURS en Français.
2. Sois empathique, clair, encourageant et concis.
3. Ne donne JAMAIS de prescription médicale directe ni de modifications de dosages d'insuline strictes.
4. Aide à interpréter la glycémie, donner des conseils nutritionnels, et encourager l'activité physique adaptative.
5. Sois direct et réponds sans exposer tes réflexions internes.`;

let cachedWorkingModel: string | null = null;

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

function isChatModel(id: string): boolean {
  if (!id) return false;
  const lower = id.toLowerCase();
  // Exclure les modèles non-chat (guard, whisper, TTS, vision-only, etc.)
  const blocked = [
    "guard", "prompt-guard", "whisper", "tts", "distil",
    "safety", "moderation", "embedding", "rerank", "tool-use"
  ];
  if (blocked.some((b) => lower.includes(b))) return false;
  return true;
}

function formatHistoryForGroq(rawHistory: any[]) {
  if (!Array.isArray(rawHistory)) return [];
  const formatted: { role: "user" | "assistant"; content: string }[] = [];

  for (const item of rawHistory) {
    if (!item || typeof item !== "object") continue;
    const role: "user" | "assistant" =
      item.role === "assistant" || item.role === "model" || item.sender === "assistant"
        ? "assistant"
        : "user";
    const text =
      typeof item.content === "string" ? item.content
      : typeof item.text === "string" ? item.text
      : "";
    const clean = text.trim();
    if (!clean) continue;
    // Fusionner 2 messages consécutifs du même rôle
    if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
      formatted[formatted.length - 1].content += "\n" + clean;
    } else {
      formatted.push({ role, content: clean });
    }
  }
  return formatted.slice(-10);
}

async function getAvailableGroqChatModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) throw new Error("list models failed");
    const data: any = await response.json();
    const ids: string[] = (data.data || [])
      .map((m: any) => m.id)
      .filter((id: string) => isChatModel(id));

    // Prioriser les modèles préférés s'ils sont présents
    const preferred = PREFERRED_CHAT_MODELS.filter((p) => ids.includes(p));
    const others = ids.filter((id) => !preferred.includes(id));
    const ordered = [...preferred, ...others];
    if (ordered.length > 0) return ordered;
  } catch {
    console.warn("⚠️ Liste dynamique Groq indisponible → fallback statique.");
  }
  return [...PREFERRED_CHAT_MODELS];
}

async function generateGroqChatResponse(
  apiKey: string,
  rawHistory: any[],
  userMessage: string
): Promise<string> {
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

      const data: any = await res.json();
      if (res.ok && data.choices?.[0]?.message?.content) {
        cachedWorkingModel = model;
        console.log(`✅ [Groq Success] ${model}`);
        return data.choices[0].message.content;
      }
      lastError = data.error?.message || JSON.stringify(data);
      console.warn(`⚠️ [Groq ${model}] ${lastError}`);
    } catch (err: any) {
      lastError = err.message || String(err);
      console.warn(`⚠️ [Groq ${model} fetch] ${lastError}`);
    }
  }

  throw new Error(`Tous les modèles Groq chat ont échoué. Dernière erreur : ${lastError}`);
}

router.post("/chat", authenticateToken, async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error("❌ ERREUR GROQ :", error.message || error);
    return res.status(500).json({
      error: "Impossible de contacter Groq.",
      details: error.message || String(error),
    });
  }
});

router.post("/analyze", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { prompt, patientData } = req.body;
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GROQ_API_KEY non configurée." });

    const userMsg = `${prompt || "Analyse ces données glycémiques."}\nDonnées: ${JSON.stringify(patientData || {})}`;
    const analysis = await generateGroqChatResponse(apiKey, [], userMsg);
    return res.json({ analysis, success: true });
  } catch (error: any) {
    return res.status(500).json({ error: "Erreur analyse IA." });
  }
});

// ──────────────────────────────────────────────
// VISION : Analyse de nourriture
// ──────────────────────────────────────────────

const VISION_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "meta-llama/llama-4-maverick-17b-128e-instruct",
  "llama-3.2-11b-vision-preview",
  "llama-3.2-90b-vision-preview",
];

const FOOD_ANALYSIS_PROMPT = `Tu es un nutritionniste expert spécialisé dans le diabète. 
Analyse cette photo de nourriture et retourne UNIQUEMENT un JSON valide (sans texte avant/après, sans markdown) avec cette structure exacte :

{
  "aliment": "Nom du plat identifié",
  "portion_estimee": "Description de la portion (ex: 1 assiette, 250g)",
  "calories": 450,
  "glucides_g": 55,
  "proteines_g": 20,
  "lipides_g": 15,
  "fibres_g": 5,
  "index_glycemique": "bas|moyen|eleve",
  "impact_glycemie": "Explication courte (1-2 phrases) de l'impact sur la glycémie",
  "conseil_diabete": "Un conseil pratique pour une personne diabétique (1-2 phrases)",
  "aliments_detectes": ["aliment1", "aliment2"],
  "confiance": "haute|moyenne|faible"
}

Si l'image ne contient PAS de nourriture, retourne :
{"erreur": "Aucune nourriture détectée sur l'image"}

Sois précis dans l'estimation des calories en te basant sur la portion visible.`;

async function analyzeFoodImage(apiKey: string, imageBase64: string): Promise<any> {
  let lastError = "";

  for (const model of VISION_MODELS) {
    try {
      console.log(`🍽️ [Vision] Tentative : ${model}...`);

      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: FOOD_ANALYSIS_PROMPT },
                {
                  type: "image_url",
                  image_url: {
                    url: imageBase64.startsWith("data:")
                      ? imageBase64
                      : `data:image/jpeg;base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.3,
          max_tokens: 1024,
          response_format: { type: "json_object" },
        }),
      });

      const data: any = await res.json();

      if (res.ok && data.choices?.[0]?.message?.content) {
        console.log(`✅ [Vision Success] ${model}`);
        const rawContent = data.choices[0].message.content;

        // Parser le JSON de la réponse
        try {
          // Nettoyer d'éventuels backticks markdown
          const cleaned = rawContent
            .replace(/```json\n?/g, "")
            .replace(/```\n?/g, "")
            .trim();
          const parsed = JSON.parse(cleaned);
          return { ...parsed, model_utilise: model };
        } catch (parseErr) {
          console.warn("⚠️ JSON invalide, retour brut");
          return { raw: rawContent, model_utilise: model };
        }
      }

      lastError = data.error?.message || JSON.stringify(data);
      console.warn(`⚠️ [Vision ${model}] ${lastError}`);
    } catch (err: any) {
      lastError = err.message || String(err);
      console.warn(`⚠️ [Vision ${model} fetch] ${lastError}`);
    }
  }

  throw new Error(`Tous les modèles vision ont échoué. Dernière erreur : ${lastError}`);
}

// ──────────────────────────────────────────────
// ROUTE : POST /api/v1/ai/analyze-food
// ──────────────────────────────────────────────
router.post("/analyze-food", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      return res.status(400).json({
        error: "Le champ 'image' (base64) est requis.",
      });
    }

    // Vérifier taille (max ~4MB en base64)
    if (image.length > 6_000_000) {
      return res.status(413).json({
        error: "Image trop volumineuse. Max 4 MB.",
      });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY manquante." });
    }

    console.log("🍽️ Analyse nutritionnelle en cours...");
    const result = await analyzeFoodImage(apiKey, image);

    if (result.erreur) {
      return res.status(422).json({
        success: false,
        error: result.erreur,
      });
    }

    return res.json({
      success: true,
      analysis: result,
    });
  } catch (error: any) {
    console.error("❌ ERREUR VISION :", error.message || error);
    return res.status(500).json({
      error: "Impossible d'analyser l'image.",
      details: error.message || String(error),
    });
  }
});

export default router;