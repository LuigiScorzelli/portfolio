// @ts-check
import { defineConfig } from "astro/config";

// Static output: Astro builds the pages, Vercel serves dist/ and still builds
// the functions in the root api/ folder on its own.
export default defineConfig({
  site: "https://luigiscorzelli.com",
  output: "static",
});
