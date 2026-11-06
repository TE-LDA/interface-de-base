import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { Mistral } from "@mistralai/mistralai";

const MODEL = "mistral-small-latest";
const PORT = Number(process.env.PORT ?? 3000);

const apiKey = process.env.MISTRAL_API_KEY;
if (!apiKey) {
  console.error(
    "MISTRAL_API_KEY est absente : créez chat-mistral/.env à partir de .env.example et renseignez votre clé."
  );
  process.exit(1);
}

const client = new Mistral({ apiKey });

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const app = express();
app.use(express.json({ limit: "1mb" }));

app.post("/api/chat", async (req, res) => {
  const messages = req.body?.messages;
  const valid =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every(
      (m) =>
        m !== null &&
        typeof m === "object" &&
        (m.role === "system" || m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    );
  if (!valid) {
    return res
      .status(400)
      .json({ error: "Corps attendu : { \"messages\": [{ \"role\", \"content\" }] }" });
  }
  const maxTokens =
    typeof req.body?.maxTokens === "number" && req.body.maxTokens > 0
      ? Math.min(Math.floor(req.body.maxTokens), 1024)
      : undefined;

  try {
    const completion = await client.chat.complete({
      model: MODEL,
      messages: messages as ChatMessage[],
      ...(maxTokens ? { maxTokens } : {}),
    });
    const content = completion.choices?.[0]?.message?.content;
    const reply =
      typeof content === "string"
        ? content
        : (content?.map((chunk) => ("text" in chunk ? chunk.text : "")).join("") ?? "");
    res.json({ reply });
  } catch (err) {
    console.error("Erreur API Mistral:", err);
    res.status(502).json({ error: "Échec de l'appel à l'API Mistral." });
  }
});

// ---------- Contrat Bailli + sanitization ----------

const ASSET_CATS = ["château", "ferme", "grenier", "moulin", "marché", "port", "auberge", "maison", "tour", "église", "scriptorium"];

function clampInt(v: unknown, min: number, max: number): number {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.max(min, Math.min(max, Math.round(v)))
    : 0;
}

function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const p: unknown = JSON.parse(raw);
    if (p && typeof p === "object") return p as Record<string, unknown>;
    return null;
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const p: unknown = JSON.parse(m[0]);
        if (p && typeof p === "object") return p as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function sanitizeContract(raw: string, budget: number) {
  const fallback = {
    narrative_response: raw.slice(0, 600) || "Le Bailli n'a rien compris à l'ordre.",
    state_updates: { treasury_change: 0, unrest_change: 0, prestige_change: 0 },
    comparative_simulation: undefined as unknown,
  };
  const o = parseJson(raw);
  if (!o) return fallback;

  const narrative =
    typeof o.narrative_response === "string" && o.narrative_response
      ? o.narrative_response.slice(0, 800)
      : raw.slice(0, 600) || fallback.narrative_response;

  const su =
    o.state_updates && typeof o.state_updates === "object"
      ? (o.state_updates as Record<string, unknown>)
      : {};
  const state_updates = {
    treasury_change: clampInt(su.treasury_change, -Math.max(1, budget), 100),
    unrest_change: clampInt(su.unrest_change, -15, 15),
    prestige_change: clampInt(su.prestige_change, -15, 15),
  };

  let new_asset_queue: Record<string, unknown> | undefined;
  if (su.new_asset_queue && typeof su.new_asset_queue === "object") {
    const q = su.new_asset_queue as Record<string, unknown>;
    const cat = typeof q.cat === "string" && ASSET_CATS.includes(q.cat) ? q.cat : "marché";
    new_asset_queue = {
      id: String(q.id ?? `asset_${Date.now()}`).slice(0, 60),
      name: String(q.name ?? "chantier").slice(0, 80),
      level: clampInt(q.level, 1, 3) || 1,
      construction_ticks: Math.max(1, Math.min(12, clampInt(q.construction_ticks, 1, 12) || 1)),
      monthly_revenue: clampInt(q.monthly_revenue, 0, 50),
      monthly_upkeep: clampInt(q.monthly_upkeep, 0, 20),
      cat,
    };
    state_updates.treasury_change = Math.min(state_updates.treasury_change, 0);
  }

  let comparative_simulation: unknown;
  if (o.comparative_simulation && typeof o.comparative_simulation === "object") {
    const cs = o.comparative_simulation as Record<string, unknown>;
    const num = (v: unknown) => clampInt(v, -9999, 9999);
    const base = cs.baseline && typeof cs.baseline === "object" ? (cs.baseline as Record<string, unknown>) : {};
    const en = cs.enacted && typeof cs.enacted === "object" ? (cs.enacted as Record<string, unknown>) : {};
    const rows = Array.isArray(cs.tradeoff_summary) ? cs.tradeoff_summary.slice(0, 8) : [];
    comparative_simulation = {
      baseline: Object.fromEntries(Object.entries(base).slice(0, 8).map(([k, v]) => [k, num(v)])),
      enacted: Object.fromEntries(Object.entries(en).slice(0, 8).map(([k, v]) => [k, num(v)])),
      tradeoff_summary: rows
        .filter((r) => r && typeof r === "object")
        .map((r) => {
          const row = r as Record<string, unknown>;
          return {
            metric: String(row.metric ?? "").slice(0, 60),
            impact: typeof row.impact === "number" ? num(row.impact) : String(row.impact ?? "").slice(0, 40),
            delta: String(row.delta ?? "").slice(0, 80),
          };
        }),
    };
  }

  return { narrative_response: narrative, state_updates: { ...state_updates, ...(new_asset_queue ? { new_asset_queue } : {}) }, comparative_simulation };
}

app.post("/api/order", async (req, res) => {
  const order = req.body?.order;
  if (typeof order !== "string" || order.trim().length === 0 || order.length > 500) {
    return res
      .status(400)
      .json({ error: "Corps attendu : { \"order\": \"...\", \"state\": {...} }" });
  }
  const stateObj = req.body?.state && typeof req.body.state === "object" ? req.body.state as Record<string, unknown> : {};
  const stateSummary = JSON.stringify(stateObj).slice(0, 4000);
  const budget =
    typeof stateObj.budget === "number" && Number.isFinite(stateObj.budget)
      ? Math.max(0, Math.floor(stateObj.budget))
      : 9999;

  const system = [
    "Tu es le Bailli principal et Chancelier du domaine seigneurial.",
    "Ton rôle est d'analyser les ordres libres ou arbitrages du Seigneur et de générer une simulation chiffrée comparative rigoureuse.",
    "RÈGLES D'ANALYSE :",
    "1. ÉVALUATION DE POSTURE : identifie si le Seigneur valide (VALIDATION), refuse (REFUS), négocie à la baisse (NEGOCIATION_BASSE), surinvestit (SURINVESTISSEMENT), ou impose corvée/loi (DECRET_LIBRE).",
    "2. COMPARAISON DE DATAS : génère systématiquement les métriques de base (proposition du Conseil) et les métriques réelles adaptées aux exigences du Seigneur.",
    "   - Surinvestissement (+💰) : réduit les délais (ticks), augmente le niveau initial ou le rendement.",
    "   - Négociation basse (-💰) : augmente le délai, le risque de malfaçon/usure, ou baisse le rendement.",
    "   - Corvée : réduit le coût en or, mais augmente l'inquiétude (unrest) et pénalise la nourriture.",
    "3. FORMAT DE SORTIE : réponds EXCLUSIVEMENT avec un objet JSON valide, sans texte autour :",
    '{ "player_intent": { "raw_input": string, "posture": "VALIDATION|REFUS|NEGOCIATION_BASSE|SURINVESTISSEMENT|DECRET_LIBRE", "target_asset": string },',
    '  "comparative_simulation": { "baseline": { "cost": int, "construction_ticks": int, "projected_level": 1-3, "risk_factor": int },',
    '    "enacted": { idem }, "tradeoff_summary": [ { "metric": string, "impact": int|string, "delta": string } ] },',
    '  "state_updates": { "treasury_change": int (borné : min -budget, max +100), "unrest_change": int [-15,15], "prestige_change": int [-15,15],',
    '    "new_asset_queue"?: { "id": string, "name": string, "level": 1-3, "construction_ticks": 1-12, "monthly_revenue": 0-50, "monthly_upkeep": 0-20, "cat": "' + ASSET_CATS.join("|") + '", "emoji": string } },',
    '  "narrative_response": "2-4 phrases, français, ton du Bailli qui parle au Seigneur" }',
    `État actuel du domaine (seul état fiable, ne jamais inventer de chiffres) : ${stateSummary}`,
    "Si l'ordre est irréalisable (budget insuffisant, absurde) : treasury_change=0, pas de new_asset_queue, narrative_response explique le refus.",
    "Si une lettre du conseil est en attente (pendingLetters dans l'état) et que le Seigneur y répond : 'accorde/oui' → effets positifs faibles, 'refuse/non' → effets négatifs faibles, autre → selon le sens.",
  ].join(" ");

  try {
    const completion = await client.chat.complete({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: order.trim() },
      ],
      maxTokens: 500,
      responseFormat: { type: "json_object" },
    });
    const content = completion.choices?.[0]?.message?.content;
    const raw = typeof content === "string" ? content : "";
    res.json(sanitizeContract(raw, budget));
  } catch (err) {
    console.error("Erreur API Mistral (order):", err);
    res.status(502).json({ error: "Échec de l'appel à l'API Mistral." });
  }
});

