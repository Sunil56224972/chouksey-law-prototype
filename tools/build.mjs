// Assembles src/pages/*.html with the shared partials into the site root.
// Usage: node tools/build.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const partial = (name) => readFileSync(join(root, "src/partials", `${name}.html`), "utf8");
const pagesDir = join(root, "src/pages");

for (const file of readdirSync(pagesDir).filter((f) => f.endsWith(".html"))) {
  let src = readFileSync(join(pagesDir, file), "utf8");
  const meta = {};
  // Page metadata lives in leading comments:  <!-- title: ... -->
  src = src.replace(/^<!--\s*(\w+):\s*([\s\S]*?)\s*-->\r?\n/gm, (_, k, v) => { meta[k] = v; return ""; });

  const head = partial("head").replace("{{title}}", meta.title ?? "").replace("{{desc}}", meta.desc ?? "");
  const nav = meta.nav ?? file;
  const header = partial("header").replace(`<a href="${nav}">`, `<a href="${nav}" aria-current="page">`);

  const html = head + header + src.replace("<!-- @cta -->", partial("cta")) + partial("footer");
  writeFileSync(join(root, file), html);
  console.log("built", file);
}
