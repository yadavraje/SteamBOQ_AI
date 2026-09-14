import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("every direct client DOM reference exists in the application shell", async () => {
  const [application, html] = await Promise.all([
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8")
  ]);
  const referenced = [...application.matchAll(/\$\("([A-Za-z0-9_-]+)"\)/g)].map((match) => match[1]);
  const missing = [...new Set(referenced)].filter((id) => !new RegExp(`id=["']${id}["']`).test(html));
  assert.deepEqual(missing, []);
});

test("public-free shell contains account history, feedback and engineering warnings", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const phrase of ["My account", "Calculation history", "Clear history", "Free public edition", "Submit private feedback", "Controlled user-testing estimate only"]) {
    assert.ok(html.includes(phrase), `missing customer-facing contract: ${phrase}`);
  }
});
