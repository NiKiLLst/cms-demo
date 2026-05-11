# Next.js demo — 7° demo "CMS-less"

Settima variante della demo comparativa: nessun CMS. I tre canali standard
(`/blog`, `/portfolio`, `/prenotazioni`) vivono come segue:

- **/blog**: file Markdown in `content/blog/*.md` con frontmatter (title, publishedAt, author, excerpt). Letti server-side via `lib/content.ts`.
- **/portfolio**: file Markdown in `content/portfolio/*.md` con frontmatter (title, description, externalUrl, tags).
- **/prenotazioni**: form pubblico che POSTa a `/api/bookings`, che appende a `/app/data/bookings.json` sul container.

## Risultato di validazione

Lo scopo di questa demo è essere **il contrasto** delle altre sei: mostra cosa
significa "fare un sito con Next.js senza CMS" in termini concreti.

| Capability | nextjs-demo (CMS-less) | gli altri 6 CMS |
|---|---|---|
| Editor non-dev può creare un articolo | ❌ — serve git push | ✅ — admin UI |
| Vedere le prenotazioni in tabella | ❌ — ssh + cat /app/data/bookings.json | ✅ — admin UI |
| Upload immagini dal browser | ❌ | ✅ |
| Bozze + workflow di pubblicazione | ❌ | ✅ (dove supportato) |
| Persistenza dei dati cliente | ⚠️ se manca un volume mount, perdi tutto al redeploy | ✅ named volume per DB |

## Persistenza delle prenotazioni

Le prenotazioni atterrano in `/app/data/bookings.json`. Affinché sopravvivano
ai redeploy serve un **persistent storage** mappato su `/app/data` nella risorsa
Coolify (panel: Storage → Add Persistent Storage). Senza quello, ogni rebuild
butta via le richieste raccolte. **Questo è parte del messaggio**: senza un
CMS che gestisce DB + backup nativamente, devi pensare tu a queste cose.

## Far evolvere i contenuti

```bash
cd apps/nextjs-demo
# nuovo articolo
cat > content/blog/nuovo-articolo.md <<'EOF'
---
title: "Titolo"
publishedAt: "2026-05-15"
---

Corpo in markdown.
EOF

git add . && git commit -m "blog: nuovo articolo" && git push
# Coolify rebuilda → l'articolo appare su next.nerdass.org/blog
```

Tempo per pubblicare: tempo che impiega `git push` + tempo di build Coolify.
Confronta con un CMS vero (es. Directus): login + new entry + publish = 30 secondi,
senza tirare in mezzo gli sviluppatori.

## Dev locale

```bash
npm install
npm run dev
```
