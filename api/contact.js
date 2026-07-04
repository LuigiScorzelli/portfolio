// Classic contact form endpoint. The heavy lifting (validation, HubSpot,
// Resend) lives in _contact-core.js so the chatbot can reuse the exact same
// hardened pipeline. This file only owns HTTP concerns: method, origin,
// rate limiting and parsing the body.
import {
  isAllowedOrigin,
  getClientIp,
  createRateLimiter,
  validateContact,
  submitContact,
} from "./_contact-core.js";

// Per-IP: 5 requests / 10 minutes.
const isRateLimited = createRateLimiter({
  max: 5,
  windowMs: 10 * 60 * 1000,
});

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

  const valid = validateContact({ name, email, message });
  if (!valid.ok) {
    return res.status(400).json({ success: false, message: valid.message });
  }

  const result = await submitContact({
    name: valid.name,
    email: valid.email,
    message: valid.message,
    source: "form",
  });

  if (!result.ok) {
    // 502 for delivery failures, 500 for config problems — mirror old behaviour.
    const status = result.message === "Email delivery failed" ? 502 : 500;
    return res.status(status).json({ success: false, message: result.message });
  }

  return res.status(200).json({ success: true });
}
