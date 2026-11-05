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
        : (content
            ?.map((chunk) => ("text" in chunk ? chunk.text : ""))
            .join("") ?? "");
    res.json({ reply });
  } catch (err) {
    console.error("Erreur API Mistral:", err);
    res.status(502).json({ error: "Échec de l'appel à l'API Mistral." });
  }
});

// ---------- Contrat strict + sanitization pour /api/order ----------

const BUILDING_KEYS = [
  "ferme", "moulin", "maison", "église", "atelier", "marché", "tour",
  "cabane", "carrière", "scriptorium", "bibliothèque", "université", "auberge",
];
const CATEGORIES = ["commerce", "foi", "science", "defense", "agriculture", "sante"];
const MESURES = ["moulin", "octroi", "taille", "corvee", "gite", "ost", "grenier", "justice", "mariage", "chasse"];

const BOUNDS: Record<string, [number, number]> = {
  nourriture: [-30, 30],
  bois: [-30, 30],
  pierre: [-30, 30],
  or: [-30, 30],
  science: [-30, 30],
  moral: [-15, 15],
  foi: [-15, 15],
  population: [-6, 6],
};

function clampInt(v: unknown, min: number, max: number): number {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.max(min, Math.min(max, Math.round(v)))
    : 0;
}

interface SanitizedOrder {
  reponse: string;
  action: Record<string, unknown> & { type: string };
}

function sanitizeOrder(raw: string, budgetOr: number): SanitizedOrder {
  const fallback: SanitizedOrder = {
    reponse:
      raw.slice(0, 600) || "Le héraut revient bredouille : l'ordre n'a pas été compris.",
    action: { type: "rien" },
  };
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch {
        parsed = null;
      }
    }
  }
  if (!parsed || typeof parsed !== "object") return fallback;
  const o = parsed as Record<string, unknown>;

  const narrative =
    typeof o.chronique_narrative === "string" && o.chronique_narrative
      ? o.chronique_narrative
      : typeof o.reponse === "string"
        ? o.reponse
        : "";
  const feasible = o.faisabilite !== false;
  const reason = typeof o.raison_incoherence === "string" ? o.raison_incoherence : "";

  const modifs =
    o.modificateurs && typeof o.modificateurs === "object"
      ? (o.modificateurs as Record<string, unknown>)
      : {};
  const effets: Record<string, number> = {};
  if (feasible) {
    for (const [key, [mn, mx]] of Object.entries(BOUNDS)) {
      const v = modifs[key] ?? (key === "nourriture" ? modifs.ble : undefined);
      const c = clampInt(v, mn, mx);
      if (c !== 0) effets[key] = c;
    }
  }

  let reponse = (narrative || raw.slice(0, 600) || fallback.reponse).slice(0, 600);
  if (!feasible) {
    reponse = `${reason || "Ordre irréalisable."} ${narrative}`.trim().slice(0, 600);
    for (const k of Object.keys(effets)) delete effets[k];
  }

  const actions = Array.isArray(o.actions) ? o.actions.slice(0, 5) : [];
  for (const a of actions) {
    if (!a || typeof a !== "object") continue;
    const act = a as Record<string, unknown>;
    if (act.type === "build" && typeof act.batiment === "string" && BUILDING_KEYS.includes(act.batiment)) {
      return {
        reponse,
        action: {
          type: "build",
          batiment: act.batiment,
          quantite: Math.max(1, Math.min(12, clampInt(act.quantite, 1, 12) || 1)),
        },
      };
    }
    if (act.type === "invest" && typeof act.categorie === "string" && CATEGORIES.includes(act.categorie)) {
      return {
        reponse,
        action: {
          type: "invest",
          projet: act.categorie,
          montant: Math.max(1, Math.min(Math.max(1, Math.floor(budgetOr)), clampInt(act.montant, 1, 9999) || 1)),
        },
      };
    }
    if (act.type === "mesure" && typeof act.mesure === "string" && MESURES.includes(act.mesure)) {
      return { reponse, action: { type: "mesure", mesure: act.mesure } };
    }
    if (act.type === "decret") {
      return {
        reponse,
        action: {
          type: "decret",
          titre: String(act.titre ?? "").slice(0, 120),
          texte: String(act.texte ?? "").slice(0, 500),
          effets,
        },
      };
    }
    if (act.type === "ressources") {
      return { reponse, action: { type: "ressources", effets } };
    }
  }
  if (Object.keys(effets).length > 0) {
    return { reponse, action: { type: "ressources", effets } };
  }
  return { reponse, action: { type: "rien" } };
}

