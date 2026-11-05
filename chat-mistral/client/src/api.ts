import type { OrderResponse } from "./game/types";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function sendChat(messages: ChatMessage[], maxTokens?: number): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, ...(maxTokens ? { maxTokens } : {}) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Erreur serveur");
  }
  return data.reply;
}

export interface Lettre {
  titre: string;
  corps: string;
}

export async function sendLetter(sujet: string, state: unknown): Promise<Lettre> {
  const res = await fetch("/api/letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sujet, state }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Erreur serveur");
  }
  return {
    titre: typeof data.titre === "string" ? data.titre : "Lettre du conseil des anciens",
    corps: typeof data.corps === "string" ? data.corps : sujet,
  };
}

export async function sendOrder(order: string, state: unknown): Promise<OrderResponse> {
  const res = await fetch("/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order, state }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Erreur serveur");
  }
  return {
    reponse: typeof data.reponse === "string" ? data.reponse : "",
    action: data.action,
  };
}
