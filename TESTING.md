# cms-demo — guida rapida di test

Sette piattaforme messe a confronto. Ognuna espone le stesse tre pagine pubbliche
così possiamo valutarle con lo stesso metro: `/blog`, `/portfolio`, `/prenotazioni`.

Obiettivo del test: capire **se un cliente non-dev può gestire da solo questi contenuti**.

## Cosa testare in ogni CMS

Per ognuno dei 7 ambienti, percorri questi 5 step e annota un voto da 1 a 5:

1. **Login admin** → l'utente trova subito dove entrare?
2. **Crea un articolo blog** dall'admin → salva, vai sul frontend `/blog`, vedi l'articolo? Quanti click ha richiesto?
3. **Crea un elemento portfolio** dall'admin → idem, controlla `/portfolio`.
4. **Vai sul frontend `/prenotazioni`, manda una richiesta** → torna nell'admin, vedi la prenotazione nella lista? È sufficientemente chiara (data, contatti, stato)?
5. **Cambia status booking** (es. da `new` a `confirmed`) → l'UI lo rende facile?

Compila la matrice in fondo al `README.md` con i voti.

## Ambienti

| CMS | Frontend pubblico | Admin | Stato |
|---|---|---|---|
| **Strapi** | https://strapi.nerdass.org | https://strapi-admin.nerdass.org | ⚠️ DNS admin da aggiungere |
| **Directus** | https://directus.nerdass.org | https://directus-admin.nerdass.org | ⚠️ DNS admin da aggiungere |
| **PocketBase** | https://pocketbase.nerdass.org | https://pocketbase-admin.nerdass.org/_/ | ⚠️ DNS admin da aggiungere |
| **Ghost** | https://ghost.nerdass.org | https://ghost.nerdass.org/ghost/ | ⚠️ Solo blog. Tema custom da attivare |
| **PayloadCMS** | https://payload.nerdass.org | https://payload.nerdass.org/admin | ✅ Pronto |
| **Appwrite** | https://appwrite-fe.nerdass.org | https://appwrite.nerdass.org/console | ⚠️ DNS frontend + setup manuale (vedi `apps/appwrite/README.md`) |
| **Next.js (CMS-less)** | https://next.nerdass.org | n/a — git push | ✅ Pronto (è il caso "senza CMS" per confronto) |

## Setup richiesto prima del primo test

### 1. DNS Cloudflare (4 record CNAME da aggiungere)

Dashboard Cloudflare → zona `nerdass.org` → DNS → Add record. Per ognuno:
- Type: **CNAME**
- Name: `strapi-admin` / `directus-admin` / `pocketbase-admin` / `appwrite-fe`
- Target: `<tunnel-uuid>.cfargotunnel.com` (lo stesso degli altri subdomain esistenti)
- Proxy: arancione (proxied)

Poi nella sezione Zero Trust → Networks → Tunnels → cms-demo → Public Hostname,
aggiungi 4 voci pubbliche corrispondenti:
- Hostname `<subdomain>.nerdass.org`, Service `http://10.10.101.20:80`

(Stesso pattern dei subdomain già configurati. Copia `infra/cloudflared/config.example.yml` se servono come template.)

### 2. Ghost: attivare il tema custom

Il tema `cms-demo` è già stato copiato nel volume di Ghost ma serve attivarlo una volta:
1. Vai su https://ghost.nerdass.org/ghost/
2. Settings → Design → Change theme → Installed → seleziona **cms-demo** → Activate.

Senza questo step, `/blog/`, `/portfolio/`, `/prenotazioni/` rispondono 404 perché Ghost serve ancora Casper (tema di default).

Se il tema **non compare** nell'elenco, il volume `ghost_content` è precedente al deploy del tema:
- Carica manualmente via admin: zippa `apps/ghost/theme/cms-demo/` e upload sotto Settings → Design → Upload a theme.

### 3. Appwrite: applicare lo schema

Appwrite non auto-crea le collezioni. Dopo il primo accesso a https://appwrite.nerdass.org/console (completa il setup wizard con Project ID = `cms-demo`):

```bash
# Una tantum, da una macchina dev:
npm install -g appwrite-cli
appwrite login    # endpoint: https://appwrite.nerdass.org/v1
cd apps/appwrite
appwrite push collection
```

Dettagli in `apps/appwrite/README.md`.

### 4. Credenziali admin

Tutte le creds (email admin + password) sono in Coolify panel → singola resource → Environment Variables. Per le 4 CMS che condividono email (Strapi, Directus, Payload, Appwrite, Ghost): contattare chi gestisce il deploy per la password.

