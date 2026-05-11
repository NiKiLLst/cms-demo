---
title: "Un articolo di esempio (CMS-less)"
publishedAt: "2026-05-01"
author: "cms-demo"
excerpt: "Questo articolo vive come file Markdown in content/blog/. Niente admin UI, niente database."
---

# Un articolo di esempio

Questo articolo è un file Markdown committato nel repo: `content/blog/esempio-articolo.md`.
Per modificare il titolo o il contenuto serve aprire il file in un editor, salvare, fare commit e push.

## Cosa manca rispetto a un CMS vero

- **Nessuna UI**: il cliente non-dev non può creare/modificare articoli.
- **Nessuna gestione bozze**: il file esiste o non esiste.
- **Nessun controllo accessi**: chi ha accesso git ha accesso a tutto.
- **Nessuna pipeline media**: niente upload immagini, niente resize/CDN automatico.

Per il confronto vedi le altre 6 demo: ognuna fornisce un livello diverso di
ergonomia per l'editor non-tecnico.
