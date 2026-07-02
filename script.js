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
