---
title: "Piano di implementazione — restyling luigiscorzelli.com e lead magnet"
status: bozza
created: 2026-10-13
updated: 2026-10-15 (Fase 2 dettagliata; giorno 1 completato: prova tecnica superata, D1 confermata)
fonti:
  - "~/Downloads/piano-acquisizione-lead-magnet.md (strategia, specifiche dei lead magnet)"
  - "Canvas di design: https://claude.ai/artifact/S85wx3BYHmU9ohuDBnRvSv"
  - "Codice attuale in questa cartella (index.html, en.html, api/, assets/)"
---

# Piano di implementazione

Obiettivo: mettere online il nuovo sito (homepage, `/check-up`, `/visibilita-ai`, `/agenzie`) con i due lead magnet funzionanti, misurati e collegati al CRM, più le immagini e i video nuovi.

**Due rilasci:**
- **Rilascio 1 (5/11, MVP per l'outbound):** correzioni rapide, fondamenta Astro, `/visibilita-ai` con audit funzionante, `/agenzie`, `/privacy`.
- **Rilascio 2 (27/11):** check-up, nuova homepage, sequenze email, video.

**Condizione di "fatto" complessiva:** un visitatore può fare il check-up o l'audit, vede subito il risultato, se lascia l'email riceve il report PDF, il contatto compare in HubSpot con le proprietà giuste, Luigi riceve l'avviso per i lead caldi, e ogni passaggio è misurato in Umami.

---

## 0. Punto di partenza (verificato il 13/10/2026)

| Elemento | Stato attuale |
| --- | --- |
| Hosting | Vercel (cartella `.vercel/` collegata), repository Git con PR già usate |
| Sito | HTML statico: `index.html`, `en.html`, 6 pagine case study (IT + EN), `404.html`, `styles.css`, `script.js` |
| Funzioni server | `api/contact.js` + `api/_contact-core.js` (validazione, origine, rate limit, Turnstile, HubSpot, Resend), `api/chat.js` (chatbot con AI SDK, conoscenza da `llms.txt`) |
| Rate limit attuale | **In memoria** (`new Map()` in `_contact-core.js:56`): vale per singola istanza e si azzera a ogni avvio a freddo. Va bene come freno per il form contatti, non come protezione per audit e check-up (vedi D13) |
| Lettura di `llms.txt` | `api/chat.js:26` lo legge con `join(__dirname, "..", "llms.txt")`, cioè dalla radice del progetto: se il file si sposta, il chatbot perde la conoscenza |
| `vercel.json` | Assente |
| Dipendenze | `ai`, `resend`, `zod` |
| Variabili d'ambiente in uso | `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, `HUBSPOT_TOKEN`, `TURNSTILE_SECRET_KEY`, `TURNSTILE_HOSTNAMES`, `CHAT_MODEL` |
| SEO/GEO | `robots.txt`, `sitemap.xml`, `llms.txt`, JSON-LD Person/WebSite/FAQPage |
| VPS n8n (verificata e messa in sicurezza il 13/10) | Hetzner `portfolio-vps`, progetto "Portfolio": CX23 (2 vCPU, 4 GB RAM, 40 GB disco), Falkenstein, IP `167.233.196.196`, Ubuntu 26.04 LTS. Container (compose in `/opt/portfolio/progetto-1-whatsapp-rag/`): `nginx:alpine` (reverse proxy, porte 80/443), `n8nio/n8n:2.27.3` (database SQLite, nessun Postgres), `certbot` (rinnovo ogni 12 h). Dominio n8n: `studidentisticorossi.duckdns.org` (certificato Let's Encrypt valido fino al 21/11/2026). Dopo il riavvio: 3,1 GB di RAM disponibili, 28 GB di disco liberi |
| Problemi noti | vecchia email Gmail ovunque (anche in JSON-LD e `llms.txt`), call da 15 min, titolo "5 case study" con 4 schede visibili (3 con pagina dedicata + "Estrazione dati da PDF" senza pagina), nessuna misurazione, case study non dichiarati dimostrativi in homepage |
| File non tracciati | `CHATBOT-TEST.md`, `demo-visibili-piano-implementazione.md`, `strategie-trader-dev/` (da decidere se tenerli fuori dal repo) |
| File tracciati e pubblicati per errore | `design_handoff_portfolio/` (contiene anche la vecchia email e una vecchia versione del sito): non esiste `.vercelignore`, quindi viene servita in produzione |

---

## 1. Decisioni da prendere prima di iniziare

Bloccano il lavoro: vanno chiuse nella Fase 0. Al 14/10 sono tutte chiuse.

| # | Decisione | Proposta | Blocca |
| --- | --- | --- | --- |
| D1 | Tecnologia del nuovo sito | ✅ **Deciso: Astro in output statico**, JS vanilla per le parti interattive, funzioni `/api` di Vercel invariate. Condizione: la prova tecnica della Fase 2 deve confermare che `/api/contact` e `/api/chat` funzionano; altrimenti HTML puro. **Confermato il 15/10 dalla prova tecnica** (esito nella Fase 2) | Fase 2 |
| D2 | Garanzia | ✅ **Decisa** (testo e regole operative sotto la tabella) | Fase 7 |
| D3 | Canone mensile | ✅ **Deciso: 300 €/mese**, nessun vincolo, disdetta con 30 giorni (voci incluse sotto la tabella) | Fase 7 |
| D4 | Prezzo white label "siti pronti per l'AI" (D7 del piano) | ✅ **Deciso** (listino sotto la tabella), da verificare con 2–3 agenzie di E07 | Fase 4 |
| D5 | Email unica | ✅ **Deciso:** `luigiscorzelli@aiframe.it` su sito, JSON-LD, `llms.txt`, firme | Fase 1 |
| D6 | Mittente dei report | ✅ **Deciso:** Resend (già integrato) con dominio verificato `aiframe.it` o sottodominio `mail.aiframe.it` | Fase 3 |
| D7 | Sequenze email dopo i lead magnet | ✅ **Deciso:** Brevo free per le sequenze (gestisce disiscrizioni), Resend solo per le email transazionali | Fase 7 |
| D8 | Generatore PDF | ✅ **Deciso:** Gotenberg in Docker sulla VPS di n8n (gratuito, nessun dato a terzi) | Fase 3 |
| D9 | Dove gira n8n in produzione | ✅ **Deciso e verificato (13/10): VPS esistente** (`portfolio-vps`, sezione 0). RAM disponibile 3,1 GB + swap 2 GB (Gotenberg ~1 GB ci sta); HTTPS con Nginx + Certbot; backup giornalieri Hetzner attivi (7 copie, coprono anche il file SQLite di n8n); aggiornamenti automatici di sicurezza attivi. Dettaglio degli interventi sotto la tabella | Fase 3 |
| D10 | Versione inglese | ✅ **Deciso:** congelata (solo correzioni rapide), da rifare dopo la validazione dell'ICP. Dal nuovo sito il link EN punta alle vecchie pagine | Fase 2 |
| D11 | Tracker visitatori di Apollo | ✅ **Deciso:** rinviato, da valutare con l'esperto privacy (A01) | Fase 8 |
| D12 | Hosting video | ✅ **Deciso:** clip muta della homepage in MP4 sul sito; video lunghi (V2, V3) su YouTube "non in elenco" con caricamento al clic (nessun cookie prima del clic) | Immagini e video |
| D13 | Salvataggio dati per rate limit, audit già calcolati e coda di recupero | ✅ **Deciso (13/10): Upstash Redis** dal Marketplace Vercel (piano gratuito, variabili d'ambiente iniettate in automatico). Scartata: tabella nel Postgres di n8n, perché rate limit e coda dipenderebbero da n8n, che è proprio il caso da coprire | Fase 3 |
| D14 | Prenotazione call | ✅ **Deciso: Calendly**, evento da 30 minuti: `https://calendly.com/luigi-scorzelli/30min` (sostituisce Cal.com) | Fase 1 |
| D15 | Controllo PageSpeed nel punteggio dell'audit | ✅ **Deciso (13/10): fuori dal punteggio.** Il punteggio (0–100) usa solo i controlli fatti subito, quindi a schermo e nel PDF è lo stesso numero; la velocità compare nel report come sezione a parte, senza punti. Alternativa scartata: mostrare "X/95" a schermo e "Y/100" nel PDF | Fase 3 |
| D16 | Strumento di statistiche | ✅ **Deciso (14/10): Umami Cloud, piano Hobby gratuito** (100.000 eventi/mese, 6 mesi di storico, eventi con proprietà e funnel inclusi), regione EU. Sito "Portfoglio", Website ID `a8ce1cae-353e-4bad-b60c-63a411c5de15`, script `https://cloud.umami.is/script.js` con `data-domains` limitato a `luigiscorzelli.com` e `www.luigiscorzelli.com` (anteprime e localhost non vengono contati). Gli eventi non vanno creati nel pannello: compaiono da soli in Events. Scartati: Plausible Cloud (a pagamento dopo la prova, proprietà solo nel piano da $19) e Umami sulla VPS (lavoro e manutenzione; resta possibile in futuro). Il tracker visitatori di Apollo non sostituisce lo strumento di statistiche (vedi D11) | Fase 1 |

### VPS: interventi del 13/10 (D9)

Fatti sulla VPS `portfolio-vps` dopo un backup manuale:

1. **Backup giornalieri Hetzner attivati** (20% del piano, circa 1,60/mese, 7 copie a rotazione) + backup manuale prima delle modifiche.
2. **Firewall Hetzner `portfolio-vps-web`**: in ingresso solo TCP 22, 80, 443 e ICMP; uscita libera. Prima dell'applicazione rispondevano già solo 22/80/443 (la 5678 di n8n non è esposta).
3. **Compose** (`/opt/portfolio/progetto-1-whatsapp-rag/docker-compose.yml`, copia in `docker-compose.yml.bak-2026-10-13`): n8n fissato a `n8nio/n8n:2.27.3` invece di `latest`; `restart: unless-stopped` aggiunto a Certbot (prima `no`).
4. **Swap da 2 GB** (`/swapfile`, in `/etc/fstab`, `vm.swappiness=10`).
5. **Aggiornamenti**: installati i 49 pacchetti in sospeso, `unattended-upgrades` attivo (aggiornamenti di sicurezza giornalieri, senza riavvio automatico), riavvio eseguito: i 3 container ripartono da soli.
6. **Cron di root** `0 4 * * * docker exec progetto-1-whatsapp-rag-nginx-1 nginx -s reload`: senza, Nginx avrebbe continuato a servire il certificato scaduto dopo il rinnovo di Certbot.

Da tenere presente per le fasi successive:

- **Dominio di n8n:** oggi è quello della demo (`studidentisticorossi.duckdns.org`). Per i webhook del sito (Fase 3) conviene un sottodominio proprio, es. `n8n.aiframe.it`, con un nuovo `server_name` e certificato in Nginx.
- **Nuovi servizi** (Gotenberg, eventuale Umami) vanno aggiunti dietro lo stesso Nginx; i certificati si ottengono con il container Certbot esistente (webroot `/.well-known/acme-challenge/`).
- **Riavvii:** gli aggiornamenti automatici non riavviano il server; quando compare "System restart required", riavviare a mano dopo aver controllato che l'ultimo backup sia recente.
- **Verifica del 14/10:** tutti gli interventi sopra confermati via SSH; backup giornalieri e firewall `portfolio-vps-web` confermati dalla console. Umami **non** è installato sulla VPS (D16 usa Umami Cloud). Il container n8n porta ancora l'etichetta `n8nio/n8n:latest` perché non è stato ricreato dopo la modifica al compose, ma la versione in esecuzione è già la 2.27.3: si allinea al prossimo `docker compose up -d`. La copia `docker-compose.yml.bak-2026-10-13` contiene già la 2.27.3 (differisce solo per `restart` di Certbot).
- **Accesso SSH:** chiave `~/.ssh/id_ed25519` del Mac di Luigi (con passphrase, salvata nel Portachiavi).

### Garanzia (D2): testo e regole operative

Testo sul sito:

> Prima di firmare vedi una demo funzionante con le informazioni della tua azienda. Se non ti convince, ci fermiamo lì: non hai firmato nulla e non devi nulla.
> Dopo la firma, il pilota fa quello che è scritto nella scheda di progetto. Altrimenti lo sistemo senza costi.

Regole interne per renderla sostenibile:

1. **La demo non è il progetto:** una delle 3 demo esistenti, duplicata da un modello e configurata con 15–20 domande frequenti, nome e dati di esempio del cliente. Nessun collegamento ai suoi sistemi. Tempo massimo 3–4 ore, mostrata in una seconda call di 30 minuti.
2. **Solo dopo l'analisi gratuita** e solo se: alla call c'è chi decide, il budget da 1.500 € è compatibile, il processo è chiaro.
3. **Massimo 4 demo al mese.**
4. **Dopo la demo:** scheda di progetto firmata con 5–8 punti verificabili, acconto del 50%, saldo alla consegna. La seconda garanzia vale solo sui punti scritti nella scheda.
5. Da preparare in Fase 0: 3 modelli di demo duplicabili e il modello della scheda di progetto. Condizioni contrattuali da far verificare al consulente.

### Canone (D3): cosa include

- Incluso: monitoraggio e avvisi di errore; correzioni se qualcosa si rompe; fino a 2 ore al mese di piccole modifiche; rapporto mensile con richieste gestite ed errori.
- Escluso: costi di servizi esterni (API dell'AI, WhatsApp Business, CRM a pagamento), fatturati a parte o al costo; nuovi flussi = nuovo progetto.
- Nessun vincolo, disdetta con 30 giorni; il sistema resta del cliente.

### Listino white label per agenzie (D4)

| Voce | Prezzo all'agenzia | Prezzo consigliato al cliente finale |
| --- | --- | --- |
| Sito pronto per l'AI: homepage + fino a 10 pagine, robots.txt, sitemap, JSON-LD (Organization/LocalBusiness, Service, FAQPage), `llms.txt`, bozza FAQ, report prima/dopo con il marchio dell'agenzia | 350 € a sito | 600–900 € |
| Pacchetto 5 siti | 1.500 € (300 € a sito) | — |
| Monitoraggio mensile (audit rifatto + report white label) | 30 € a sito/mese | 60–90 € |
| Siti grandi o e-commerce | su preventivo | — |
| Progetti di automazione in white label | 1.500–3.000 € a progetto | lo decide l'agenzia |

Tempo stimato per un sito WordPress con controlli automatici e modelli pronti: 3–4 ore (circa 100 €/ora). Verifica: se nessuna delle prime 2–3 agenzie obietta sul prezzo, probabilmente è basso.

---

## 2. Architettura

```
                         Vercel (luigiscorzelli.com)
 ┌──────────────────────────────────────────────────────────────────┐
 │  Pagine statiche (Astro build)                                   │
 │   /  /check-up  /visibilita-ai  /agenzie  /casi/*  /privacy      │
 │   JS: calcolatore, wizard check-up, form audit, link Calendly    │
 │                                                                  │
 │  Funzioni /api (Node)                                            │
 │   contact.js   (esistente)                                       │
 │   chat.js      (esistente, legge public/llms.txt)                │
 │   checkup.js   NUOVA: valida → calcola → risponde subito         │
 │                       → se email+consenso: inoltra a n8n         │
 │   audit.js     NUOVA: valida URL (anti-SSRF) → 4 GET in          │
 │                       parallelo → controlli → punteggio          │
 │                       → risponde → inoltra a n8n                 │
 │   _lib/checkup-score.js  formula UNICA (usata anche dal browser) │
 │   _lib/audit-checks.js   controlli UNICI (usati anche dal batch) │
 │   (il prefisso _ impedisce a Vercel di pubblicarle come endpoint)│
 └───────┬───────────────────────────────┬──────────────────────────┘
         │                               │ rate limit, audit salvati 24 h,
         │                               │ coda di recupero
         │                               ▼
         │                      Upstash Redis (D13)
         │ webhook firmato (HMAC + timestamp, segreto condiviso)
         ▼
          n8n (server proprio)
   ├─ PageSpeed Insights (solo audit, asincrono, fuori dal punteggio: D15)
   ├─ LLM: testi del report a partire dai numeri (niente cifre nuove)
   ├─ HTML → PDF (Gotenberg)
   ├─ Email con PDF (Resend)
   ├─ HubSpot: contatto + proprietà
   ├─ Brevo: iscrizione alla sequenza (solo con consenso marketing)
   └─ Avviso a Luigi (Telegram/email) per i lead caldi
```

Principi:

- **I numeri si calcolano in un solo posto** (`api/_lib/checkup-score.js`, `api/_lib/audit-checks.js`). Il browser li usa per il risultato immediato, il server li ricalcola e fa fede. L'LLM riceve solo i numeri e scrive il testo. I due file non devono importare moduli solo-Node (`fs`, `dns`, `net`), altrimenti il bundle del browser si rompe: la parte di rete sta in `ssrf-guard.js`.
- **Lo stesso numero ovunque.** Il punteggio a schermo, quello in HubSpot e quello nel PDF sono identici: tutto ciò che si calcola dopo (PageSpeed) è informazione aggiuntiva, non punti (D15).
- **Il risultato non dipende da n8n.** Se n8n è giù, l'utente vede comunque il risultato; la richiesta va nella coda di recupero su Redis (D13) e viene ritentata.
- **L'URL di n8n non è mai esposto** nel frontend. Le funzioni Vercel riusano da `_contact-core.js` controllo dell'origine, Turnstile e honeypot; il rate limit di audit e check-up passa invece su Redis (D13), perché quello in memoria non è condiviso tra le istanze.
- **Webhook verso n8n:** firma HMAC calcolata su `timestamp + corpo`; n8n rifiuta firme non valide e richieste più vecchie di 5 minuti (protezione dal replay).
- **All'LLM non arrivano nome ed email** (sezione 6 del piano): solo risposte strutturate o dati tecnici del sito.

### Struttura delle cartelle dopo la migrazione (con D1 = Astro)

```
landingpage/
├── api/                     # invariata + checkup.js, audit.js
│   ├── _lib/                # checkup-score.js, audit-checks.js, ssrf-guard.js, n8n-client.js, store.js (Redis)
├── src/
│   ├── layouts/Base.astro   # head, meta, JSON-LD, header, footer, Umami
│   ├── components/          # Header, Footer, Calculator, Timeline, DemoCard,
│   │                        # Pricing, Objections, BookCall (link Calendly), VideoFacade, ToolsStrip
│   ├── pages/
│   │   ├── index.astro
│   │   ├── check-up.astro
│   │   ├── visibilita-ai.astro
│   │   ├── agenzie.astro
│   │   ├── privacy.astro
│   │   └── casi/[slug].astro
│   ├── scripts/             # calculator.js, checkup-wizard.js, audit-form.js, analytics.js
│   └── styles/tokens.css    # colori, font, spazi dal design
├── public/                  # llms.txt, robots.txt, favicon, immagini, video + sito attuale IT/EN congelato fino alla Fase 7
├── tests/                   # node:test
├── .vercelignore            # esclude design_handoff_portfolio/, strategie-trader-dev/, *.md interni
└── vercel.json              # framework astro, includeFiles per chat.js, maxDuration per audit.js (dalla Fase 3)
```

**`llms.txt` e chatbot:** il file pubblico resta `public/llms.txt` (fonte unica da modificare). `chat.js` lo legge direttamente da lì, con `includeFiles` in `vercel.json` per essere sicuri che il file finisca nel pacchetto della funzione (decisione del 15/10). Riserva, se la prova tecnica della Fase 2 fallisce: uno script di build lo copia in `api/_data/llms.txt` e `chat.js` legge la copia.

---

## 3. Fasi

Le date presumono circa 4 ore al giorno sul progetto (la quota Freelance/Agenzia), dal lunedì al venerdì, una fase alla volta: nessuna sovrapposizione tra fasi di sviluppo. Le revisioni già fissate restano e quei giorni non contano come giorni di lavoro sul sito: 16/10 (demo A), 9/11 (Casa in Regola), 15/12.

| Fase | Date | Giorni | Rilascio |
| --- | --- | --- | --- |
| 0 Decisioni e account | 14–15/10 | 1 | — |
| 1 Correzioni rapide sul sito attuale | 19–20/10 | 1,5 | in produzione subito |
| 2 Fondamenta Astro | 21–23/10 | 3 | — |
| 3 Audit visibilità AI | 26–30/10 | 5 | 1 |
| 4 `/agenzie` e `/privacy` | 2–3/11 | 2 | 1 |
| 5 Collaudo e lancio del Rilascio 1 | 4–5/11 (+ 6/11 margine) | 2 | **1 → 5/11** |
| 6 Check-up richieste perse | 10–16/11 | 5 | 2 |
| 7 Nuova homepage e sequenze | 17–20/11 | 4 | 2 |
| 8 Collaudo e lancio del Rilascio 2 | 23–24/11 (+ 25–26/11 margine) | 2 | **2 → 27/11** |
| Immagini e video | in parallelo (lavoro di Luigi) | 3 + 1 | V3 entro il 6/11, il resto entro il 16/11 |

### Fase 0 — Decisioni e account (14–15/10, ~1 giorno)

- [x] Chiudere D13 (Upstash Redis) e D15 (PageSpeed fuori dal punteggio), chiuse il 13/10.
- [ ] Verificare l'evento Calendly `https://calendly.com/luigi-scorzelli/30min`: titolo "Analisi gratuita 30 min", domande del modulo (azienda, sito, processo da automatizzare), email di conferma, fuso orario Europe/Rome.
- [x] Chiudere D16: Umami Cloud (14/10).
- [ ] Creare o verificare gli account: Brevo, Upstash Redis (dal Marketplace Vercel), chiave API PageSpeed Insights (Google Cloud).
- [ ] DNS di `aiframe.it`: casella `luigiscorzelli@aiframe.it`, dominio verificato in Resend (SPF, DKIM, DMARC).
- [x] VPS di n8n (D9): verificata e messa in sicurezza il 13/10 (vedi "VPS: interventi del 13/10" nella sezione 1).
- [x] Attivare la 2FA sull'account Hetzner: attiva dal 14/10 (Google Authenticator, chiave di recupero conservata).
- [ ] HubSpot: creare le proprietà personalizzate (sezione 4).
- [x] Ripulire il repository (14/10, PR #5): `.claude/` in `.gitignore`, `CHATBOT-TEST.md` nel repository, il vecchio piano `demo-visibili-piano-implementazione.md` spostato nella cartella `portfoglio`; `.vercelignore` già creato nella Fase 1.

**Fatto quando:** D13 e D15 hanno una risposta scritta nella sezione 1 e tutti gli account rispondono.

### Fase 1 — Correzioni rapide sul sito attuale (19–20/10, ~1,5 giorni)

Si fanno subito sul sito HTML esistente, prima della ricostruzione, perché l'outbound parte ora.

| # | Intervento | File |
| --- | --- | --- |
| 1 | Email → `luigiscorzelli@aiframe.it` ovunque | `index.html`, `en.html`, 6 case study, `404.html`, `llms.txt`, JSON-LD, `api/_contact-core.js` (default `CONTACT_TO_EMAIL`), `SETUP-CONTACT-FORM.md` |
| 2 | "Prenota la call" → `https://calendly.com/luigi-scorzelli/30min` (nuova scheda, con parametri UTM) | `index.html`, `en.html`, case study |
| 3 | Call da 15 → 30 minuti | `index.html`, `en.html`, JSON-LD FAQ, `llms.txt` |
| 4 | Titolo "5 case study" → "4 progetti dimostrativi" (le 4 schede visibili) e dicitura "progetto dimostrativo con dati di esempio" su ogni scheda e pagina | `index.html`, `en.html`, case study |
| 5 | Umami + eventi sui pulsanti principali | `index.html`, `en.html`, `script.js` |
| 6 | Allineare `llms.txt` (email, link Calendly, call da 30 minuti, dimostrativi) perché il chatbot legge da lì | `llms.txt` |
| 7 | `.vercelignore` per togliere dalla produzione `design_handoff_portfolio/` e i file interni | `.vercelignore` |

Prima del rename dell'email: `grep -rn "luigidev2018" . --exclude-dir=node_modules --exclude-dir=.git` → lista completa → sostituzione in un solo passaggio → nuovo grep per verificare che non resti nulla (regola 6 di CLAUDE.md). Il grep del 13/10 trova anche `design_handoff_portfolio/Portfolio.dc.html` e `design_handoff_portfolio/_old_version/index.html`: vanno ripuliti oppure esclusi dalla pubblicazione con il punto 7.

**Test:** il form contatti invia ancora (anteprima Vercel), il chatbot risponde con la nuova email e il link Calendly, ogni pulsante "Prenota" apre l'evento da 30 minuti, gli eventi compaiono in Umami (sezione Events), `https://<anteprima>/design_handoff_portfolio/Portfolio.dc.html` risponde 404.
**Fatto quando:** deploy in produzione e grep pulito.

### Fase 2 — Fondamenta del nuovo sito (21–23/10, ~3 giorni)

Decisioni del 15/10:
- **Il sito attuale resta online così com'è fino alla Fase 7.** Homepage IT, `en.html`, i 6 case study (IT + EN), `404.html`, `styles.css`, `script.js` e `assets/` vanno in `public/` senza modifiche. Finché non c'è la nuova homepage **non si crea `src/pages/index.astro`**, perché andrebbe in conflitto con `public/index.html`.
- **URL dei case study invariati** (`case-study-*.html`) per tutto il Rilascio 1; il passaggio a `/casi/...` con redirect 301 si decide nella Fase 7.
- **`llms.txt`: prima la soluzione più semplice.** `chat.js` legge direttamente `public/llms.txt` con `includeFiles` (nessuno script di copia, nessun file generato). Se la prova tecnica fallisce, si passa alla copia in `api/_data/llms.txt` durante il build.
- **`maxDuration` per `audit.js` passa alla Fase 3:** Vercel blocca il build se una regola `functions` di `vercel.json` punta a un file che non esiste ancora.

Giorno 1, prova tecnica e inizializzazione:
- [x] Branch `feat/fase-2-astro`. Astro minimo in output statico, cartella `api/` invariata, `vercel.json` con `"framework": "astro"` (oggi il progetto è pubblicato come HTML statico; l'output diventa `dist/`) e `includeFiles` per `chat.js`.
- [x] **Prova tecnica (mezza giornata, prima di tutto)** sull'anteprima Vercel:
  - `/api/contact` invia ancora;
  - `/api/chat` risponde **usando `llms.txt`** dalla nuova posizione (domanda di controllo: "qual è l'email di Luigi?" → `luigiscorzelli@aiframe.it`);
  - un file di prova `api/_lib/probe.js` **non** è raggiungibile come URL (deve rispondere 404);
  - lo stesso modulo di `api/_lib/` si importa sia da una funzione sia da uno `<script>` di Astro.
  Se uno di questi fallisce, ci si ferma e si torna a D1 (HTML puro).
- [x] Sito attuale completo in `public/` (vedi decisioni sopra) e confronto prima/dopo: tutti gli URL di oggi rispondono uguale.

**Esito del giorno 1 (15/10, anteprima `portfolio-neyg7rnte-…vercel.app`, commit `75ee342`):**
- Build Astro superato in locale e su Vercel con `"framework": "astro"`; `dist/` = `public/` + la pagina di prova.
- `/api/_lib/probe`, `/api/_lib/probe.js` e `/api/_contact-core` → 404. `api/_lib/probe.js` importato sia da `api/probe.js` sia dallo script di `/prova-tecnica/`.
- Chatbot: alla domanda di controllo risponde con `luigiscorzelli@aiframe.it` e il link Calendly, presenti solo in `public/llms.txt`. **La lettura diretta da `public/` funziona: la copia in `api/_data/` non serve.**
- Form contatti: invio reale verificato a mano da Luigi; la validazione risponde come prima.
- Confronto con la produzione su 29 URL (pagine della sitemap, varianti senza `.html`, `/index.html`, asset, `/api/*`, pagina inesistente, `design_handoff_portfolio/`): codici di risposta identici; asset e pagine HTML identici byte per byte, a parte lo script della barra di Vercel che le anteprime aggiungono in coda alle pagine. La 404 personalizzata resta.
- File di prova (`api/probe.js`, `api/_lib/probe.js`, `src/pages/prova-tecnica.astro`): restano fino alla fine della Fase 2 per ripetere i controlli, **da togliere prima del merge**.
- Da sapere: sulle anteprime Turnstile non è attivo (una richiesta senza token supera il controllo), quindi `TURNSTILE_SECRET_KEY` non arriva all'ambiente Preview. Va bene per i test; da rivedere nella Fase 3 se servono test anti-bot sulle anteprime (servirebbe anche `TURNSTILE_HOSTNAMES` per Preview).
- Da sapere: `luigiscorzelli.com` reindirizza (308) a `www.luigiscorzelli.com`, mentre `canonical`, `hreflang`, sitemap e JSON-LD usano il dominio senza www. Da allineare (dominio principale su Vercel oppure URL nei file) prima della Fase 5, quando la sitemap va inviata a Search Console.

Giorno 2, design di base:
- [ ] `tokens.css` dai valori del design: `#EFF1ED` base, `#11161B` testo e sezioni scure, `#2340E8` azioni, `#B33A12` perdite, `#0F6E4B` esiti positivi.
- [ ] Font Bricolage Grotesque, Geist e Geist Mono in locale con i pacchetti `@fontsource` (non da Google, per privacy e velocità).
- [ ] Componenti condivisi: `Base.astro` (meta, OG, JSON-LD, Umami), `Header`, `Footer`, `BookCall` (link Calendly con UTM ed evento `cta_call`), `VideoFacade`.

Giorno 3, integrazione e test:
- [ ] Widget chatbot e form contatti in `Base.astro`, riusando `assets/chat-widget.*` e la logica di `script.js`.
- [ ] Pagina di prova vuota con il layout, fuori dalla sitemap.
- [ ] `npm test` con `node:test`, pronto per i test della Fase 3.

**Test:** `npm run build` senza errori, i 4 controlli della prova tecnica superati sull'anteprima, Lighthouse ≥ 90 sulla pagina di prova, nessuna differenza visibile sulle pagine attuali.
**Fatto quando:** PR con anteprima che supera tutti i test; il merge in produzione è invisibile ai visitatori (stesso sito di oggi).
**Rischio principale:** compatibilità tra Astro e le funzioni `/api` (coperto dalla prova tecnica).

### Fase 3 — Audit visibilità AI (26–30/10, ~5 giorni)

Prima del check-up perché serve subito per l'outbound verso le web agency (ICP A).

1. `api/_lib/store.js` (D13): client Upstash Redis con tre usi:
   - rate limit per IP (es. 5 audit all'ora) e per dominio analizzato (1 analisi ogni 24 ore, poi si restituisce quella salvata);
   - risultati degli audit salvati per 24 ore, chiave = dominio normalizzato;
   - coda di recupero: se l'inoltro a n8n fallisce, la richiesta viene salvata e ritentata (cron di Vercel ogni 15 minuti, massimo 5 tentativi, poi avviso a Luigi).
   Se Redis non risponde, l'audit funziona comunque (si salta la cache) ma il rate limit ricade su quello in memoria di `_contact-core.js`.
2. `api/_lib/ssrf-guard.js`:
   - accetta solo `http`/`https` sulle porte 80 e 443;
   - risolve il DNS e rifiuta IP privati, di loopback, link-local, di metadata cloud e IPv6 equivalenti (compresi gli IPv4 mappati, es. `::ffff:127.0.0.1`);
   - **blocca l'IP controllato sulla connessione** (`lookup` personalizzata nel dispatcher di undici), così il dominio non può cambiare indirizzo tra il controllo e la richiesta (DNS rebinding);
   - segue al massimo 3 redirect ricontrollando ogni salto;
   - timeout di 8 s per richiesta, risposte limitate a 2 MB, user-agent identificabile (`LuigiScorzelliAuditBot/1.0 (+https://luigiscorzelli.com/visibilita-ai)`).
3. `api/_lib/audit-checks.js`: i controlli della sezione 5.2 del piano, con i loro pesi (robots per GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot e Google-Extended; sitemap; JSON-LD Organization/LocalBusiness, Service/Product, FAQPage; `llms.txt`; H1 e meta description; FAQ; dati aziendali in testo; HTTPS e contenuto nell'HTML iniziale). **Il controllo PageSpeed non dà punti (D15):** i 5 punti che il piano gli assegnava vanno ridistribuiti sugli altri controlli, così il punteggio resta su 100 ed è lo stesso a schermo, in HubSpot e nel PDF.
4. `api/audit.js`: validazione (zod), Turnstile, rate limit e cache tramite `store.js`, le 4 GET (pagina, `robots.txt`, `sitemap.xml`, `llms.txt`) **in parallelo** con un tempo massimo complessivo di 15 s, `maxDuration` di 30 s in `vercel.json` (regola da aggiungere insieme al file, non prima); risposta con punteggio, livello e controlli.
5. Workflow n8n `audit-report`: webhook firmato (HMAC + timestamp) → PageSpeed (sezione "velocità" del report, senza punteggio) → LLM (5 correzioni + snippet adattati) → HTML → PDF → email → HubSpot (`audit_score`, `audit_tipo`, `audit_url`) → avviso a Luigi se tipo = agenzia.
6. **Versione per l'outbound:** script `scripts/audit-batch.mjs` che legge un CSV di URL, usa le stesse `audit-checks.js` e `ssrf-guard.js` e salva PDF e risultati in una cartella, senza inviare email.
7. Pagina `/visibilita-ai` dal design, con modulo, stato di caricamento, risultato e le due CTA (azienda → Calendly / agenzia → `/agenzie`).

**Test:**
- unit test dei controlli su 6 HTML di esempio salvati in `tests/fixtures/` (sito perfetto, sito vuoto, robots che blocca, JSON-LD malformato, contenuto solo via JS, nessun H1); il sito perfetto deve fare 100;
- test anti-SSRF: `http://127.0.0.1`, `http://169.254.169.254`, `http://localhost`, `http://[::1]`, `http://[::ffff:127.0.0.1]`, un dominio che risolve su `10.x`, redirect verso un IP privato, porta 8080, `file://` → tutti rifiutati;
- test di DNS rebinding: un risolutore finto che restituisce prima un IP pubblico e poi `127.0.0.1` → la connessione deve andare all'IP pubblico controllato o fallire;
- test di `store.js`: secondo audit dello stesso dominio entro 24 ore → risultato salvato, nessuna nuova GET; Redis spento → l'audit risponde comunque;
- test del webhook: firma sbagliata e timestamp vecchio di 6 minuti → rifiutati da n8n;
- manuale: 10 siti reali di agenzie campane confrontati a mano con il punteggio.

**Fatto quando:** audit dei siti delle prime 20 agenzie generato con lo script batch, e un audit dalla pagina arriva via email con PDF, compare in HubSpot e il punteggio è lo stesso nei tre posti.

### Fase 4 — `/agenzie` e `/privacy` (2–3/11, ~2 giorni)

- [ ] `/agenzie` (1 giorno): pagina dal design, con la tabella "chi fa cosa", prezzi (D4), offerta "5 audit gratuiti", link Calendly e copertina del video V3.
- [ ] `/privacy` (1 giorno): serve **prima** di raccogliere email con l'audit. Finalità, base giuridica, conservazione, fornitori (Vercel, Upstash, n8n/VPS, HubSpot, Resend, Brevo, Google PageSpeed, provider LLM, Calendly, Umami). **Da far rivedere all'esperto (A01)** prima del 5/11.
- [ ] Caselle di consenso separate e non preselezionate nel modulo dell'audit (report / comunicazioni commerciali).

### Fase 5 — Collaudo e lancio del Rilascio 1 (4–5/11, margine il 6/11)

- [ ] Lista di controllo della sezione 6, per le voci che riguardano audit, `/agenzie` e `/privacy`.
- [ ] Deploy in produzione, controllo dei redirect, sitemap aggiornata e inviata a Search Console.
- [ ] L'audit lanciato **sul nostro sito** dà almeno 85.
- [ ] Partenza dell'esperimento E07 (50 agenzie con l'audit), con il dominio d'invio già riscaldato e il video V3.
- [ ] Post LinkedIn di lancio dell'audit.

**Fatto quando:** audit, `/agenzie` e `/privacy` in produzione e le prime 10 email dell'E07 inviate.

### Fase 6 — Check-up richieste perse (10–16/11, ~5 giorni)

1. `api/_lib/checkup-score.js`: formula della sezione 5.1 (base 5%, pesi, limiti 5–50%, perdita = richieste × 4,33 × p × chiusura/10 × valore, intervallo 70–130%, punteggio (p−5)/45×100, scelta dei 3 interventi). Esportata sia per Node sia per il browser, senza moduli solo-Node.
2. Wizard in `checkup-wizard.js`: 4 passi, barra di avanzamento, risultato **subito, senza email** (scelta presa dopo la ricerca: prima si dà, poi si chiede), poi il modulo facoltativo per il PDF con le due caselle di consenso separate.
3. `api/checkup.js`: valida le 12 risposte, ricalcola, risponde; se ci sono email e consenso privacy, inoltra a n8n (con la stessa coda di recupero dell'audit). Rate limit su Redis.
4. Workflow n8n `checkup-report`: LLM con vincoli (nessuna cifra nuova, tono del brand, italiano) → **controllo automatico dei numeri** (sotto) → PDF di 2-3 pagine → email → HubSpot (`checkup_score`, `checkup_loss_eur`, `checkup_top_issue`, `consenso_marketing`, `consenso_marketing_data`) → Brevo (solo con consenso) → avviso a Luigi se punteggio ≥ 67 o perdita ≥ 2.000 €/mese.
5. Il calcolatore rapido della homepage usa la stessa funzione con le ipotesi fisse dichiarate.

**Controllo dei numeri nel testo dell'LLM:**
- legge i formati italiani: `2.000`, `2.000 €`, `1.500,50`, `30%`, `30 %`, `€ 2.000`, e gli intervalli `1.400–2.600`;
- considera validi i numeri calcolati (punteggio, perdita e intervallo, percentuali, risposte dell'utente) **più un elenco fisso di numeri "strutturali"** (3 interventi, 30 minuti, 1.500 € del pilota, 300 €/mese del canone, 4,33 settimane, anni);
- arrotondamenti accettati: un numero calcolato può comparire arrotondato alle centinaia (perdite) o all'intero (percentuali);
- se trova un numero fuori elenco: un nuovo tentativo con il numero segnalato nel prompt, poi il testo di riserva.

**Test:**
- unit test della formula: casi limite (0 richieste, valore 0, p minimo e massimo, tutte le risposte peggiori, tutte le migliori) e 3 casi scritti a mano con il risultato atteso;
- test del controllo sui numeri: testo con una cifra inventata → scartato; testo con "2.000 €" quando il calcolo dà 1.987 → accettato; testo con "3 interventi" e "30 minuti" → accettato;
- end-to-end su anteprima: risultato a schermo, email ricevuta con PDF, contatto in HubSpot con le proprietà, avviso ricevuto per un caso "alto".

**Fatto quando:** 5 check-up di prova completi senza interventi manuali.

### Fase 7 — Nuova homepage e sequenze (17–20/11, ~4 giorni)

- [ ] Homepage dal design: apertura con calcolatore, striscia degli strumenti, "7×" con fonte HBR, linea temporale "una richiesta, minuto per minuto", blocco video, demo (studio in evidenza), prezzi con pilota da 1.500 € e garanzia (D2, D3), obiezioni, audit/agenzie, contatti con link Calendly e video V2.
- [ ] JSON-LD aggiornato: Person + ProfessionalService con `priceRange`, FAQPage riscritta dalle obiezioni, Offer per il pilota.
- [ ] `/privacy` aggiornata con il check-up.
- [ ] Sequenze email (sezione 7 del piano) in Brevo: check-up (giorni 0, 2, 5, 8, 15) e audit versione agenzia (0, 2, 5, 9, 16), firma "Luigi Scorzelli", disiscrizione in ogni email, CTA verso Calendly.
- [ ] `llms.txt` e `sitemap.xml` aggiornati con le nuove pagine.

**Test:** percorso completo da telefono (iPhone e Android) e desktop; Lighthouse ≥ 90 su prestazioni, accessibilità, SEO; validatore schema.org senza errori.

### Fase 8 — Collaudo e lancio del Rilascio 2 (23–24/11, margine 25–26/11, lancio 27/11)

- [ ] Lista di controllo finale completa (sezione 6).
- [ ] Deploy in produzione, poi controllo dei redirect e di Search Console.
- [ ] Lancio su LinkedIn: 1 post per il check-up + video V1.

### Lavoro parallelo — Immagini e video (dal 20/10; V3 entro il 6/11, il resto entro il 16/11)

Materiale di partenza: righe 2 e 3 del canvas di design. Sono attività di Luigi fuori dalle 4 ore di sviluppo; V3 ha la precedenza perché serve all'E07.

| Elemento | Chi | Come | Destinazione |
| --- | --- | --- | --- |
| Video V3 (4 min) | Luigi | Registrazione schermo dell'audit, dopo la Fase 3 | `/agenzie`, outbound agenzie |
| 3 copertine demo | Claude/Luigi | Esportazione dal canvas → WebP 1600×1000 e 800×500 (`srcset`) | Homepage, pagine dei casi |
| 4 anteprime social | Claude/Luigi | Esportazione → JPG 1200×630 sotto 150 KB | `og:image` di ogni pagina |
| Foto F1–F4 | Luigi | Brief fotografico del canvas (mezza giornata) | Apertura, contatti, agenzie, LinkedIn |
| Video V1 (60 s) | Luigi | Copione del canvas; registrazione del telefono + schermo | Homepage, LinkedIn, outbound |
| Video V2 (40 s) | Luigi | In camera, dopo le foto F1 | Contatti, LinkedIn |
| 3 clip mute delle demo | Luigi | Ricavate dal girato di V1, 8–12 s | Schede demo in homepage |
| Copertine video | Claude/Luigi | Esportazione dal canvas, con il fermo immagine vero in V2 | Facciate video |

Regole tecniche: MP4 H.264 con `poster`, `muted playsinline`, avvio solo quando entra nello schermo; nessun video in apertura sopra i 6 MB; sottotitoli impressi più un file `.vtt` per l'accessibilità.

### Dopo il lancio (dal 30/11)

- Revisione settimanale delle metriche (sezione 5).
- Dopo 30 giorni: test A/B del titolo in apertura (una variabile alla volta).
- 15/12: decisione su servizio "siti pronti per l'AI", e-book e pagine EN.


---

## 4. Proprietà HubSpot da creare

| Proprietà | Tipo | Origine |
| --- | --- | --- |
| `lead_source_tool` | elenco: checkup, audit, contatto, chatbot | entrambi gli strumenti |
| `lead_channel` | elenco: sito, linkedin, outbound | parametri UTM |
| `checkup_score` | numero 0–100 | check-up |
| `checkup_loss_eur` | numero | check-up (valore centrale) |
| `checkup_top_issue` | elenco: risposta_lenta, canali, inserimento_manuale, follow_up, paura_ai | check-up |
| `checkup_sector` | testo | check-up |
| `audit_score` | numero 0–100 | audit |
| `audit_tipo` | elenco: azienda, agenzia | audit |
| `audit_url` | testo | audit |
| `consenso_marketing` | casella singola (sì/no) | entrambi |
| `consenso_marketing_data` | data e ora del consenso | entrambi (prova del consenso ai fini GDPR) |

---

## 5. Misurazione (Umami, eventi personalizzati)

| Evento | Quando | Obiettivo del piano (60 giorni) |
| --- | --- | --- |
| `calc_used` | primo cambio nel calcolatore in homepage | — |
| `checkup_start` / `checkup_step` / `checkup_complete` | wizard | avvio → completamento ≥ 50% |
| `checkup_email` | richiesta del PDF | completamento → email ≥ 60% |
| `audit_submit` / `audit_result` / `audit_email` | audit | avvio → completamento ≥ 70% |
| `cta_call` | clic su "Prenota" | — |
| `call_booked` | prenotazione su Calendly: pagina di conferma con redirect a `/grazie-call` (evento Umami), oppure webhook di Calendly verso n8n → HubSpot (i webhook richiedono un piano Calendly a pagamento) | lead → call ≥ 5% |
| `video_play` | clic sulle facciate video | — |

Più i parametri UTM su ogni link usato in LinkedIn e nell'outbound. Dashboard: una vista Umami condivisa (link di condivisione o Board) + una vista HubSpot "lead da strumenti" con fonte, strumento e punteggio.

---

## 6. Lista di controllo prima del lancio

- [ ] Nessuna occorrenza di `luigidev2018` (grep).
- [ ] Tutte le variabili d'ambiente nuove presenti su Vercel (Production e Preview): `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET`, `PAGESPEED_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `CALENDLY_URL`, oltre a quelle esistenti.
- [ ] `design_handoff_portfolio/` e i file interni non raggiungibili in produzione (`.vercelignore`).
- [ ] Il chatbot in produzione risponde con l'email nuova e il link Calendly (prova che legge `llms.txt` dalla nuova posizione).
- [ ] `/api/_lib/...` risponde 404 (i moduli interni non sono endpoint).
- [ ] Rate limit su Redis: oltre il limite, da due IP diversi o dopo un avvio a freddo, le richieste vengono comunque bloccate.
- [ ] Ogni pulsante "Prenota" apre `https://calendly.com/luigi-scorzelli/30min` con i parametri UTM.
- [ ] Turnstile attivo sui nuovi moduli, hostname corretti.
- [ ] Test anti-SSRF superati in produzione, compreso il test di DNS rebinding.
- [ ] Webhook n8n: firma sbagliata o timestamp scaduto → rifiutato.
- [ ] Email dei report: SPF/DKIM/DMARC ok, test con mail-tester ≥ 9/10.
- [ ] Il PDF si apre su telefono; punteggio e cifre del PDF coincidono con quelli a schermo e in HubSpot (PageSpeed è solo una sezione informativa, D15).
- [ ] Coda di recupero: spegnendo n8n, le richieste vengono salvate su Redis e riprocessate dal cron quando n8n torna su.
- [ ] Privacy rivista dall'esperto; caselle di consenso separate e non preselezionate.
- [ ] Ogni demo indicata come "dimostrativa".
- [ ] Prestazioni: LCP < 2,5 s da mobile in 4G, nessun video sopra i 6 MB, font in locale.
- [ ] Accessibilità: navigazione da tastiera nel wizard, etichette su ogni campo, contrasti AA.
- [ ] Redirect 301 verificati, sitemap inviata a Search Console.
- [ ] Audit del nostro sito ≥ 85.

---

## 7. Rischi e come li gestiamo

| Rischio | Impatto | Mitigazione |
| --- | --- | --- |
| L'audit usato per attaccare reti interne (SSRF) | Alto | `ssrf-guard.js` con controllo DNS e degli IP a ogni redirect, test dedicati, limiti per IP e dominio |
| DNS rebinding (il dominio cambia IP tra controllo e richiesta) | Alto | IP controllato bloccato sulla connessione (`lookup` personalizzata), test con risolutore finto |
| Rate limit aggirabile (memoria per istanza) | Medio | Rate limit di audit e check-up su Redis (D13); quello in memoria resta solo come riserva |
| Chatbot senza conoscenza dopo la migrazione | Medio | `chat.js` legge `public/llms.txt` con `includeFiles` (riserva: copia in `api/_data/`); verificato nella prova tecnica e nella lista di controllo |
| Moduli interni pubblicati come endpoint | Basso | Cartella `api/_lib/` (il prefisso `_` li esclude); verificato con un 404 |
| Webhook verso n8n riutilizzato (replay) | Medio | Firma HMAC su timestamp + corpo, finestra di 5 minuti |
| L'LLM inserisce numeri inventati nel report | Alto per la credibilità | Numeri calcolati solo dal codice; controllo automatico dei numeri nel testo; testo di riserva |
| n8n giù o lento | Medio | Il risultato a schermo non dipende da n8n; coda di recupero con nuovi tentativi e avviso |
| Timeout delle funzioni Vercel durante l'audit | Medio | Solo 4 richieste brevi e in parallelo, tempo massimo complessivo 15 s, `maxDuration` 30 s; PageSpeed, LLM e PDF in n8n |
| Astro non compatibile con le `/api` esistenti | Medio | Prova tecnica all'inizio della Fase 2; ritorno all'HTML puro se fallisce |
| Email dei report nello spam | Medio | Dominio verificato, nessun allegato pesante (PDF < 1 MB), testo semplice + link |
| GDPR (dati a provider LLM, Calendly, Brevo, Upstash) | Medio | Informativa aggiornata, minimo indispensabile all'LLM, revisione dell'esperto, Apollo rinviato |
| Perdita di posizionamento cambiando URL | Basso | URL dei case study invariati nel Rilascio 1; eventuale passaggio a `/casi/...` con redirect 301 nella Fase 7 |
| Garanzia o prezzi non sostenibili | Medio | D2 e D3 chiuse prima di pubblicare la homepage |
| Ritardi accumulati senza margine | Medio | Due rilasci con margine (6/11 e 25–26/11); se il Rilascio 1 slitta oltre il 6/11, il check-up passa dopo il 9/11 senza toccare l'E07 |
| Troppe cose in parallelo (diagnosi del piano) | Alto | Una fase di sviluppo alla volta, nessuna sovrapposizione; l'outbound verso l'ICP A parte con il Rilascio 1, il resto aspetta |

---

## 8. Stima complessiva

| Fase | Giorni di lavoro (circa 4 ore) |
| --- | --- |
| 0 Decisioni e account | 1 |
| 1 Correzioni rapide | 1,5 |
| 2 Fondamenta | 3 |
| 3 Audit (compresi Redis, anti-rebinding, coda di recupero) | 5 |
| 4 `/agenzie` e `/privacy` | 2 |
| 5 Collaudo e lancio Rilascio 1 | 2 |
| 6 Check-up | 5 |
| 7 Homepage e sequenze | 4 |
| 8 Collaudo e lancio Rilascio 2 | 2 |
| Immagini e video | 3 di Luigi (foto, riprese) + 1 di montaggio, in parallelo |
| Margine | 3 (6/11, 25–26/11) |
| **Totale sviluppo** | **25,5 giorni + 3 di margine** |

**Date chiave:**
- **5/11 — Rilascio 1:** audit, `/agenzie`, `/privacy`, correzioni del sito attuale. Parte l'E07. Rispetta il lancio del 9/11 della roadmap del piano per la parte che serve all'outbound.
- **27/11 — Rilascio 2:** check-up, nuova homepage, sequenze, video.

Rispetto alla versione precedente (lancio unico il 20/11) la consegna completa slitta di una settimana: dipende dall'aggiunta dei margini, dalla rimozione delle sovrapposizioni tra fasi e dal lavoro in più sull'audit (Redis, DNS rebinding, coda di recupero). In cambio, lo strumento per l'outbound è online 15 giorni prima.
