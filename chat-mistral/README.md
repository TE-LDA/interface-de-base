# chat-mistral

**Jeu de gestion économique de domaine médiéval** (style Pax Historia) en React + TypeScript (Vite) + Express. Le joueur rédige ses **ordres en texte libre** ; l'**IA Bailli** (`mistral-small-latest`, SDK officiel `@mistralai/mistralai`) analyse chaque ordre et renvoie un **contrat JSON strict** avec simulation comparative (base Conseil vs arbitrage du joueur) et mises à jour d'état. Le serveur valide/borne ce JSON avant de le renvoyer au client.

La clé `MISTRAL_API_KEY` n'est lue que côté serveur (`.env`, gitigné).

## Lancer en local

```bash
git clone https://github.com/TE-LDA/interface-de-base.git
cd interface-de-base
git checkout vibe/chat-mistral-web-4bb1a1
cd chat-mistral
npm install
cp .env.example .env
npm run dev
```
Ouvrir http://localhost:5173 (prod : `npm run build && npm start` → http://localhost:3000).

## Architecture

- **État unique** `GameState` (`client/src/game/types.ts`) : `meta` (tour/an/mois/dynastie/seigneur), `metrics` (trésorerie, revenus/charges mensuels, population, réserve de grain en mois, inquiétude 0-100, prestige), `macro` (6 orientations, niveaux 0-5), `assets[]` (bâtiments = projets fusionnés : niveau 1-3, statut building/active/damaged, revenus et upkeep mensuels), `pendingLetters[]` (courrier), `chronicle[]`.
- **Moteur à ticks** (`client/src/game/sim.ts`) : 1 tick = 1 mois. Revenus − upkeep, grain, population, inquiétude (révolte > 80 %), événements aléatoires (peste, comètes, brigands, incendie…), successions/dynasties (uchronie), village autonome, lettres du conseil.
- **Contrat JSON Bailli** (`POST /api/order`, `src/server.ts`) : `{ player_intent, comparative_simulation (baseline vs enacted + tradeoff_summary), state_updates (treasury_change, unrest_change, prestige_change, new_asset_queue), narrative_response }`. Sanitization serveur : parse défensif, bornes (trésorerie min −budget/max +100, unrest & prestige ±15, ticks 1-12, niveau 1-3, revenus 0-50…), enums fermés, fallback propre. Appel en `response_format: json_object`.
- **UI** : chronique pleine page à gauche ; panneau droit (Vos ordres 🖋️ + suggestions, Trésorerie 💰, Orientations macro 🎯 avec steppers 0-5, Contrôles ⚙️) ; ✉️ courrier (lettre en grand, OUI/NON ou texte libre, rédigée via `POST /api/letter`) ; 📊 **rapport d'impact comparatif** (table Conseil vs arbitrage + variance) à chaque décision ; 🗺️ carte des actifs en overlay.
- Sauvegarde auto `localStorage`.

## Fichiers clés

- `src/server.ts` — Express : `/api/chat` (narration), `/api/order` (contrat Bailli + sanitization), `/api/letter` (lettres du conseil), statique `dist-client/`
- `client/src/game/sim.ts` — moteur de ticks
- `client/src/App.tsx` — interface
