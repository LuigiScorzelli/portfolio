// Shared contact pipeline — used by both the classic form (api/contact.js)
// and the chatbot tool (api/chat.js). Keeping this in one place means the
// hardened validation, HubSpot write and Resend emails behave identically
// no matter how a lead comes in.
import { Resend } from "resend";

// ── Env vars (set in Vercel → Project → Settings → Environment Variables) ──
// RESEND_API_KEY        — API key from https://resend.com/api-keys
// CONTACT_TO_EMAIL      — where you receive the notification
// CONTACT_FROM_EMAIL    — verified sender. Placeholder: onboarding@resend.dev (test only)
// HUBSPOT_TOKEN         — Private App token, scope: crm.objects.contacts.write
// TURNSTILE_SECRET_KEY  — Cloudflare Turnstile secret (anti-bot). If unset, check is skipped.
const {
  RESEND_API_KEY,
  CONTACT_TO_EMAIL = "luigi.scorzelli87@gmail.com",
  CONTACT_FROM_EMAIL = "onboarding@resend.dev",
  HUBSPOT_TOKEN,
  TURNSTILE_SECRET_KEY,
} = process.env;

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Origin allowlist ──────────────────────────────────────────────
// Only accept submissions coming from our own site (and Vercel previews / local dev).
const ALLOWED_ORIGIN_HOSTS = new Set([
  "luigiscorzelli.com",
  "www.luigiscorzelli.com",
  "localhost",
  "127.0.0.1",
]);
export const isAllowedOrigin = (req) => {
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
// on cold start — good enough for a portfolio, not a shared store.
// Factory so each endpoint gets its own window/limit and its own bucket map.
export const getClientIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
  req.socket?.remoteAddress ||
  "unknown";

export function createRateLimiter({ max, windowMs }) {
  const buckets = new Map(); // ip -> number[] (timestamps)
  return function isRateLimited(ip) {
    const now = Date.now();
    const hits = (buckets.get(ip) || []).filter((t) => now - t < windowMs);
    // Opportunistic cleanup so the map doesn't grow unbounded.
    if (buckets.size > 5000) buckets.clear();
    if (hits.length >= max) {
      buckets.set(ip, hits);
      return true;
    }
    hits.push(now);
    buckets.set(ip, hits);
    return false;
  };
}

// ── Cloudflare Turnstile ──────────────────────────────────────────
// Verifies the token the widget injects into the form (`cf-turnstile-response`).
// Returns true when valid, or when no secret is configured (feature off).
// TURNSTILE_HOSTNAMES (comma-separated) overrides the production hostnames,
// e.g. "localhost" for local testing — never add localhost in production.
const TURNSTILE_HOSTS = new Set(
  (process.env.TURNSTILE_HOSTNAMES || "luigiscorzelli.com,www.luigiscorzelli.com")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean)
);

export async function verifyTurnstile(token, ip, expectedAction) {
  if (!TURNSTILE_SECRET_KEY) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: ip && ip !== "unknown" ? ip : undefined,
        }),
      }
    );
    const data = await res.json();
    if (data.success !== true) {
      console.warn("Turnstile rejected:", data["error-codes"]);
      return false;
    }
    // A valid token minted for another form (action) or another site
    // (hostname) must not unlock this endpoint.
    if (expectedAction && data.action !== expectedAction) {
      console.warn("Turnstile action mismatch:", data.action);
      return false;
    }
    if (!TURNSTILE_HOSTS.has(data.hostname)) {
      console.warn("Turnstile hostname mismatch:", data.hostname);
      return false;
    }
    return true;
  } catch (err) {
    // Fail closed: if Cloudflare is unreachable we'd rather lose a submit
    // (the user sees the "email me directly" fallback) than let bots through.
    console.error("Turnstile verify error:", err.message);
    return false;
  }
}

// Strip CR/LF and other control chars — prevents email header injection when a
// user-supplied value (e.g. the name) is placed into a header like the subject.
export const stripControlChars = (s = "") =>
  String(s).replace(/[\x00-\x1f\x7f]/g, " ").trim();
const countUrls = (s = "") =>
  (String(s).match(/https?:\/\/|www\./gi) || []).length;

export const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[c]);

