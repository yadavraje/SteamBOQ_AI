import { build } from "vite";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const clientDir = path.resolve("dist/client");
const serverDir = path.resolve("dist/server");

await build({
  configFile: false,
  build: { outDir: clientDir, emptyOutDir: true },
  appType: "spa"
});

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

async function collectFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const collected = {};
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      Object.assign(collected, await collectFiles(absolute, relative));
      continue;
    }
    const extension = path.extname(entry.name).toLowerCase();
    const binary = ![".html", ".js", ".css", ".json", ".svg"].includes(extension);
    const contents = await readFile(absolute);
    collected[`/${relative}`] = {
      body: binary ? contents.toString("base64") : contents.toString("utf8"),
      type: contentTypes[extension] || "application/octet-stream",
      encoding: binary ? "base64" : "utf8"
    };
  }
  return collected;
}

const files = await collectFiles(clientDir);
files["/"] = files["/index.html"];

const virtualFilesPlugin = {
  name: "steamboq-embedded-site-files",
  resolveId(id) {
    return id === "virtual:site-files" ? "\0virtual:site-files" : null;
  },
  load(id) {
    if (id !== "\0virtual:site-files") return null;
    return `export default ${JSON.stringify(files)};`;
  }
};

await build({
  configFile: false,
  plugins: [virtualFilesPlugin],
  build: {
    ssr: path.resolve("src/server.js"),
    outDir: serverDir,
    emptyOutDir: true,
    target: "es2022",
    rollupOptions: {
      output: {
        format: "es",
        entryFileNames: "index.js",
        inlineDynamicImports: true
      }
    }
  }
});
