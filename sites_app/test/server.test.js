import assert from "node:assert/strict";
import test from "node:test";
import worker from "../dist/server/index.js";

const identityHeaders = {
  "oai-authenticated-user-email": "engineer@example.com"
};

test("anonymous visitors receive the free sign-in or registration gate", async () => {
  const response = await worker.fetch(new Request("https://steamboq.chatgpt.site/"), {});
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /Sign in or create free account/);
  assert.match(html, /No ChatGPT Plus plan, subscription, checkout, payment mandate, or GST invoice/);
  assert.match(response.headers.get("content-security-policy"), /frame-ancestors 'none'/);
});

test("anonymous API calls fail with a stable sign-in route", async () => {
  const response = await worker.fetch(new Request("https://steamboq.chatgpt.site/api/config"), {});
  const result = await response.json();
  assert.equal(response.status, 401);
  assert.equal(result.code, "authentication_required");
  assert.equal(result.sign_in_url, "/signin-with-chatgpt?return_to=%2F");
});

test("authenticated public configuration is free and has no payment capability", async () => {
  const response = await worker.fetch(new Request("https://steamboq.chatgpt.site/api/config", { headers: identityHeaders }), {});
  const config = await response.json();
  assert.equal(response.status, 200);
  assert.equal(config.mode, "public_free");
  assert.equal(config.authentication, "chatgpt");
  assert.equal(config.payments_enabled, false);
  assert.equal(config.project_limit, 25);
  assert.equal(config.history_limit, 50);
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(response.headers.get("permissions-policy"), /payment=\(\)/);
});

test("authenticated static application receives security headers", async () => {
  const response = await worker.fetch(new Request("https://steamboq.chatgpt.site/", { headers: identityHeaders }), {});
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.match(html, /SteamBOQ/);
  assert.match(html, /Free public edition/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("cross-origin write requests are rejected", async () => {
  const response = await worker.fetch(new Request("https://steamboq.chatgpt.site/api/feedback", {
    method: "POST",
    headers: { ...identityHeaders, origin: "https://attacker.example", "content-type": "application/json" },
    body: "{}"
  }), {});
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, "origin_rejected");
});

test("feedback fails closed when durable storage is unavailable", async () => {
  const response = await worker.fetch(new Request("https://steamboq.chatgpt.site/api/feedback", {
    method: "POST",
    headers: { ...identityHeaders, origin: "https://steamboq.chatgpt.site", "content-type": "application/json" },
    body: JSON.stringify({ rating: 5, category: "usability", comment: "The calculation trace is clear and easy to review.", role: "consultant" })
  }), {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "service_error");
});

test("removed commercial and unknown APIs return JSON 404", async () => {
  for (const path of ["/api/billing/checkout", "/api/leads", "/api/not-real"]) {
    const response = await worker.fetch(new Request(`https://steamboq.chatgpt.site${path}`, {
      method: path === "/api/not-real" ? "GET" : "POST",
      headers: { ...identityHeaders, origin: "https://steamboq.chatgpt.site" }
    }), {});
    assert.equal(response.status, 404);
    assert.equal((await response.json()).code, "not_found");
  }
});

test("external hosts cannot spoof Sites identity headers", async () => {
  const response = await worker.fetch(new Request("https://app.example.com/api/session", { headers: identityHeaders }), {});
  const result = await response.json();
  assert.equal(response.status, 401);
  assert.equal(result.code, "authentication_required");
});

test("an explicitly configured custom domain can use the same ChatGPT identity", async () => {
  const response = await worker.fetch(new Request("https://app.steamboq.example/api/config", { headers: identityHeaders }), {
    CUSTOM_SITE_HOSTNAMES: "app.steamboq.example"
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).authentication, "chatgpt");
});

test("health endpoint is public and never reports payments", async () => {
  const response = await worker.fetch(new Request("https://steamboq.chatgpt.site/api/health"), {});
  const health = await response.json();
  assert.equal(response.status, 200);
  assert.equal(health.version, "public-free-v8");
  assert.equal(health.payments, false);
});
