// TEMPORARY (Fase 2 technical probe): proves an api/_lib module can be
// imported both by a Vercel function and by a browser script, and that the
// _lib folder is not published as an endpoint. Delete before merging.
export function probeMessage(where) {
  return `api/_lib/probe.js loaded from ${where}`;
}