// ── Field validation ──────────────────────────────────────────────
// Returns { ok: true, name, email, message } on success,
// or { ok: false, message } with a user-facing error on failure.
export function validateContact({ name, email, message }) {
  const cleanName = stripControlChars(typeof name === "string" ? name : "");
  const cleanEmail = stripControlChars(typeof email === "string" ? email : "");
  const cleanMessage = (typeof message === "string" ? message : "").trim();

  if (cleanName.length < 2 || cleanName.length > 100) {
    return { ok: false, message: "Il nome deve avere tra 2 e 100 caratteri" };
  }
  // A real name never contains a link — bots use it to smuggle spam URLs.
  if (countUrls(cleanName) > 0 || /\.[a-z]{2,}\//i.test(cleanName)) {
    return { ok: false, message: "Nome non valido" };
  }
  if (cleanEmail.length > 254 || /\s/.test(cleanEmail) || !EMAIL_RE.test(cleanEmail)) {
    return { ok: false, message: "Email non valida" };
  }
  if (cleanMessage.length < 10 || cleanMessage.length > 5000) {
    return {
      ok: false,
      message: "Il messaggio deve avere tra 10 e 5000 caratteri",
    };
  }
  // Spam heuristic: block link-flood messages.
  if (countUrls(cleanMessage) > 4) {
    return { ok: false, message: "Messaggio bloccato come spam" };
  }
  return { ok: true, name: cleanName, email: cleanEmail, message: cleanMessage };
}

async function createHubspotContact({ name, email, message }) {
  if (!HUBSPOT_TOKEN) return { skipped: true };

  const [firstname, ...rest] = name.trim().split(/\s+/);
  const res = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
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
  });

  // 409 = contact already exists → not a failure for our flow
  if (res.status === 409) return { existed: true };
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`HubSpot ${res.status}: ${detail}`);
  }
  return await res.json();
}

// ── Full pipeline for a validated lead ────────────────────────────
// `source` labels where the lead came from (e.g. "form", "chatbot") so you
// can tell them apart in the notification email.
// Returns { ok: true } or { ok: false, message } (never throws for expected paths).
export async function submitContact({ name, email, message, source = "form" }) {
  if (!resend) {
    return { ok: false, message: "Email service not configured" };
  }

  // 1. HubSpot contact — don't block on CRM hiccups
  const hubspot = await createHubspotContact({ name, email, message }).catch(
    (err) => {
      console.error("HubSpot error:", err.message);
      return { error: true };
    }
  );

  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  // 2. Notify Luigi — the critical email; if it fails, the request failed
  const notify = await resend.emails.send({
    from: `Portfolio <${CONTACT_FROM_EMAIL}>`,
    to: CONTACT_TO_EMAIL,
    replyTo: email,
    subject: `Nuovo contatto dal portfolio (${source}) — ${name}`,
    html: `
      <h2>Nuova richiesta dal sito</h2>
      <p><strong>Origine:</strong> ${escapeHtml(source)}</p>
      <p><strong>Nome:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Messaggio:</strong><br>${safeMessage}</p>
      <hr>
      <p style="color:#888;font-size:12px">HubSpot: ${
        hubspot?.error
          ? "errore (vedi log)"
          : hubspot?.skipped
          ? "non configurato"
          : "contatto salvato"
      }</p>
    `,
  });

  if (notify.error) {
    console.error("Resend notify error:", notify.error);
    return { ok: false, message: "Email delivery failed" };
  }

  // 3. Confirmation to the lead — best-effort: don't fail if this bounces.
  // Anti-relay: the email address is unverified, so a bot can point it at any
  // victim. The confirmation therefore carries NO user-supplied content, and
  // is skipped entirely when the message contains links (typical spam).
  if (countUrls(message) === 0) {
    const confirm = await resend.emails.send({
      from: `Luigi Scorzelli <${CONTACT_FROM_EMAIL}>`,
      to: email,
      subject: "Ho ricevuto la tua richiesta",
      html: `
        <p>Ciao,</p>
        <p>grazie per avermi scritto. Ho ricevuto la tua richiesta e ti rispondo a breve, di solito entro 1 giorno lavorativo.</p>
        <p>A presto,<br>Luigi Scorzelli</p>
      `,
    });

    if (confirm.error) {
      console.error("Resend confirmation error:", confirm.error);
    }
  }

  return { ok: true };
}
