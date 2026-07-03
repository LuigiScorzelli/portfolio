import { Resend } from "resend";

// ── Env vars (set in Vercel → Project → Settings → Environment Variables) ──
// RESEND_API_KEY        — API key from https://resend.com/api-keys
// CONTACT_TO_EMAIL      — where you receive the notification (e.g. luigidev2018@gmail.com)
// CONTACT_FROM_EMAIL    — verified sender. Placeholder: onboarding@resend.dev (test only)
// HUBSPOT_TOKEN         — Private App token, scope: crm.objects.contacts.write
const {
  RESEND_API_KEY,
  CONTACT_TO_EMAIL = "luigidev2018@gmail.com",
  CONTACT_FROM_EMAIL = "onboarding@resend.dev",
  HUBSPOT_TOKEN,
} = process.env;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);

async function createHubspotContact({ name, email, message }) {
  if (!HUBSPOT_TOKEN) return { skipped: true };

  const [firstname, ...rest] = name.trim().split(/\s+/);
  const res = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUBSPOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        properties: {
          email,
          firstname,
          lastname: rest.join(" "),
          message,
          hs_lead_status: "NEW",
          lifecyclestage: "lead",
        },
      }),
    }
  );

  // 409 = contact already exists → not a failure for our flow
  if (res.status === 409) return { existed: true };
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`HubSpot ${res.status}: ${detail}`);
  }
  return await res.json();
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { name = "", email = "", message = "", botcheck } = body;

  // Honeypot: real users leave it empty
  if (botcheck) return res.status(200).json({ success: true });

  const cleanName = name.trim();
  const cleanEmail = email.trim();
  const cleanMessage = message.trim();

  if (!cleanName || !cleanMessage || !EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }
  if (cleanMessage.length > 5000 || cleanName.length > 200) {
    return res.status(400).json({ success: false, message: "Input too long" });
  }

  if (!resend) {
    return res.status(500).json({ success: false, message: "Email service not configured" });
  }

  try {
    // 1. HubSpot contact — don't block the response if the CRM hiccups
    const hubspot = await createHubspotContact({
      name: cleanName,
      email: cleanEmail,
      message: cleanMessage,
    }).catch((err) => {
      console.error("HubSpot error:", err.message);
      return { error: true };
    });

    const safeMessage = escapeHtml(cleanMessage).replace(/\n/g, "<br>");

    // 2. Notify you
    await resend.emails.send({
      from: `Portfolio <${CONTACT_FROM_EMAIL}>`,
      to: CONTACT_TO_EMAIL,
      replyTo: cleanEmail,
      subject: `Nuovo contatto dal portfolio — ${cleanName}`,
      html: `
        <h2>Nuova richiesta dal sito</h2>
        <p><strong>Nome:</strong> ${escapeHtml(cleanName)}</p>
        <p><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p>
        <p><strong>Messaggio:</strong><br>${safeMessage}</p>
        <hr>
        <p style="color:#888;font-size:12px">HubSpot: ${
          hubspot?.error ? "errore (vedi log)" : hubspot?.skipped ? "non configurato" : "contatto salvato"
        }</p>
      `,
    });

    // 3. Confirmation to the lead
    await resend.emails.send({
      from: `Luigi Scorzelli <${CONTACT_FROM_EMAIL}>`,
      to: cleanEmail,
      subject: "Ho ricevuto la tua richiesta",
      html: `
        <p>Ciao ${escapeHtml(cleanName.split(/\s+/)[0])},</p>
        <p>grazie per avermi scritto. Ho ricevuto la tua richiesta e ti rispondo a breve, di solito entro 1 giorno lavorativo.</p>
        <p>A presto,<br>Luigi Scorzelli</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({ success: false, message: "Send failed" });
  }
}
