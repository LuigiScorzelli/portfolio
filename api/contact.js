import { Resend } from "resend";

// ── Env vars (set in Vercel → Project → Settings → Environment Variables) ──
// RESEND_API_KEY        — API key from https://resend.com/api-keys
// CONTACT_TO_EMAIL      — where you receive the notification (e.g. luigi.scorzelli87@gmail.com)
// CONTACT_FROM_EMAIL    — verified sender. Placeholder: onboarding@resend.dev (test only)
// HUBSPOT_TOKEN         — Private App token, scope: crm.objects.contacts.write
const {
  RESEND_API_KEY,
  CONTACT_TO_EMAIL = "luigi.scorzelli87@gmail.com",
  CONTACT_FROM_EMAIL = "onboarding@resend.dev",
  HUBSPOT_TOKEN,
} = process.env;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Origin allowlist ──────────────────────────────────────────────
// Only accept submissions coming from our own site (and Vercel previews / local dev).
const ALLOWED_ORIGIN_HOSTS = new Set([
  "luigiscorzelli.com",
  "www.luigiscorzelli.com",
  "localhost",
  "127.0.0.1",
]);
const isAllowedOrigin = (req) => {
  const source = req.headers.origin || req.headers.referer;
  // No Origin/Referer (e.g. curl) → reject; browsers always send at least one.
  if (!source) return false;
  let host;
  try {
    host = new URL(source).hostname;
  } catch {
    return false;
  }
  return ALLOWED_ORIGIN_HOSTS.has(host) || host.endsWith(".vercel.app");
};

// ── In-memory rate limiting ───────────────────────────────────────
// Per-IP sliding window. Best-effort only: state is per-instance and resets
// on cold start — good enough for a portfolio form, not a shared store.
const RATE_LIMIT_MAX = 5; // requests
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // per 10 minutes
const rateBuckets = new Map(); // ip -> number[] (timestamps)
const getClientIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket?.remoteAddress ||
  "unknown";
const isRateLimited = (ip) => {
  const now = Date.now();
  const hits = (rateBuckets.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  // Opportunistic cleanup so the map doesn't grow unbounded.
  if (rateBuckets.size > 5000) rateBuckets.clear();
  if (hits.length >= RATE_LIMIT_MAX) {
    rateBuckets.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateBuckets.set(ip, hits);
  return false;
};

// Strip CR/LF and other control chars — prevents email header injection when a
// user-supplied value (e.g. the name) is placed into a header like the subject.
const stripControlChars = (s = "") =>
  String(s).replace(/[\x00-\x1f\x7f]/g, " ").trim();
const countUrls = (s = "") => (String(s).match(/https?:\/\/|www\./gi) || []).length;

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

  // Only accept submissions from our own site.
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ success: false, message: "Forbidden" });
  }

  // Throttle abuse per client IP.
  if (isRateLimited(getClientIp(req))) {
    res.setHeader("Retry-After", "600");
    return res
      .status(429)
      .json({ success: false, message: "Too many requests, please try again later" });
  }

  // Never let a malformed body crash the handler.
  let body;
  try {
    body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  } catch {
    return res.status(400).json({ success: false, message: "Invalid JSON" });
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  const { name = "", email = "", message = "", botcheck } = body;

  // Honeypot: real users leave it empty
  if (botcheck) return res.status(200).json({ success: true });

  // Coerce to strings, strip control chars (blocks header injection), trim.
  const cleanName = stripControlChars(typeof name === "string" ? name : "");
  const cleanEmail = stripControlChars(typeof email === "string" ? email : "");
  const cleanMessage = (typeof message === "string" ? message : "").trim();

  // ── Per-field validation ──
  if (cleanName.length < 2 || cleanName.length > 100) {
    return res
      .status(400)
      .json({ success: false, message: "Il nome deve avere tra 2 e 100 caratteri" });
  }
  if (
    cleanEmail.length > 254 ||
    /\s/.test(cleanEmail) ||
    !EMAIL_RE.test(cleanEmail)
  ) {
    return res.status(400).json({ success: false, message: "Email non valida" });
  }
  if (cleanMessage.length < 10 || cleanMessage.length > 5000) {
    return res.status(400).json({
      success: false,
      message: "Il messaggio deve avere tra 10 e 5000 caratteri",
    });
  }
  // Spam heuristic: block link-flood messages.
  if (countUrls(cleanMessage) > 4) {
    return res
      .status(400)
      .json({ success: false, message: "Messaggio bloccato come spam" });
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

    // 2. Notify you — this is the critical email; if it fails, the request failed
    const notify = await resend.emails.send({
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

    if (notify.error) {
      console.error("Resend notify error:", notify.error);
      return res.status(502).json({ success: false, message: "Email delivery failed" });
    }

    // 3. Confirmation to the lead — best-effort: don't fail the request if this bounces
    const confirm = await resend.emails.send({
      from: `Luigi Scorzelli <${CONTACT_FROM_EMAIL}>`,
      to: cleanEmail,
      subject: "Ho ricevuto la tua richiesta",
      html: `
        <p>Ciao ${escapeHtml(cleanName.split(/\s+/)[0])},</p>
        <p>grazie per avermi scritto. Ho ricevuto la tua richiesta e ti rispondo a breve, di solito entro 1 giorno lavorativo.</p>
        <p>A presto,<br>Luigi Scorzelli</p>
      `,
    });

    if (confirm.error) {
      console.error("Resend confirmation error:", confirm.error);
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({ success: false, message: "Send failed" });
  }
}
