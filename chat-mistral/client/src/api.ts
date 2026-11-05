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
