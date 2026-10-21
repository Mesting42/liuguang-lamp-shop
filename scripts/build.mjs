import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = join(root, "dist");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const entry of ["index.html", "styles.css", "night.css", "manifest.webmanifest", "src", "assets"]) {
  await cp(join(root, entry), join(out, entry), { recursive: true });
}
console.log("Built the production game in dist/.");
