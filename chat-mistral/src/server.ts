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

  try {
    const completion = await client.chat.complete({
      model: MODEL,
      messages: messages as ChatMessage[],
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

const publicDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "public");
app.use(express.static(publicDir));
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));

app.listen(PORT, "127.0.0.1", () => {
  console.log(`Chat Mistral (${MODEL}) disponible sur http://localhost:${PORT}`);
});
