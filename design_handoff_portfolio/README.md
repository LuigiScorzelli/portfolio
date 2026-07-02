# Handoff: Portfolio Luigi Scorzelli — redesign tecnico/ingegneristico

## Overview
Landing page one-page per il portfolio freelance di **Luigi Scorzelli** (Full-Stack Developer & AI Engineer), pensata per acquisire clienti su Upwork/Fiverr. Il redesign mantiene struttura e copy della versione precedente ma applica un nuovo linguaggio visivo: preciso, strutturato, "da datasheet" — etichette monospace, tipografia display grotesque, hairline grid, un solo colore-segnale.

## About the Design Files
I file in questo pacchetto sono **riferimenti di design realizzati in HTML** — un prototipo che mostra aspetto e comportamento desiderati, **non codice di produzione da copiare direttamente**.

- `Portfolio.dc.html` è il design definitivo. Tecnicamente è un "Design Component" che usa stili **inline** e un runtime proprietario (`support.js`, non incluso): **aprilo come riferimento visivo**, non come sorgente da importare. Tutta l'informazione di stile è leggibile negli attributi `style="..."`.
- `_old_version/` contiene la versione precedente (`index.html` + `styles.css` + `script.js`) come HTML/CSS classico: utile come **scheletro di markup e logica** già pronto, da ri-stilizzare secondo i token qui sotto.
- Il compito è **ricreare questo design nell'ambiente del progetto reale** (React/Next, Vue, Astro, ecc.) seguendo i pattern e le librerie già in uso; se non esiste ancora un progetto, scegliere il framework più adatto (per una landing statica vanno benissimo Astro o un semplice Vite + HTML/CSS) e implementarlo lì.

## Fidelity
**High-fidelity.** Colori, tipografia, spaziature e stati sono finali: ricostruzione pixel-accurata usando le librerie/pattern del codebase.

---

## Design Tokens

### Colori
| Token | Hex | Uso |
|---|---|---|
| ink | `#0B0F14` | Titoli, sezioni scure (background), footer |
| ink-soft | `#0E141A` | Celle interne sezioni scure (metodo) |
| text | `#141A1E` | Testo corpo principale su chiaro |
| text-2 | `#1B2226` | Voci liste |
| body-muted | `#4C555C` | Paragrafi descrittivi |
| muted | `#5B636B` | Testo secondario, caption |
| muted-soft | `#9AA0A6` | Indici card `[ 01 ]` |
| paper | `#ECEEEA` | Background pagina (cool off-white) |
| paper-band | `#E5E8E2` | Bande sezione (case study, contatti) |
| white | `#FFFFFF` | Card, sezioni chiare (affidabilità, stack) |
| line | `#D5D8D2` | Hairline principale |
| line-soft | `#E2E4DE` | Divisori interni liste/griglie |
| border-btn | `#B7BBB2` | Bordo bottoni secondari |
| **accent** (default) | `#0B7A5E` | Colore-segnale: bottoni primari, marker, bordi proof, badge |
| accent-bright | `#34D7A8` | Variante accento su sfondi scuri |

Accenti alternativi previsti (tweakable): `#1F6AD6`→bright `#6AA6FF` · `#5B4BD6`→`#A593FF` · `#C2570C`→`#F6A45C`. **Regola:** sui fondi scuri usare sempre la variante *bright*.

Selezione testo: `::selection` background `#0B7A5E`, color `#fff`.

### Tipografia (Google Fonts)
- **Space Grotesk** (600) — display: `h1`, `h2`, `h3` titoli, valori statistiche, titoli card. `letter-spacing` da `-0.015em` a `-0.022em`, `line-height` 1.0–1.18.
- **IBM Plex Mono** (500/600) — etichette, kicker, indici, badge, nav, bottoni, caption, footer, label datasheet. `letter-spacing` 0.06–0.12em, spesso `text-transform:uppercase`.
- **IBM Plex Sans** (400/500/600/700) — corpo del testo (`body`), paragrafi.

Import:
```
https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap
```

Scala titoli (responsive, niente media query — solo `clamp`):
- `h1` hero: `clamp(2.5rem, 1.4rem + 4.2vw, 4.4rem)`, line-height 1.0
- `h2` sezione: `clamp(1.9rem, 1.1rem + 2.4vw, 3.1rem)`, line-height 1.06
- `h2` minore (chi sono/stack): `clamp(1.8rem, 1.1rem + 2vw, 2.8rem)`
- kicker mono: 12px / 0.12em / uppercase
- body: 16px base, paragrafi descrittivi 0.95–1.1rem, line-height ~1.62