## Smoke test rapido

Da PowerShell o bash, dopo che il DNS è in piedi:

```powershell
$urls = @(
  'https://strapi.nerdass.org/', 'https://strapi.nerdass.org/blog', 'https://strapi.nerdass.org/portfolio', 'https://strapi.nerdass.org/prenotazioni',
  'https://directus.nerdass.org/', 'https://directus.nerdass.org/blog', 'https://directus.nerdass.org/portfolio', 'https://directus.nerdass.org/prenotazioni',
  'https://pocketbase.nerdass.org/', 'https://pocketbase.nerdass.org/blog', 'https://pocketbase.nerdass.org/portfolio', 'https://pocketbase.nerdass.org/prenotazioni',
  'https://payload.nerdass.org/', 'https://payload.nerdass.org/blog', 'https://payload.nerdass.org/portfolio', 'https://payload.nerdass.org/prenotazioni',
  'https://ghost.nerdass.org/', 'https://ghost.nerdass.org/blog/', 'https://ghost.nerdass.org/portfolio/', 'https://ghost.nerdass.org/prenotazioni/',
  'https://appwrite-fe.nerdass.org/', 'https://appwrite-fe.nerdass.org/blog', 'https://appwrite-fe.nerdass.org/portfolio', 'https://appwrite-fe.nerdass.org/prenotazioni',
  'https://next.nerdass.org/', 'https://next.nerdass.org/blog', 'https://next.nerdass.org/portfolio', 'https://next.nerdass.org/prenotazioni'
)
foreach ($u in $urls) {
  try { $r = Invoke-WebRequest $u -MaximumRedirection 0 -SkipHttpErrorCheck -TimeoutSec 15; "$u -> $($r.StatusCode)" }
  catch { "$u -> ERR" }
}
```

Atteso: tutto 200 (Ghost 200/N/A su 3 dei 4).

## Cosa è "N/A" e perché

**Ghost** ha solo `/blog` funzionale. Le altre due rotte mostrano un placeholder che spiega il limite:
> Ghost è una piattaforma blog/newsletter. Non gestisce nativamente portfolio o prenotazioni.

Questo è il **risultato di validazione di Ghost**, non un bug: serve mostrare al cliente che Ghost non è adatto se vuole un portfolio o un form di prenotazioni gestito dallo stesso strumento.

**Next.js (CMS-less)** ha tutte e 3 le rotte ma niente UI admin. Per modificare blog/portfolio bisogna editare file `.md` nel repo e fare git push. Le prenotazioni vengono salvate in un file JSON sul container. Anche questo è un risultato volutamente acquisito: serve far vedere quanto valore aggiunge un vero CMS rispetto a "lo faccio in Next.js senza backend".

## Punti di confronto suggeriti

- **Time-to-first-content**: quanto tempo serve per fare il primo articolo, dall'apertura dell'admin alla visibilità sul frontend?
- **Form bookings**: la vista lista è ordinabile/filtrabile? Si può modificare lo status con un click o serve un'edit page completa?
- **Upload immagini**: dimensioni accettate, preview, sostituzione facile?
- **Multilingua**: necessario? Strapi e Directus lo supportano nativamente, Payload con plugin, Ghost no.
- **Effort di setup iniziale**: quante azioni manuali (login, attivazione tema, push CLI) serve fare prima che il cliente possa vedere qualcosa?

## Ridistribuzione

Per redeployare una singola CMS dopo modifiche al codice:
```powershell
.\tools\coolify\deploy.ps1 -Cms <name> -ForceRebuild
```
dove `<name>` è uno di: `directus`, `directus-frontend`, `strapi`, `strapi-frontend`, `pocketbase`, `pocketbase-frontend`, `ghost`, `payloadcms`, `appwrite`, `appwrite-frontend`, `nextjs-demo`.

Per build pesanti (Payload, Strapi, Next.js) aggiungi `-NoPoll` per evitare il timeout SSH a metà build; verifica lo stato dal pannello Coolify.

## Problemi noti

- **Cloudflare Access** può bloccare alcune route admin se la policy è troppo stretta. Se ricevi una 403, controlla Zero Trust → Access → Applications.
- **Strapi prima visita admin**: serve creare il primo super-admin manualmente da `https://strapi-admin.nerdass.org/admin` (Strapi non lo seedi via env).
- **Bookings di Next.js spariscono dopo il redeploy**: serve aggiungere un Persistent Storage in Coolify panel mappato su `/app/data`. È volutamente fragile per dimostrare il limite del CMS-less.
