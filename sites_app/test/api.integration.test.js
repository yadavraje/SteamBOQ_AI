import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import worker from "../dist/server/index.js";

class D1Statement {
  constructor(database, sql, values = []) {
    this.database = database;
    this.sql = sql;
    this.values = values;
  }

  bind(...values) { return new D1Statement(this.database, this.sql, values); }
  async first() { return this.database.prepare(this.sql).get(...this.values) || null; }
  async all() { return { success: true, results: this.database.prepare(this.sql).all(...this.values) }; }
  async run() {
    const result = this.database.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

class TestD1 {
  constructor(database) { this.database = database; }
  prepare(sql) { return new D1Statement(this.database, sql); }
  async batch(statements) {
    this.database.exec("BEGIN");
    try {
      const results = [];
      for (const statement of statements) results.push(await statement.run());
      this.database.exec("COMMIT");
      return results;
    } catch (caught) {
      this.database.exec("ROLLBACK");
      throw caught;
    }
  }
}

async function testDatabase() {
  const database = new DatabaseSync(":memory:");
  for (const file of ["0000_public_free.sql", "0001_calculation_history.sql"]) {
    database.exec(await readFile(new URL(`../drizzle/${file}`, import.meta.url), "utf8"));
  }
  return { database, binding: new TestD1(database) };
}

function siteRequest(path, { method = "GET", body, user = "user-a", email = "a@example.com" } = {}) {
  return new Request(`https://steamboq.chatgpt.site${path}`, {
    method,
    headers: {
      origin: "https://steamboq.chatgpt.site",
      "content-type": "application/json",
      "oai-authenticated-user-id": user,
      "oai-authenticated-user-email": email
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

test("D1-backed identity, projects and feedback preserve ownership and free-account limits", async () => {
  const { database, binding } = await testDatabase();
  const env = { DB: binding };

  const sessionResponse = await worker.fetch(siteRequest("/api/session"), env);
  const session = await sessionResponse.json();
  assert.equal(session.authenticated, true);
  assert.equal(session.access, "free");

  for (let index = 1; index <= 25; index += 1) {
    const id = `scenario_${index}`;
    const name = `Scenario ${index}`;
    const response = await worker.fetch(siteRequest("/api/projects", { method: "POST", body: { id, name, payload: { id, name, summary: { total: 100 } } } }), env);
    assert.ok([200, 201].includes(response.status));
  }
  const limited = await worker.fetch(siteRequest("/api/projects", { method: "POST", body: { id: "scenario_26", name: "Twenty-sixth", payload: { id: "scenario_26" } } }), env);
  assert.equal(limited.status, 409);
  assert.equal((await limited.json()).code, "project_limit_reached");

  const listing = await worker.fetch(siteRequest("/api/projects"), env);
  const projects = await listing.json();
  assert.equal(projects.projects.length, 25);
  assert.equal(projects.limit, 25);

  const collision = await worker.fetch(siteRequest("/api/projects", {
    method: "POST", user: "user-b", email: "b@example.com",
    body: { id: "scenario_1", name: "Collision", payload: { id: "scenario_1" } }
  }), env);
  assert.equal(collision.status, 409);
  assert.equal((await collision.json()).code, "project_id_conflict");

  const feedback = await worker.fetch(siteRequest("/api/feedback", {
    method: "POST",
    body: { rating: 4, category: "calculation", comment: "Please explain the condensate flash fraction more clearly.", role: "plant_engineer" }
  }), env);
  assert.equal(feedback.status, 201);
  assert.equal((await feedback.json()).delivery, "database");
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM feedback").get().count, 1);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM users").get().count, 2);
  database.close();
});

test("calculation history is private, capped at 50 and independent from saved projects", async () => {
  const { database, binding } = await testDatabase();
  const env = { DB: binding };
  await worker.fetch(siteRequest("/api/projects", {
    method: "POST",
    body: { id: "history_project", name: "Independent project", payload: { inputs: { method: "product" } } }
  }), env);
  const historyPayload = (index) => ({
    project_name: `History ${index}`,
    method: "product",
    trigger_type: index % 2 ? "calculated" : "scenario_saved",
    steam_demand: 100 + index,
    steam_pipe_nb: 40,
    pressure_drop_bar: 0.25,
    boq_value_inr: 250000 + index,
    rate_as_of: "2026-09-04",
    engine_version: "test-engine",
    payload: { inputs: { projectName: `History ${index}`, method: "product" }, rates: {}, rateSnapshot: {} }
  });

  for (let index = 1; index <= 51; index += 1) {
    const response = await worker.fetch(siteRequest("/api/history", { method: "POST", body: historyPayload(index) }), env);
    assert.equal(response.status, 201);
  }

  const listingResponse = await worker.fetch(siteRequest("/api/history"), env);
  const listing = await listingResponse.json();
  assert.equal(listingResponse.status, 200);
  assert.equal(listing.limit, 50);
  assert.equal(listing.history.length, 50);
  assert.ok(listing.history.every((record) => record.payload?.inputs));

  const otherUserResponse = await worker.fetch(siteRequest("/api/history", { user: "user-b", email: "b@example.com" }), env);
  assert.equal((await otherUserResponse.json()).history.length, 0);

  const protectedId = listing.history[0].id;
  await worker.fetch(siteRequest(`/api/history/${protectedId}`, { method: "DELETE", user: "user-b", email: "b@example.com" }), env);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM calculation_history").get().count, 50);

  await worker.fetch(siteRequest("/api/history", { method: "DELETE" }), env);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM calculation_history").get().count, 0);
  assert.equal(database.prepare("SELECT COUNT(*) AS count FROM projects").get().count, 1);
  database.close();
});
