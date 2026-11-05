# interface-de-base

Petit projet Hello World en Swift, testé sur macOS via GitHub Actions.

## Utilisation

```bash
swift hello.swift
```

## CI

Le workflow `.github/workflows/macos.yml` compile et exécute le programme sur un runner macOS (`macos-latest`) à chaque push, pull request ou déclenchement manuel.

## Chat Mistral (app web TypeScript)

Une app web de chat minimale (Express + SDK officiel `@mistralai/mistralai`, modèle `mistral-small-latest`) se trouve dans [`chat-mistral/`](chat-mistral/). La clé `MISTRAL_API_KEY` reste côté serveur.

```bash
cd chat-mistral
npm install
cp .env.example .env   # renseigner MISTRAL_API_KEY dans .env
npm run dev            # http://localhost:3000
```