app.post("/api/letter", async (req, res) => {
  const sujet = req.body?.sujet;
  if (typeof sujet !== "string" || sujet.trim().length === 0 || sujet.length > 300) {
    return res.status(400).json({ error: "Corps attendu : { \"sujet\": \"...\", \"state\": {...} }" });
  }
  const stateSummary =
    req.body?.state && typeof req.body.state === "object"
      ? JSON.stringify(req.body.state).slice(0, 4000)
      : "{}";
  const system = [
    "Tu es le secrétaire du conseil des anciens d'un domaine seigneurial médiéval (uchronie).",
    `État du domaine (JSON) : ${stateSummary}`,
    `Le conseil veut soumettre au seigneur la proposition suivante : "${sujet.trim()}"`,
    "Rédige la LETTRE officielle envoyée au seigneur, AVEC l'argumentation complète pour arbitrer.",
    'Réponds UNIQUEMENT en JSON valide : { "titre": string, "corps": "3 à 6 phrases en français, style lettre officielle médiévale : salutation, exposé, arguments POUR, coûts/risques, formule de clôture." }',
  ].join(" ");

  try {
    const completion = await client.chat.complete({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Rédige la lettre du conseil pour : ${sujet.trim()}` },
      ],
      maxTokens: 300,
      responseFormat: { type: "json_object" },
    });
    const content = completion.choices?.[0]?.message?.content;
    const raw = typeof content === "string" ? content : "";
    const o = parseJson(raw) ?? {};
    res.json({
      titre: typeof o.titre === "string" && o.titre ? o.titre : "Lettre du conseil des anciens",
      corps:
        typeof o.corps === "string" && o.corps
          ? o.corps
          : `Le conseil des anciens soumet au seigneur la proposition suivante : ${sujet.trim()}.`,
    });
  } catch (err) {
    console.error("Erreur API Mistral (letter):", err);
    res.status(502).json({ error: "Échec de l'appel à l'API Mistral." });
  }
});

const clientDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist-client");
app.use(express.static(clientDir));
app.get("/", (_req, res) => res.sendFile(path.join(clientDir, "index.html")));

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Domaine seigneurial (${MODEL}) sur http://localhost:${PORT}`);
});
