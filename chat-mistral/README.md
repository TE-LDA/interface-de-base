# chat-mistral

App web de chat minimale qui appelle l'API Mistral avec le [SDK TypeScript officiel](https://github.com/mistralai/client-ts) (`@mistralai/mistralai`), modèle `mistral-small-latest`.

La clé `MISTRAL_API_KEY` n'est lue que côté serveur (`src/server.ts`) et n'est jamais envoyée au navigateur.

## Installation et exécution locale

```bash
cd chat-mistral
npm install
cp .env.example .env   # puis renseigner MISTRAL_API_KEY dans .env
npm run dev            # démarre sur http://localhost:3000
```

Ouvrir ensuite <http://localhost:3000> dans un navigateur.

## Mode production

```bash
npm run build
npm start              # sert dist/server.js + public/ sur http://localhost:3000
```

La variable d'environnement `PORT` permet de changer le port (3000 par défaut).

## Structure

- `src/server.ts` — serveur Express : sert `public/` et expose `POST /api/chat`
- `public/` — interface de chat statique (HTML/CSS/JS vanilla)
- `.env.example` — modèle de configuration (`.env` est ignoré par git)
