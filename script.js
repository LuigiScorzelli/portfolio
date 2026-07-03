const nav = document.querySelector("[data-nav]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const year = document.querySelector("[data-year]");
const isEn = document.documentElement.lang === "en";

if (year) {
  year.textContent = new Date().getFullYear();
}

menuToggle?.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute(
    "aria-label",
    isOpen
      ? (isEn ? "Close menu" : "Chiudi menu")
      : (isEn ? "Open menu" : "Apri menu")
  );
});

nav?.addEventListener("click", (event) => {
  if (event.target.closest("a") && !event.target.closest(".lang-switch")) {
    nav.classList.remove("is-open");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", isEn ? "Open menu" : "Apri menu");
  }
});

const contactForm = document.querySelector(".contact-form");
const formStatus = document.querySelector("[data-form-status]");

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = contactForm.querySelector("button[type=submit]");
  const originalLabel = button?.textContent;

  if (button) {
    button.disabled = true;
    button.textContent = isEn ? "Sending…" : "Invio…";
  }
  if (formStatus) {
    formStatus.className = "form-status";
    formStatus.textContent = "";
  }

  try {
    const payload = Object.fromEntries(new FormData(contactForm).entries());
    const response = await fetch(contactForm.action, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (response.ok && data.success) {
      contactForm.reset();
      if (formStatus) {
        formStatus.classList.add("is-success");
        formStatus.textContent = isEn
          ? "Thanks! I'll get back to you soon."
          : "Grazie! Ti rispondo a breve.";
      }
    } else {
      throw new Error(data.message || "Request failed");
    }
  } catch (error) {
    if (formStatus) {
      formStatus.classList.add("is-error");
      formStatus.textContent = isEn
        ? "Something went wrong. Please email me directly."
        : "Qualcosa è andato storto. Scrivimi direttamente via email.";
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }
});
