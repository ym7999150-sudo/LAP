/**
 * After `BUILD_TARGET=desktop next build`, copy the files the standalone server needs at runtime:
 * static assets, public files, SQL migrations and PGlite's wasm/data files.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const out = path.join(root, ".next", "standalone");
if (!fs.existsSync(path.join(out, "server.js"))) {
  console.error("Standalone build not found. Run: npm run build:desktop:next");
  process.exit(1);
}
const copy = (from, to) => {
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  console.log("copied", path.relative(root, from), "→", path.relative(root, to));
};
copy(path.join(root, ".next", "static"), path.join(out, ".next", "static"));
copy(path.join(root, "public"), path.join(out, "public"));
copy(path.join(root, "drizzle"), path.join(out, "drizzle"));
copy(path.join(root, "node_modules", "@electric-sql", "pglite"), path.join(out, "node_modules", "@electric-sql", "pglite"));
// Never ship local secrets.
for (const f of [".env", ".env.local"]) fs.rmSync(path.join(out, f), { force: true });
console.log("desktop bundle ready:", path.relative(root, out));
