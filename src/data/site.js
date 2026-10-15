// Single source for the facts every page repeats. Change them here only.
export const site = {
  name: "Luigi Scorzelli",
  siteName: "Luigi Scorzelli — AI Automation Engineer",
  email: "luigiscorzelli@aiframe.it",
  calendlyUrl: "https://calendly.com/luigi-scorzelli/30min",
  city: "Salerno",
  // Shown in the footer only when set.
  vatNumber: null,
  linkedin: "https://www.linkedin.com/in/luigi-scorzelli/",
  umamiWebsiteId: "a8ce1cae-353e-4bad-b60c-63a411c5de15",
  umamiDomains: "luigiscorzelli.com,www.luigiscorzelli.com",
  // Cloudflare Turnstile public site key (the secret stays in Vercel env).
  turnstileSiteKey: "0x4AAAAAAFLwWuI3TL2rh0FI",
  defaultOgImage: "/assets/og-home.jpg",
};

// Footer links. A page goes in here only once it is live, so the footer never
// links to a 404 (check-up arrives with Release 2, Fase 6).
export const footerLinks = [
  { href: "/visibilita-ai", label: "Audit AI", live: false },
  { href: "/agenzie", label: "Per agenzie", live: false },
  { href: "/check-up", label: "Check-up", live: false },
  { href: "/privacy", label: "Privacy", live: false },
];
