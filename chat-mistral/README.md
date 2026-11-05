# chat-mistral

Jeu de gestion médiéval en **React + TypeScript** (Vite) : un royaume vit et évolue tout seul, tick par tick (ressources, population, bâtiments, famines, guerres, successions), et sa **chronique uchronique** est narrée par l'API Mistral via le [SDK TypeScript officiel](https://github.com/mistralai/client-ts) (`@mistralai/mistralai`, modèle `mistral-small-latest`), exposé par un petit serveur Express.

La clé `MISTRAL_API_KEY` n'est lue que côté serveur (`src/server.ts`) et n'est jamais envoyée au navigateur. Sans clé valide, la chronique retombe sur le texte brut des événements.

## Installation et exécution locale

Depuis un terminal, à partir du dépôt (l'app vit sur la branche `vibe/chat-mistral-web-4bb1a1` de la PR #2, pas encore sur `main`) :

```bash
git clone https://github.com/TE-LDA/interface-de-base.git
cd interface-de-base
git checkout vibe/chat-mistral-web-4bb1a1
cd chat-mistral
npm install
cp .env.example .env
npm run dev
```

Avant le premier `npm run dev`, ouvrez `chat-mistral/.env` dans un éditeur et renseignez `MISTRAL_API_KEY` (clé obtenue sur <https://console.mistral.ai/api-keys/>).

`npm run dev` lance deux processus : l'API Express (port 3000) et le serveur de dev Vite (port 5173, qui proxifie `/api` vers l'API). Ouvrez ensuite <http://localhost:5173>.

## Jouer

- La partie tourne en boucle (1 tick = 1 mois, 12 ticks = 1 an) : **⏸/▶** pour pause, **vitesse ×1/×2/×4** pour accélérer.
- **Ordres du seigneur** 🖋️ (open world, texte libre) : tapez ce que vous voulez — « construis une ferme », « donne-moi le devis de la bibliothèque », « va voir mes hommes : améliore l'économie, que me proposez-vous ? ». `mistral-small-latest` joue le maître du jeu : il répond dans la chronique et renvoie une action structurée (JSON). Pour une construction, l'**architecte dresse le devis** (📐 dans la chronique) comparé à vos ressources, et les travaux ne commencent que si le devis est abordable.
- **Production** : les fermes 🌾 et moulins 🍞 produisent la nourriture, les 🪓 cabanes de bûcherons produisent le **bois**, les ⛏️ carrières produisent la **pierre**, les ateliers 🔨 transforment bois/pierre en or, les marchés ⚖️ rapportent de l'or selon la population.
- **Science** 🔬 : scriptorium 📜, bibliothèque 📚 et université 🎓 produisent de la connaissance 📖, à dépenser dans l'arbre de **découvertes** (assollement, horlogerie, médecine, remparts, imprimerie…).
- **Village autonome** (bouton 🏘️) : le village se développe tout seul — chaque mois, les villageois construisent ce qui manque (nourriture, logements, ressources) s'ils en ont les moyens. Vous pouvez aussi cliquer sur une case herbeuse pour construire à la main.
- Les événements marquants (famine, peste, guerre, comètes, successions, uchronies) sont racontés dans la **Chronique** par `mistral-small-latest`.
- La partie est sauvegardée dans `localStorage` : rechargez la page, le royaume continue là où il en était. **Nouvelle chronique** repart de zéro (nouvelle uchronie).

## Mode production

```bash
npm run build
npm start
```

`npm run build` compile le serveur (`dist/`) et le client React (`dist-client/`) ; `npm start` sert le tout sur <http://localhost:3000> (variable `PORT` pour changer le port).

## Structure

- `src/server.ts` — serveur Express : expose `POST /api/chat` et sert le build client (`dist-client/`)
- `client/src/game/sim.ts` — moteur de simulation (ticks, économie, événements aléatoires)
- `client/src/game/chronicle.ts` — narration des événements via `/api/chat`
- `client/src/App.tsx` — interface de jeu (carte du royaume, ressources, chronique)
- `vite.config.ts` — config Vite (racine `client/`, proxy `/api` en dev)
- `.env.example` — modèle de configuration (`.env` est ignoré par git)
