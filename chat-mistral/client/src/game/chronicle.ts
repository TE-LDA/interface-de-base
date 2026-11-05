import { sendChat, type ChatMessage } from "../api";
import type { GameEvent, GameState } from "./types";

export async function narrate(state: GameState, event: GameEvent): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `Tu es le chroniqueur du royaume de ${state.kingdom} (maison ${state.dynasty}) dans une uchronie médiévale. Tu réponds UNIQUEMENT par 1 à 2 phrases en français, style chronique ancienne, ton grave et imagé, sans emoji ni markdown.`,
    },
    {
      role: "user",
      content: `Année ${event.year}, seigneur ${state.ruler} de la maison ${state.dynasty}. Événement : ${event.text}`,
    },
  ];
  try {
    const text = await sendChat(messages, 120);
    return text.trim() || event.text;
  } catch {
    return event.text;
  }
}
