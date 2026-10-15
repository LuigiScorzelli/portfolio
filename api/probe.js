// TEMPORARY (Fase 2 technical probe): function that imports api/_lib.
// Delete before merging.
import { probeMessage } from "./_lib/probe.js";

export default function handler(req, res) {
  res.status(200).json({ ok: true, message: probeMessage("function") });
}