### Spaziatura & forma
- Container: `width: min(1180px, calc(100% - 48px)); margin: 0 auto`
- Padding sezione standard: `104px 0` (contatti `96px`, posizionamento `64px`)
- `scroll-margin-top: 80px` sulle sezioni con `id` (per l'header fixed)
- Radius: card/pannelli `6px`, bottoni/marker `4px`, immagine hero `8px`, pill/badge `999px`
- Gap griglie: card 18px, gruppi 14–16px; **griglie hairline** ottenute con `gap:1px` + `background` colore linea + celle con `background` pieno
- Ombre: card featured `0 30px 60px -34px rgba(11,15,20,0.28)`; immagine hero `0 40px 70px -34px rgba(11,15,20,0.5)`; dropdown menu `0 24px 50px rgba(11,15,20,0.16)`

---

## Screens / Views
Pagina unica, sezioni dall'alto:

1. **Header (fixed)** — altezza 62px, `background: rgba(236,238,234,0.86)` + `backdrop-filter: blur(14px)`, `border-bottom: 1px solid #D5D8D2`. A sinistra brand: quadrato bordato `LS` (mono) + nome "Luigi Scorzelli" (Space Grotesk 600). A destra: nav (6 link mono), badge "Disponibile" (pill con dot lampeggiante), CTA "Parliamo →". Su mobile (<900px) nav e CTA collassano in un menu hamburger a tendina.

2. **Hero** — padding `138px 0 96px`, griglia 2 colonne (`auto-fit, minmax(392px, 1fr)`). Sinistra: kicker mono con marker quadrato accento, `h1`, paragrafo, due bottoni (primario accento + secondario bordato), riga di 3 statistiche in griglia hairline. Destra: immagine hero incorniciata come "finestra" (chrome bar scura con 3 dot + filename mono + indicatore `● live` accentBright) + caption mono. Sfondo: **griglia blueprint** opzionale (`linear-gradient` 58px, opacity 0.045).

3. **Posizionamento** — sezione scura (`#0B0F14`), 2 colonne: kicker mono (sinistra) / titolo + paragrafo (destra). Testo su scuro `rgba(255,255,255,0.7)`.

4. **Servizi** (`#servizi`) — 3 card bianche (`auto-fit, minmax(270px,1fr)`), bordo hairline, **barra accento 4px in alto**, indice mono `[ 01 ]`, titolo, paragrafo, lista con divisori `border-top`.

5. **Affidabilità** (`#affidabilita`) — sezione bianca. Heading split + griglia hairline 4 celle (`auto-fit, minmax(220px,1fr)`): numero mono accento, titolo, testo. min-height 230px.

6. **Chi sono** (`#chi-sono`) — 2 colonne: copy a sinistra, **pannello datasheet** a destra (griglia hairline, ogni riga: label mono accento + valore Space Grotesk + descrizione).

7. **Case study** (`#progetti`) — banda `#E5E8E2`. Heading split + 3 card. La prima è *featured*: bordo accento + ombra. Ogni card: chip mono di stato (la featured ha pill con dot accento), titolo, descrizione, blocco "proof" con `border-left: 3px solid accent` (le altre `#C2C5BD`).

8. **Stack** (`#stack`) — sezione bianca, 2 colonne: heading **sticky** (`position:sticky; top:96px`) + 4 pannelli bordati con titolo mono accento e paragrafo tech.

9. **Metodo** — sezione scura, heading split + griglia hairline 4 step su fondo scuro: numero mono grande (1.6rem) accentBright, titolo, testo.

10. **Contatti** (`#contatti`) — banda `#E5E8E2`, `border-top` hairline. 2 colonne: copy + due bottoni (mailto primario, GitHub secondario).

11. **Footer** — `#0B0F14`, due righe mono: copyright (anno dinamico) e località.

---

## Interactions & Behavior
- **Header**: posizione fixed, sempre con blur + hairline. (La versione precedente aggiungeva un'ombra allo scroll oltre 24px — opzionale da reintrodurre.)
- **Menu mobile**: sotto i 900px compare l'hamburger; toggle apre/chiude la tendina; il click su un link la richiude; `aria-expanded` sincronizzato. Responsività gestita via JS (listener `resize`) perché gli stili sono inline; nel codebase reale **preferire le media query CSS native**.
- **Hover bottoni**: `transform: translateY(-2px)` + (primario) `filter: brightness(1.07)` / (secondario) `border-color: #0B0F14`. Transizione `150ms ease`.
- **Hover link nav**: colore → accento.
- **Focus**: outline visibile `2px solid` (accento sui link nav, `#0B0F14` sui bottoni), `outline-offset` 2–3px. **Mantenere stati focus accessibili.**
- **Badge disponibilità**: dot con `@keyframes blink` (1.6s, opacity 1→0.2).
- **Smooth scroll** ancore (`html { scroll-behavior: smooth }`).
- **`prefers-reduced-motion`**: disattiva animazioni e smooth-scroll.
- **Anno footer**: `new Date().getFullYear()`.

## State Management
Minimo: `menuOpen` (bool) e `isMobile` (bool, da `window.innerWidth < 900`). Nient'altro è stateful. Nel codebase reale la responsività va in CSS, riducendo lo stato al solo `menuOpen`.

## Tweaks / Props (opzionali da esporre)
- `accent` (colore-segnale, default `#0B7A5E`) — ricolora bottoni, marker, bordi proof, badge. Ogni accento ha la sua variante *bright* per i fondi scuri.
- `gridLines` (bool, default true) — mostra/nasconde la griglia blueprint nell'hero.
- `availabilityBadge` (bool, default true) — mostra/nasconde il badge "Disponibile" nell'header.

## Accessibilità
Landmark semantici (`header`/`main`/`footer`/`nav`), `aria-label` su nav e immagine, `aria-expanded` sull'hamburger, target ≥44px, contrasti elevati (testo `#141A1E`/`#0B0F14` su chiaro; accento `#0B7A5E` ~AA su `#ECEEEA`), focus visibile, reduced-motion. Mantenere tutto questo nella reimplementazione.

## Assets
- `assets/ai-automation-hero.png` — render della postazione di lavoro (workflow AI). Alt italiano già scritto nel markup. Sostituibile con uno screenshot reale di un workflow n8n quando disponibile.

## Files
- `Portfolio.dc.html` — design definitivo (riferimento visivo; stili inline leggibili).
- `_old_version/index.html`, `styles.css`, `script.js` — markup/logica HTML classici riutilizzabili come scheletro.
- `assets/ai-automation-hero.png` — immagine hero.
