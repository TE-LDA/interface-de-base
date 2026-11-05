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
- **Interface 100 % lettres** : la **Chronique** occupe tout l'écran (style page de livre), et vos ordres se tapent dans la **barre fixe en bas** 🖋️ (open world, texte libre) : « construis une ferme », « donne-moi le devis de la bibliothèque », « va voir mes hommes : améliore l'économie, que me proposez-vous ? ». `mistral-small-latest` joue le maître du jeu : il répond dans la chronique et renvoie une action structurée (JSON). Pour une construction, l'**architecte dresse le devis** (📐 dans la chronique) comparé à vos ressources, et les travaux ne commencent que si le devis est abordable. Vous pouvez aussi **promulguer des lois, décrets, chartes, fonder des ordres religieux/militaires ou promouvoir des hommes** : l'IA fait réagir les habitants (acclamations, murmures, révolte si le moral est bas) et la loi est inscrite dans la liste « 📜 Lois et ordres du royaume » (panneau 🗺️). Les villageois prennent aussi parfois des décisions seuls (pont réparé, marché hebdomadaire, levée refusée…). La carte du domaine et les sciences sont derrière le bouton **🗺️** en haut à droite.
- **Production** : les fermes 🌾 et moulins 🍞 produisent la nourriture, les 🪓 cabanes de bûcherons produisent le **bois**, les ⛏️ carrières produisent la **pierre**, les ateliers 🔨 transforment bois/pierre en or, les marchés ⚖️ rapportent de l'or selon la population.
- **Science** 🔬 : scriptorium 📜, bibliothèque 📚 et université 🎓 produisent de la connaissance 📖, à dépenser dans l'arbre de **découvertes** (assollement, horlogerie, médecine, remparts, imprimerie…).
- **Tarif adaptatif** 📐 : le devis dépend de la **quantité** demandée (« construis 5 maisons ») et du nombre de bâtiments du même type déjà possédés — chaque exemplaire possédé fait baisser le coût marginal de 10 % (plancher à 50 %). Le client recalcule toujours le coût réel, l'IA ne fait que choisir quoi construire.
- **Stratégie macro** 🎯 : vous choisissez l'orientation du royaume (équilibre, prospérité, foi, défense, savoir, expansion) avec des bonus passifs. La **tactique et le micro** restent aux villageois et à vos hommes : la simulation décide seule au jour le jour.
- **Lettres du conseil** ✉️ 🙇 : périodiquement, le conseil envoie une **lettre officielle avec argumentation** (proposition, arguments pour, coûts/risques), rédigée par `mistral-small-latest` (`POST /api/letter`) et affichée dans le panneau d'ordres. Vous **arbitrez** en répondant en texte libre (« accorde », « refuse », « plutôt ceci… ») — l'IA interprète votre décision, fait réagir le conseil et applique des effets bornés.
- **Village autonome** (bouton 🏘️) : le village se développe tout seul — chaque mois, les villageois construisent ce qui manque (nourriture, logements, ressources) s'ils en ont les moyens. Dans le panneau 🗺️, cliquez sur une case herbeuse pour construire à la main.
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
