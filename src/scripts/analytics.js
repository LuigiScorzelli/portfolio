// Umami custom events, same convention as the old site's script.js: any
// element with data-track="event_name" (optional data-track-pos for where on
// the page it was clicked). Umami only counts on the production domains
// (data-domains in Base.astro), so previews and localhost send nothing.
const track = (name, props) => window.umami?.track(name, props);

document.addEventListener("click", (event) => {
  const el = event.target.closest("[data-track]");
  if (!el) return;
  track(el.dataset.track, el.dataset.trackPos ? { posizione: el.dataset.trackPos } : undefined);
});
