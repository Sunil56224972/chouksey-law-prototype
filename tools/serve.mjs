// Local preview of the site plus the /api/chat function, like Vercel serves it.
// Usage: node tools/serve.mjs   (reads GROQ_API_KEY from .env.local)   -> http://localhost:3000
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envFile = join(root, ".env.local");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const chat = createRequire(import.meta.url)("../api/chat.js");
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".pdf": "application/pdf"
};
const port = Number(process.env.PORT) || 3000;

createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/chat") {
    Promise.resolve(chat(req, res)).catch((e) => { console.error(e); if (!res.headersSent) res.statusCode = 500; res.end(); });
    return;
  }
  let rel = normalize(decodeURIComponent(url.pathname)).replace(/^[\\/]+/, "");
  if (!rel || rel.endsWith(sep)) rel = join(rel, "index.html");
  const file = join(root, rel);
  const blocked = /^(api|src|tools|scrape|node_modules)([\\/]|$)|^\./.test(rel);
  if (blocked || !file.startsWith(root) || !existsSync(file) || !statSync(file).isFile()) {
    res.statusCode = 404;
    return res.end("Not found");
  }
  res.setHeader("Content-Type", types[extname(file).toLowerCase()] || "application/octet-stream");
  res.end(readFileSync(file));
}).listen(port, () => console.log(`Preview: http://localhost:${port}`));