app.post("/api/order", async (req, res) => {
  const order = req.body?.order;
  if (typeof order !== "string" || order.trim().length === 0 || order.length > 500) {
    return res
      .status(400)
      .json({ error: "Corps attendu : { \"order\": \"...\", \"state\": {...} }" });
  }
  const stateSummary =
    req.body?.state && typeof req.body.state === "object"
      ? JSON.stringify(req.body.state).slice(0, 4000)
      : "{}";
  const budgetOr =
    req.body?.state && typeof req.body.state === "object" && typeof (req.body.state as Record<string, unknown>).budget_or === "number"
      ? Math.max(0, Math.floor((req.body.state as Record<string, unknown>).budget_or as number))
      : 9999;

  const system = [
    "Tu es le moteur de simulation et le scribe d'un jeu de gestion médiéval (style Pax Historia).",
    "Le joueur est le seigneur et écrit ses décisions en texte libre. Tu analyses l'ordre et réponds STRICTEMENT en JSON, sans aucun texte hors du JSON.",
    `État actuel du royaume (seul état fiable — ne jamais inventer de chiffres) : ${stateSummary}`,
    "CONTRAT DE SORTIE — objet JSON valide, structure exacte :",
    '{ "chronique_narrative": "paragraphe de 2 à 4 phrases, français, ton de chroniqueur médiéval",',
    '  "modificateurs": { "nourriture": int, "bois": int, "pierre": int, "or": int, "science": int, "moral": int, "foi": int, "population": int },',
    '  "faisabilite": true|false, "raison_incoherence": "vide si faisable",',
    '  "actions": [ { "type": "build"|"invest"|"mesure"|"decret",',
    '    "batiment"?: "clé du catalogue batiments_disponibles", "quantite"?: 1-12,',
    '    "categorie"?: "commerce|foi|science|defense|agriculture|sante", "montant"?: int (en or, ≤ budget_or),',
    '    "mesure"?: "moulin|octroi|taille|corvee|gite|ost|grenier|justice|mariage|chasse",',
    '    "titre"?: string, "texte"?: string } ] }',
    "RÈGLES STRICTES :",
    "- modificateurs = deltas relatifs à l'état, jamais des absolues. Bornes : |nourriture/bois/pierre/or/science| ≤ 30 ; moral/foi ∈ [-15,15] ; population ∈ [-6,6].",
    "- Ordre irréalisable → faisabilite=false, raison_incoherence remplie, modificateurs à 0.",
    "- Toute décision réaliste produit un effet + ET un effet − (ex. taille : +or, −moral).",
    "- Un investissement = actif durable : niveau selon le montant (<50=N1, 50-149=N2, ≥150=N3), chantier de quelques mois puis revenus permanents − entretien.",
    "- À partir de 50 or investis, les conseillers déclenchent une stratégie concrète (bâtiment offert + effets + et −) : décris-la dans la chronique.",
    "- Si demande_en_attente non null, le seigneur arbitre la lettre du conseil : « accorde/oui » → petits effets +, « refuse/non » → petits effets −, autre → selon le sens ; le conseil réagit dans la chronique.",
    "- Ne jamais inventer de bâtiment hors de batiments_disponibles. Reste concis.",
  ].join(" ");

  try {
    const completion = await client.chat.complete({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: order.trim() },
      ],
      maxTokens: 400,
      responseFormat: { type: "json_object" },
    });
    const content = completion.choices?.[0]?.message?.content;
    const raw = typeof content === "string" ? content : "";
    const sanitized = sanitizeOrder(raw, budgetOr);
    res.json(sanitized);
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
    "Tu es le secrétaire du conseil des anciens d'un royaume médiéval uchronique.",
    `État du royaume (JSON) : ${stateSummary}`,
    `Le conseil veut soumettre au seigneur la proposition suivante : "${sujet.trim()}"`,
    "Rédige la LETTRE officielle que le conseil enverra au seigneur, AVEC l'argumentation complète pour arbitrer.",
    'Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour : { "titre": "titre de la lettre", "corps": "3 à 6 phrases en français, style lettre officielle médiévale : salutation, exposé de la demande, arguments POUR, coûts et risques éventuels, formule de clôture." }',
  ].join(" ");

  try {
    const completion = await client.chat.complete({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Rédige la lettre du conseil pour la proposition : ${sujet.trim()}` },
      ],
      maxTokens: 300,
      responseFormat: { type: "json_object" },
    });
    const content = completion.choices?.[0]?.message?.content;
    const raw = typeof content === "string" ? content : "";
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          parsed = JSON.parse(m[0]);
        } catch {
          parsed = null;
        }
      }
    }
    const obj = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    res.json({
      titre:
        typeof obj.titre === "string" && obj.titre
          ? obj.titre
          : "Lettre du conseil des anciens",
      corps:
        typeof obj.corps === "string" && obj.corps
          ? obj.corps
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
  console.log(`Royaume (${MODEL}) disponible sur http://localhost:${PORT}`);
});
