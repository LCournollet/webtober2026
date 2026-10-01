# Webtober 2026

Un thème, un mini projet web, chaque jour d'octobre 2026.

🌐 **https://devtober.57-131-40-94.sslip.io/**

| Jour | Thème | Lien |
|------|-------|------|
| 01 | 🍎 Apple — Pomme Sweet Pomme : tamagotchi pixel art, creuse et décore la maison de ton ver ([v0 3D](https://devtober.57-131-40-94.sslip.io/applev0/)) | [/apple](https://devtober.57-131-40-94.sslip.io/apple/) |
| 02 | 🧠 Relique — Relic 2.0 : puce 3D, zoom vectoriel jusqu'à l'engramme, cerveau en carte topographique | [/relique](https://devtober.57-131-40-94.sslip.io/relique/) |

## Structure

- `index.html` — page d'accueil (calendrier des 31 jours, se remplit tout seul)
- `<theme>/` — un dossier par jour, avec son `index.html` et un `meta.json` :
  ```json
  { "day": 1, "theme": "apple", "title": "Apple", "emoji": "🍎" }
  ```
- `nginx/devtober` — config nginx du VPS (avant ajout HTTPS par certbot)
- `deploy.sh` — mise en ligne

## Déployer

```bash
./deploy.sh apple   # un thème
./deploy.sh         # la page d'accueil
```
