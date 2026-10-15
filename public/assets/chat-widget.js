// Chatbot widget for Luigi Scorzelli's portfolio.
// Vanilla JS, no dependencies. Streams plain text from /api/chat and follows
// the page language (lang="en" → English, otherwise Italian).
(function () {
  const isEn = document.documentElement.lang === "en";
  const t = isEn
    ? {
        fab: "Chat with the assistant",
        title: "Ask about the services",
        sub: "AI assistant · replies from Luigi's info",
        placeholder: "Type your message…",
        send: "Send",
        greeting:
          "Hi! I'm Luigi's assistant. Ask me about his AI automation services, the case studies, or how he could help your business.",
        error: "Something went wrong. Please try again or use the contact form.",
      }
    : {
        fab: "Parla con l'assistente",
        title: "Chiedi sui servizi",
        sub: "Assistente AI · risponde dalle info di Luigi",
        placeholder: "Scrivi un messaggio…",
        send: "Invia",
        greeting:
          "Ciao! Sono l'assistente di Luigi. Chiedimi dei suoi servizi di automazione AI, dei case study o di come potrebbe aiutare la tua attività.",
        error: "Qualcosa è andato storto. Riprova o usa il form contatti.",
      };

  // Conversation history sent to the API (role/content pairs).
  const history = [];
  let streaming = false;

  // ── Build UI ────────────────────────────────────────────────────
  const fab = document.createElement("button");
  fab.className = "cw-fab";
  fab.type = "button";
  fab.setAttribute("aria-label", t.fab);
  fab.innerHTML = `<span aria-hidden="true">💬</span><span>${t.fab}</span>`;

  const panel = document.createElement("div");
  panel.className = "cw-panel";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", t.title);
  panel.innerHTML = `
    <div class="cw-header">
      <div>
        <div class="cw-header-title">${t.title}</div>
        <div class="cw-header-sub">${t.sub}</div>
      </div>
      <button class="cw-close" type="button" aria-label="${isEn ? "Close" : "Chiudi"}">×</button>
    </div>
    <div class="cw-log" role="log" aria-live="polite"></div>
    <form class="cw-form">
      <textarea class="cw-input" rows="1" placeholder="${t.placeholder}" aria-label="${t.placeholder}"></textarea>
      <button class="cw-send" type="submit">${t.send}</button>
    </form>`;

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  const log = panel.querySelector(".cw-log");
  const form = panel.querySelector(".cw-form");
  const input = panel.querySelector(".cw-input");
  const sendBtn = panel.querySelector(".cw-send");
  const closeBtn = panel.querySelector(".cw-close");

  // ── Helpers ─────────────────────────────────────────────────────
  const escapeHtml = (s) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Minimal, safe rendering: escape everything, then linkify bare URLs.
  const render = (text) =>
    escapeHtml(text).replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );

  function addMessage(role, text) {
    const el = document.createElement("div");
    el.className = "cw-msg cw-msg-" + role;
    el.innerHTML = role === "bot" ? render(text) : escapeHtml(text);
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function addTyping() {
    const el = document.createElement("div");
    el.className = "cw-msg cw-msg-bot";
    el.innerHTML = '<span class="cw-typing"><span></span><span></span><span></span></span>';
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  let greeted = false;
  function openPanel() {
    panel.hidden = false;
    fab.hidden = true;
    if (!greeted) {
      addMessage("bot", t.greeting);
      greeted = true;
    }
    input.focus();
  }
  function closePanel() {
    panel.hidden = true;
    fab.hidden = false;
    fab.focus();
  }

  fab.addEventListener("click", openPanel);
  closeBtn.addEventListener("click", closePanel);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) closePanel();
  });

  // Auto-grow textarea; Enter sends, Shift+Enter newline.
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 96) + "px";
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // ── Send + stream ───────────────────────────────────────────────
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text || streaming) return;

    streaming = true;
    sendBtn.disabled = true;
    addMessage("user", text);
    history.push({ role: "user", content: text });
    input.value = "";
    input.style.height = "auto";

    const typing = addTyping();
    let botEl = null;
    let full = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, lang: isEn ? "en" : "it" }),
      });

      if (!res.ok || !res.body) throw new Error("HTTP " + res.status);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        if (!botEl) {
          typing.remove();
          botEl = addMessage("bot", "");
        }
        full += chunk;
        botEl.innerHTML = render(full);
        log.scrollTop = log.scrollHeight;
      }

      if (!botEl) {
        // No content streamed — treat as error.
        typing.remove();
        addMessage("error", t.error);
      } else {
        history.push({ role: "assistant", content: full });
      }
    } catch (err) {
      typing.remove();
      addMessage("error", t.error);
    } finally {
      streaming = false;
      sendBtn.disabled = false;
      input.focus();
    }
  });
})();
