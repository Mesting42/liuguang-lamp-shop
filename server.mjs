import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const production = process.argv.includes("--production");
const publicRoot = resolve(root, production ? "dist" : ".");
const port = Number(process.env.PORT || 4173);
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json"
};

if (production && !existsSync(join(publicRoot, "index.html"))) {
  console.error("Production files are missing. Run npm run build first.");
  process.exit(1);
}

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname);
  const safePath = normalize(pathname).replace(/^(\.\.[/\\])+/, "").replace(/^[/\\]+/, "");
  let file = resolve(publicRoot, safePath || "index.html");
  if (!file.startsWith(publicRoot)) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  if (!existsSync(file) || !statSync(file).isFile()) {
    file = join(publicRoot, "index.html");
  }
  res.writeHead(200, {
    "Content-Type": mime[extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => {
  console.log("流光灯铺 is ready at http://127.0.0.1:" + port);
});
