# cms-demo — TODO / rafforzamento

Lista azionabile dei follow-up emersi durante il setup. Niente è bloccante per
i test dei colleghi (vedi `TESTING.md`), ma vanno valutati prima di considerare
il setup "production-grade".

## Accesso admin

- [ ] **Decidere identità Filippo**: la policy Pluriagency (`a40cb5e8-dc2f-4e0b-8ca1-353311ae198c`) include `filippo@fferretti.it` ma NON `filippo.ferretti@gmail.com`. Risultato: l'accesso ai 6 admin (Strapi, Directus, PocketBase, Appwrite, Payload, Ghost) va fatto col primo, l'admin Coolify pure. Se vuoi mantenere anche la gmail, aggiungerla a Pluriagency o creare una seconda policy inline su ciascuna app.
- [ ] **Ruotare la password Coolify** appena fatto login con `y0NZOF5CjyHWzHkeBy+/2ooD3Rgp4Sex` (è stata mostrata in chat → considerala compromessa).
- [ ] **Avvisare gli altri admin** del reset Coolify (come hai già detto).

## Superficie API non gated

Le API REST sui domini `*-admin.nerdass.org` (`/api/*`, `/items/*`, `/_/api/*`, `/v1/*`) restano pubbliche per permettere ai frontend di leggerle. Conseguenze:

- [ ] **Rate-limit Cloudflare sui path di login** (priorità media):
  - `directus-admin.nerdass.org/auth/login` → POST
  - `strapi-admin.nerdass.org/api/auth/local` → POST
  - `strapi-admin.nerdass.org/admin/login` (già coperto da Access, ma se l'Access cookie viene bypassato, rate-limit aggiuntivo è sano)
  - `pocketbase-admin.nerdass.org/api/admins/auth-with-password` → POST
  - `appwrite.nerdass.org/v1/account/sessions/email` → POST
  - Suggerito: 5 req / minuto / IP, block per 1h dopo.
- [ ] **Cloudflare WAF rule per bot scanners** sui path admin (`/admin`, `/_/`, `/console`, `/ghost`, `/wp-admin` per noise scraping). Usa la regola Managed Challenges per non bloccare i legit.
- [ ] **Service Token Cloudflare per i frontend** (priorità bassa, alta complessità): aggiungere un Service Token che ogni frontend Next.js include nella header `CF-Access-Client-Id` + `CF-Access-Client-Secret` quando chiama il proprio admin. Permette di chiudere `/api/*` dietro Access. Cost: ogni frontend deve avere i due secret nel proprio env Coolify, e si deve modificare lib/cms.ts per spedire le header.

## Coolify

- [ ] **Sessioni attive Coolify dopo il reset password**: le sessioni preesistenti continuano a funzionare finché il cookie scade. Per invalidare immediatamente tutte le sessioni serve `docker exec coolify php artisan auth:logout-all` o equivalente. Da fare se sospetti che un altro abbia ancora una sessione aperta.
- [ ] **MFA su Coolify**: dashboard → Profile → Two Factor Authentication. Particolarmente importante visto che il reset password è stato fatto via API senza secondo fattore.

## Ghost

- [ ] **Re-upload del tema cms-demo zip** dopo le ultime modifiche (Admin link su index.hbs + stile bottone). Il volume `ghost_content` conserva la versione che hai uploadato prima del fix. Le rotte funzionano comunque; è solo cosmetica:
  ```powershell
  Remove-Item apps\ghost\theme\cms-demo.zip -ErrorAction SilentlyContinue
  Compress-Archive -Path apps\ghost\theme\cms-demo -DestinationPath apps\ghost\theme\cms-demo.zip
  ```
  Poi Ghost admin → Settings → Design → Upload a theme.

## Strapi

- [ ] **Creare il primo super-admin** la prima volta che apri `https://strapi-admin.nerdass.org/admin`. Strapi non lo seedi via env — è il form di setup wizard al primo accesso.

## Appwrite

- [ ] **Backup API key**: se mai serve ripetere il push dello schema o aggiungere altre collezioni programmaticamente, crea una nuova API key (quella precedente è stata cancellata). Salvala in un password manager, NON nel repo.
- [ ] **Eliminare l'API key in chat**: la API key Appwrite postata in chat è stata cancellata via UI ma il fatto che sia passata per la conversazione è da considerare nel modello di minaccia (se la chat è salvata altrove, e.g., backup, può ricomparire). La rotazione è già la difesa giusta.

## Secrets / repo

- [ ] **Rotazione completa post-leak Secrets.txt**: hai detto "fatto" ma vale la pena tenere a mente che la history è stata riscritta (commit `1068c84` ora è l'HEAD; il vecchio `be918bd` non è più raggiungibile su GitHub ma può essere ancora in cache mirror tipo Software Heritage Archive). Per ogni credenziale che era in Secrets.txt:
  - Verifica nuovo valore live nei sistemi
  - Considera la vecchia "compromessa per sempre"
- [ ] **Avvisare i colleghi della riscrittura**: chi ha clone locale del repo deve fare `git fetch --prune && git reset --hard origin/main` (o rifare clone). Senza, `git pull` fallisce con divergence.

## Persistenza dati / backup

- [ ] **Volume Coolify per `nextjs-demo` bookings**: la rotta `/prenotazioni` scrive su `/app/data/bookings.json`. Senza persistent storage mappato su `/app/data` nel pannello Coolify, le prenotazioni si perdono al redeploy. Aggiungere via Coolify panel → resource → Storages → Add Persistent Storage.
- [ ] **Backup named volumes Coolify**: Coolify ha un sistema di backup S3-compatibili. Vedere se attivare per `directus_pg`, `ghost_mysql`, `payload-postgres`, `pocketbase_data`, `appwrite-mariadb`.

## Documentazione

- [ ] **Aggiornare TESTING.md** dopo che i colleghi hanno usato le 7 admin: compilare la matrice di rating in `README.md` con i punteggi 1-5.
- [ ] **CLAUDE.md** non riflette le nuove convention (admin su `<cms>-admin.nerdass.org`, Access apps create via API, ecc.). Rivedere prima della prossima sessione AI per evitare regressioni.

## Migliorie minori

- [ ] **Strapi richtext per il body**: di default è un richtext markdown. Considerare di sostituire con il blocco "Dynamic zone" o "Rich text (CKEditor)" via Strapi marketplace plugin se vuoi un'editor visuale più potente.
- [ ] **Payload: pulisci `push: true`**: in `apps/payloadcms/src/payload.config.ts` c'è `push: true` come trade-off per il demo. Per produzione: commenta + commit migrations file per ogni schema change.
- [ ] **Tema Ghost: warning "Not all page features"**: GScan flagga ancora un warning (non un errore). Per eliminarlo definitivamente, aggiungere supporto a `{{access}}` member-gated content, `{{pagination}}`, custom template helpers. Out of scope per il demo.
