// Contact form logic, ported from the old site's script.js: JSON POST to
// /api/contact with the honeypot, the time trap (elapsed) and the Turnstile
// token, then the contact_submit event. Works for every .contact-form on the
// page and follows the page language.
import { track } from "./analytics.js";

const isEn = document.documentElement.lang === "en";
// Time trap: the API rejects submits sent too soon after page load.
const pageLoadedAt = Date.now();

const copy = isEn
  ? {
      sending: "Sending…",
      success: "Thanks! I'll get back to you soon.",
      error: "Something went wrong. Please email me directly.",
    }
  : {
      sending: "Invio…",
      success: "Grazie! Ti rispondo a breve.",
      error: "Qualcosa è andato storto. Scrivimi direttamente via email.",
    };

for (const form of document.querySelectorAll(".contact-form")) {
  const status = form.querySelector("[data-form-status]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector("button[type=submit]");
    const originalLabel = button?.textContent;

    if (button) {
      button.disabled = true;
      button.textContent = copy.sending;
    }
    if (status) {
      status.className = "form-status";
      status.textContent = "";
    }

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      payload.elapsed = Date.now() - pageLoadedAt;
      const response = await fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Request failed");

      track("contact_submit", form.dataset.trackPos ? { posizione: form.dataset.trackPos } : undefined);
      form.reset();
      if (status) {
        status.classList.add("is-success");
        status.textContent = copy.success;
      }
    } catch {
      if (status) {
        status.classList.add("is-error");
        status.textContent = copy.error;
      }
    } finally {
      // Turnstile tokens are single-use: get a fresh one for the next submit.
      window.turnstile?.reset();
      if (button) {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    }
  });
}
