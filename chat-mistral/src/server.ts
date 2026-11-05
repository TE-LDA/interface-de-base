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
  const system = [
    "Tu es le maître du jeu d'un royaume médiéval uchronique (jeu de gestion).",
    "Le joueur est le seigneur et te donne des ordres en texte libre.",
    `État actuel du royaume (JSON) : ${stateSummary}`,
    "Réponds UNIQUEMENT avec un objet JSON valide, sans aucun texte autour, de la forme :",
    '{ "reponse": "narration en français, 2 à 4 phrases, style chronique médiévale, en t\'adressant au seigneur",',
    '  "action": { "type": "build" | "ressources" | "decret" | "rien",',
    '    "batiment": "clé exacte d\'un élément de batiments_disponibles (seulement si le seigneur ordonne une construction)",',
    '    "quantite": n (nombre d\'exemplaires si le seigneur en demande plusieurs, ex. "5 maisons" → quantite 5, entre 1 et 12),',
    '    "devis": { "bois": n, "pierre": n, "or": n } (coûts réels de la construction, seulement si type=build),',
    '    "titre": "titre de la loi/ordre", "texte": "texte de la loi/ordre" (obligatoires si type=decret : loi, décret, fondation d\'ordre religieux ou militaire, charte, promotion d\'un homme),',
    '    "effets": { "nourriture": n, "bois": n, "pierre": n, "or": n, "foi": n, "science": n, "moral": n, "pop": n } (petits effets numériques) } }',
    "Le seigneur peut aussi décréter des MESURES et POLITIQUES (économie, impôts, subventions, fêtes, lois sociales) sans rien bâtir : traduis-les en effets numériques (type \"ressources\" ou \"decret\") et raconte la réaction du peuple dans reponse. Exemple : une taxe rapporte de l'or mais baisse le moral ; une subvention aux fermes coûte de l'or mais monte la nourriture et le moral.",
    "Quand le seigneur promulgue une loi, un décret, fonde un ordre ou promeut quelqu'un : les habitants RÉAGISSENT. Décris leur réaction dans reponse (acclamations du peuple, murmures de la noblesse, révolte si le moral est bas, bénédiction du clergé si la foi est haute...) et traduis-la en effets. Utilise type \"decret\" avec titre et texte.",
    "Si le seigneur demande seulement un devis, réponds type \"rien\" et décris le devis dans reponse.",
    "Si le seigneur s'adresse à ses hommes (ex. « améliore l'économie, que me proposez-vous ? »), fais répondre les hommes dans reponse et applique de petits effets cohérents, ou lance une construction abordable (type \"build\").",
    "Le coût s'adapte à la quantité demandée (plusieurs exemplaires = tarif dégressif) : indique le coût TOTAL dans devis pour la quantite demandée.",
    "Ne jamais inventer de bâtiment hors de la liste batiments_disponibles. Reste concis.",
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
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof (parsed as Record<string, unknown>).reponse !== "string"
    ) {
      return res.json({
        reponse: raw.slice(0, 500) || "Le héraut revient bredouille : l'ordre n'a pas été compris.",
        action: { type: "rien" },
      });
    }
    res.json(parsed);
  } catch (err) {
    console.error("Erreur API Mistral (order):", err);
    res.status(502).json({ error: "Échec de l'appel à l'API Mistral." });
  }
});

const clientDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "dist-client");
app.use(express.static(clientDir));
app.get("/", (_req, res) => res.sendFile(path.join(clientDir, "index.html")));

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Chat Mistral (${MODEL}) disponible sur http://localhost:${PORT}`);
});
