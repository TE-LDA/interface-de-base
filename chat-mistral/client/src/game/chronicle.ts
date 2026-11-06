import type { GameState, LogEntry } from "./types";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function sendChat(messages: ChatMessage[], maxTokens?: number): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, ...(maxTokens ? { maxTokens } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return data.reply;
}

export async function narrate(state: GameState, entry: LogEntry): Promise<string> {
  const m = state.metrics;
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Tu es le scribe du domaine de ${state.meta.rulerTitle} (maison ${state.meta.dynastyName}) dans une chronique médiévale uchronique. Tu réponds UNIQUEMENT par 1 à 2 phrases en français, ton grave et imagé, sans emoji ni markdown.`,
    },
    {
      role: "user",
      content: `An ${entry.year}, ${state.meta.rulerTitle}. Trésorerie ${m.treasury} 💰, population ${m.population}, inquiétude ${Math.round(m.unrest)} %. Événement : ${entry.text}`,
    },
  ];
  try {
    const text = await sendChat(messages, 120);
    return text.trim() || entry.text;
  } catch {
    return entry.text;
  }
}
