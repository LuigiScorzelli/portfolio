# Form contatti — setup Resend + HubSpot su Vercel

Il form della sezione contatti invia i dati a una serverless function
(`api/contact.js`) che:

1. crea un contatto in **HubSpot** (CRM);
2. invia una **notifica email a te** via Resend;
3. invia una **email di conferma al lead** via Resend.

Le API key restano server-side, mai esposte nel frontend.

## 1. Variabili d'ambiente (Vercel → Project → Settings → Environment Variables)

| Variabile            | Obbligatoria | Descrizione                                                                 |
| -------------------- | ------------ | -------------------------------------------------------------------------- |
| `RESEND_API_KEY`     | Sì           | API key da https://resend.com/api-keys                                     |
| `CONTACT_TO_EMAIL`   | No           | Dove ricevi la notifica. Default: `luigidev2018@gmail.com`                 |
| `CONTACT_FROM_EMAIL` | No           | Mittente verificato. Default test: `onboarding@resend.dev`                 |
| `HUBSPOT_TOKEN`      | No¹          | Token della Private App HubSpot (scope `crm.objects.contacts.write`)       |

¹ Se `HUBSPOT_TOKEN` non è impostata, il form funziona comunque: salta HubSpot
e invia solo le email. Utile per partire subito.

## 2. Resend

1. Crea account su https://resend.com e genera una API key → `RESEND_API_KEY`.
2. **Dominio (importante):** con `onboarding@resend.dev` puoi inviare **solo
   verso la tua stessa email**. Per inviare la conferma ai lead devi verificare
   un tuo dominio (Resend → Domains → Add), poi imposta
   `CONTACT_FROM_EMAIL=noreply@tuodominio.com`.

## 3. HubSpot (Private App)

1. HubSpot → Settings → Integrations → **Private Apps** → Create.
2. Scope: `crm.objects.contacts.write` (e `...read` se vuoi evitare duplicati).
3. Copia l'access token → `HUBSPOT_TOKEN`.
4. La property `message` deve esistere sul contatto: HubSpot ne ha una di
   default; se hai rimosso quella, creane una custom con nome interno `message`.

## 4. Deploy

```bash
npm install          # installa resend in locale (facoltativo, per test)
vercel                # primo deploy (o collega la repo a Vercel dal dashboard)
```

Vercel rileva automaticamente `api/contact.js` come function Node e serve i
file statici (index.html ecc.). Non serve alcun `vercel.json`.

## 5. Test locale

```bash
npm install -g vercel
vercel dev            # serve il sito + la function su http://localhost:3000
```

Compila il form: dovresti ricevere la notifica e (se il dominio è verificato)
la conferma. In caso di errore, controlla i log della function su Vercel.
