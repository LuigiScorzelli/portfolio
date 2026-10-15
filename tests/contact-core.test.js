// Unit tests for the shared contact pipeline (api/_contact-core.js).
// Run with `npm test` (node:test, no extra dependencies). No env vars are set,
// so nothing here calls HubSpot, Resend or Turnstile.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateContact,
  isAllowedOrigin,
  createRateLimiter,
  stripControlChars,
  escapeHtml,
  verifyTurnstile,
} from "../api/_contact-core.js";

const valid = { name: "Mario Rossi", email: "mario@example.com", message: "Vorrei automatizzare i preventivi." };

test("validateContact accepts a normal request and trims it", () => {
  const r = validateContact({ ...valid, name: "  Mario Rossi \n", message: `  ${valid.message}  ` });
  assert.equal(r.ok, true);
  assert.equal(r.name, "Mario Rossi");
  assert.equal(r.message, valid.message);
});

test("validateContact rejects bad names", () => {
  assert.equal(validateContact({ ...valid, name: "M" }).ok, false);
  assert.equal(validateContact({ ...valid, name: "x".repeat(101) }).ok, false);
  assert.equal(validateContact({ ...valid, name: "Buy https://spam.example" }).ok, false);
  assert.equal(validateContact({ ...valid, name: "spam.com/offer" }).ok, false);
  assert.equal(validateContact({ ...valid, name: 42 }).ok, false);
});

test("validateContact rejects bad emails", () => {
  for (const email of ["", "mario", "mario@", "mario@example", "ma rio@example.com", `${"a".repeat(250)}@x.it`]) {
    assert.equal(validateContact({ ...valid, email }).ok, false, email);
  }
});

test("validateContact enforces message length and link flood", () => {
  assert.equal(validateContact({ ...valid, message: "corto" }).ok, false);
  assert.equal(validateContact({ ...valid, message: "x".repeat(5001) }).ok, false);
  const links = Array.from({ length: 5 }, (_, i) => `https://s${i}.example`).join(" ");
  assert.equal(validateContact({ ...valid, message: `Guarda ${links}` }).ok, false);
});

test("stripControlChars blocks header injection", () => {
  assert.equal(stripControlChars("Mario\r\nBcc: x@y.z"), "Mario  Bcc: x@y.z");
});

test("escapeHtml escapes markup", () => {
  assert.equal(escapeHtml(`<b class="x">'&'</b>`), "&lt;b class=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/b&gt;");
});

test("isAllowedOrigin allows the site, previews and localhost only", () => {
  const req = (origin) => ({ headers: origin ? { origin } : {} });
  assert.equal(isAllowedOrigin(req("https://luigiscorzelli.com")), true);
  assert.equal(isAllowedOrigin(req("https://www.luigiscorzelli.com")), true);
  assert.equal(isAllowedOrigin(req("https://portfolio-abc123.vercel.app")), true);
  assert.equal(isAllowedOrigin(req("http://localhost:4321")), true);
  assert.equal(isAllowedOrigin(req("https://evil.example")), false);
  assert.equal(isAllowedOrigin(req("https://luigiscorzelli.com.evil.example")), false);
  assert.equal(isAllowedOrigin(req(null)), false);
  assert.equal(isAllowedOrigin({ headers: { referer: "https://luigiscorzelli.com/en.html" } }), true);
});

test("createRateLimiter blocks after max hits per IP", () => {
  const limited = createRateLimiter({ max: 2, windowMs: 60_000 });
  assert.equal(limited("1.1.1.1"), false);
  assert.equal(limited("1.1.1.1"), false);
  assert.equal(limited("1.1.1.1"), true);
  assert.equal(limited("2.2.2.2"), false);
});

test("verifyTurnstile is skipped when no secret is configured", async () => {
  assert.equal(await verifyTurnstile(undefined, "1.1.1.1", "contact"), true);
});
