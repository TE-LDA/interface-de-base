# interface-de-base

Petit projet Hello World en Swift, testé sur macOS via GitHub Actions.

## Utilisation

```bash
swift hello.swift
```

## CI

Le workflow `.github/workflows/macos.yml` compile et exécute le programme sur un runner macOS (`macos-latest`) à chaque push, pull request ou déclenchement manuel.

## Royaume médiéval — jeu de gestion uchronique (React + TypeScript)

Un jeu de gestion médiéval se trouve dans [`chat-mistral/`](chat-mistral/) : un royaume évolue tout seul dans le temps (ressources, population, bâtiments, événements), et sa chronique uchronique est narrée par le SDK officiel `@mistralai/mistralai` (`mistral-small-latest`) via un petit backend Express. La clé `MISTRAL_API_KEY` reste côté serveur.

```bash
git clone https://github.com/TE-LDA/interface-de-base.git
cd interface-de-base
git checkout vibe/chat-mistral-web-4bb1a1
cd chat-mistral
npm install
cp .env.example .env
npm run dev
```

Renseigner `MISTRAL_API_KEY` dans `chat-mistral/.env` avant le premier lancement, puis ouvrir <http://localhost:5173> en développement (<http://localhost:3000> après `npm run build && npm start`). Voir [`chat-mistral/README.md`](chat-mistral/README.md) pour le détail.
