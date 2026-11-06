import type { OrderContract } from "./game/types";

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
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return {
    titre: typeof data.titre === "string" ? data.titre : "Lettre du conseil des anciens",
    corps: typeof data.corps === "string" ? data.corps : sujet,
  };
}

export async function sendOrder(order: string, state: unknown): Promise<OrderContract> {
  const res = await fetch("/api/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order, state }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Erreur serveur");
  return {
    narrative_response:
      typeof data.narrative_response === "string" && data.narrative_response
        ? data.narrative_response
        : "Le Bailli n'a rien compris à l'ordre.",
    state_updates: data.state_updates ?? { treasury_change: 0, unrest_change: 0, prestige_change: 0 },
    comparative_simulation: data.comparative_simulation,
  };
}
