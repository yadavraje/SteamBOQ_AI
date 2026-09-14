import files from "virtual:site-files";

const APP_VERSION = "public-free-v8";
const FALLBACK_RATES = {
  mode: "review",
  live: false,
  as_of: "2026-09-02",
  source_label: "SteamBOQ seed catalogue — supplier validation required",
  steel_index_change_pct: 0,
  aluminium_index_change_pct: 0,
  supplier_factor: 1,
  region: "Mumbai / Thane",
  region_factor: 1.03,
  coverage_pct: 0,
  confidence: "C — unverified",
  currency: "INR"
};

const feedbackCategories = new Set(["calculation", "boq_rates", "usability", "feature", "other"]);
const feedbackRoles = new Set(["contractor", "consultant", "plant_engineer", "supplier", "student", "other"]);
let rateCache = null;
let rateCacheTime = 0;

function securityHeaders() {
  return {
    "content-security-policy": "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self'; connect-src 'self'; form-action 'self'; upgrade-insecure-requests",
    "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "referrer-policy": "strict-origin-when-cross-origin",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "vary": "oai-authenticated-user-id, oai-authenticated-user-email"
  };
}

function secured(response) {
  const headers = new Headers(response.headers);
  Object.entries(securityHeaders()).forEach(([key, value]) => headers.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function json(body, status = 200, extraHeaders = {}) {
  return Response.json(body, { status, headers: { "cache-control": "private, no-store", ...extraHeaders } });
}

function error(message, status = 400, code = "request_error", extra = {}) {
  return json({ ok: false, error: message, code, ...extra }, status);
}

async function readJson(request, maximumBytes = 200000) {
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > maximumBytes) throw Object.assign(new Error("Request is too large."), { status: 413 });
  const text = await request.text();
  if (text.length > maximumBytes) throw Object.assign(new Error("Request is too large."), { status: 413 });
  try { return JSON.parse(text || "{}"); }
  catch { throw Object.assign(new Error("Request body is not valid JSON."), { status: 400 }); }
}

function writeOriginAllowed(request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

function isSitesHost(hostname) {
  return hostname === "chatgpt.site" || hostname.endsWith(".chatgpt.site");
}

function isTrustedIdentityHost(hostname, env) {
  if (isSitesHost(hostname)) return true;
  const configured = String(env.CUSTOM_SITE_HOSTNAMES || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(hostname.toLowerCase());
}

function decodedFullName(headers) {
  const encoded = headers.get("oai-authenticated-user-full-name");
  if (!encoded || headers.get("oai-authenticated-user-full-name-encoding") !== "percent-encoded-utf-8") return null;
  try { return decodeURIComponent(encoded).slice(0, 120); }
  catch { return null; }
}

async function stableAccountId(email) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`chatgpt:${email}`));
  return `chatgpt:${[...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

async function getIdentity(request, env) {
  if (!isTrustedIdentityHost(new URL(request.url).hostname, env)) return null;
  const email = String(request.headers.get("oai-authenticated-user-email") || "").trim().toLowerCase().slice(0, 254);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return {
    id: await stableAccountId(email),
    email,
    name: decodedFullName(request.headers),
    provider: "chatgpt"
  };
}

function requireDatabase(env, subject) {
  if (!env.DB?.prepare) throw Object.assign(new Error(`${subject} storage is temporarily unavailable.`), { status: 503 });
}

async function ensureUser(env, identity) {
  requireDatabase(env, "Account");
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO users (id, email, display_name, auth_provider, created_at, updated_at, last_seen_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET email = excluded.email, display_name = excluded.display_name,
      auth_provider = excluded.auth_provider, updated_at = excluded.updated_at, last_seen_at = excluded.last_seen_at
  `).bind(identity.id, identity.email, identity.name, identity.provider, now, now, now).run();
}

function freeProjectLimit(env) {
  const configured = Number(env.FREE_PROJECT_LIMIT);
  return Number.isInteger(configured) ? Math.min(100, Math.max(1, configured)) : 25;
}

function calculationHistoryLimit(env) {
  const configured = Number(env.HISTORY_LIMIT);
  return Number.isInteger(configured) ? Math.min(200, Math.max(10, configured)) : 50;
}

function publicConfig(env) {
  return {
    version: APP_VERSION,
    mode: "public_free",
    authentication: "chatgpt",
    persistence_enabled: Boolean(env.DB?.prepare),
    payments_enabled: false,
    project_limit: freeProjectLimit(env),
    history_limit: calculationHistoryLimit(env),
    legal: {
      operator: String(env.OPERATOR_NAME || "SteamBOQ").slice(0, 120),
      support_email: env.SUPPORT_EMAIL ? String(env.SUPPORT_EMAIL).slice(0, 254) : null,
      terms_version: String(env.TERMS_VERSION || "2026-09-free-beta"),
      privacy_version: String(env.PRIVACY_VERSION || "2026-09-free-beta")
    }
  };
}

async function sessionFor(env, identity) {
  await ensureUser(env, identity);
  return {
    authenticated: true,
    user: { id: identity.id, email: identity.email, name: identity.name, provider: identity.provider },
    access: "free"
  };
}

function normalizeRatePayload(payload, env) {
  if (!payload || typeof payload !== "object") return null;
  const asOf = String(payload.as_of || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return null;
  const date = new Date(`${asOf}T00:00:00Z`);
  const maximumAgeDays = Math.min(14, Math.max(1, Number(env.RATE_MAX_AGE_DAYS) || 2));
  if (Number.isNaN(date.getTime()) || Date.now() - date.getTime() > maximumAgeDays * 86400000 || date.getTime() > Date.now() + 86400000) return null;
  const bounded = (value, minimum, maximum, fallback) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric >= minimum && numeric <= maximum ? numeric : fallback;
  };
  const source = String(payload.source_label || env.RATE_FEED_SOURCE_LABEL || "Licensed supplier feed").trim().slice(0, 160);
  if (!source) return null;
  return {
    ...FALLBACK_RATES,
    mode: "live",
    live: true,
    as_of: asOf,
    source_label: source,
    steel_index_change_pct: bounded(payload.steel_index_change_pct, -50, 100, 0),
    aluminium_index_change_pct: bounded(payload.aluminium_index_change_pct, -50, 100, 0),
    supplier_factor: bounded(payload.supplier_factor, 0.5, 2, 1),
    region: String(payload.region || "India").slice(0, 60),
    region_factor: bounded(payload.region_factor, 0.7, 1.5, 1),
    coverage_pct: bounded(payload.coverage_pct, 0, 100, 0),
    confidence: String(payload.confidence || "B — licensed feed").slice(0, 40),
    currency: "INR"
  };
}

async function licensedRates(env) {
  if (env.RATE_LICENSE_APPROVED !== "true" || !env.RATE_FEED_URL) return { ...FALLBACK_RATES };
  if (rateCache && Date.now() - rateCacheTime < 21600000) return rateCache;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const feedUrl = new URL(env.RATE_FEED_URL);
    if (feedUrl.protocol !== "https:") throw new Error("Rate feed must use HTTPS");
    const headers = { accept: "application/json" };
    if (env.RATE_FEED_API_KEY) headers.authorization = `Bearer ${env.RATE_FEED_API_KEY}`;
    const response = await fetch(feedUrl, { headers, signal: controller.signal, redirect: "error" });
    if (!response.ok) throw new Error("Rate feed unavailable");
    const normalized = normalizeRatePayload(await response.json(), env);
    if (!normalized) throw new Error("Rate feed failed validation");
    rateCache = normalized;
    rateCacheTime = Date.now();
    return rateCache;
  } catch {
    return { ...FALLBACK_RATES, source_label: "Licensed rate feed unavailable or stale — supplier review required" };
  } finally {
    clearTimeout(timeout);
  }
}

async function acceptFeedback(request, env, identity) {
  requireDatabase(env, "Feedback");
  const input = await readJson(request, 50000);
  if (input.website) return json({ ok: true, id: crypto.randomUUID(), delivery: "filtered" }, 201);
  const rating = Number(input.rating);
  const category = String(input.category || "");
  const comment = String(input.comment || "").trim();
  const role = String(input.role || "other");
  const followUp = Boolean(input.follow_up_consent);
  const providedEmail = input.email ? String(input.email).trim().slice(0, 254) : null;
  const email = followUp ? (providedEmail || identity.email) : null;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return error("Select a rating from 1 to 5.");
  if (!feedbackCategories.has(category)) return error("Select a valid feedback category.");
  if (comment.length < 20 || comment.length > 1500) return error("Comment must contain 20 to 1,500 characters.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error("Enter a valid contact email.");
  await ensureUser(env, identity);
  const id = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  let calculationContext = null;
  if (input.calculation_context && typeof input.calculation_context === "object") {
    calculationContext = JSON.stringify(input.calculation_context);
    if (calculationContext.length > 20000) return error("Calculation context is too large.", 413);
  }
  await env.DB.prepare(`
    INSERT INTO feedback (id, submitted_at, user_id, rating, category, comment, role, email,
      follow_up_consent, calculation_context, app_version, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
  `).bind(id, submittedAt, identity.id, rating, category, comment,
    feedbackRoles.has(role) ? role : "other", email, followUp ? 1 : 0,
    calculationContext, APP_VERSION).run();
  return json({ ok: true, id, delivery: "database" }, 201);
}

async function listProjects(env, identity) {
  requireDatabase(env, "Project");
  await ensureUser(env, identity);
  const result = await env.DB.prepare(`
    SELECT id, name, payload, created_at, updated_at FROM projects
    WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100
  `).bind(identity.id).all();
  const projects = (result.results || []).map((row) => {
    try { return { ...row, payload: JSON.parse(row.payload) }; }
    catch { return { ...row, payload: null }; }
  });
  return json({ ok: true, projects, access: "free", limit: freeProjectLimit(env) });
}

async function saveProject(request, env, identity) {
  requireDatabase(env, "Project");
  await ensureUser(env, identity);
  const input = await readJson(request, 180000);
  const id = /^[a-zA-Z0-9_-]{8,80}$/.test(input.id || "") ? input.id : crypto.randomUUID();
  const name = String(input.name || "Untitled project").trim().slice(0, 100) || "Untitled project";
  const payload = input.payload && typeof input.payload === "object" ? input.payload : null;
  if (!payload) return error("Project payload is required.");
  const serialized = JSON.stringify(payload);
  if (serialized.length > 150000) return error("Project data is too large.", 413);
  const matchingId = await env.DB.prepare("SELECT user_id FROM projects WHERE id = ?").bind(id).first();
  if (matchingId && matchingId.user_id !== identity.id) return error("Project identifier is already in use.", 409, "project_id_conflict");
  const existing = Boolean(matchingId);
  const limit = freeProjectLimit(env);
  if (!existing) {
    const countRow = await env.DB.prepare("SELECT COUNT(*) AS count FROM projects WHERE user_id = ?").bind(identity.id).first();
    if (Number(countRow?.count || 0) >= limit) return error(`Free accounts can store up to ${limit} projects. Delete one to save another.`, 409, "project_limit_reached");
  }
  const now = new Date().toISOString();
  await env.DB.prepare(`
    INSERT INTO projects (id, user_id, name, payload, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, payload = excluded.payload, updated_at = excluded.updated_at
    WHERE projects.user_id = excluded.user_id
  `).bind(id, identity.id, name, serialized, now, now).run();
  return json({ ok: true, id, name, updated_at: now, limit }, existing ? 200 : 201);
}

async function deleteProject(env, identity, id) {
  requireDatabase(env, "Project");
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id || "")) return error("Invalid project identifier.");
  await env.DB.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").bind(id, identity.id).run();
  return json({ ok: true });
}

async function listCalculationHistory(env, identity) {
  requireDatabase(env, "Calculation history");
  await ensureUser(env, identity);
  const limit = calculationHistoryLimit(env);
  const result = await env.DB.prepare(`
    SELECT id, project_name, method, trigger_type, steam_demand, steam_pipe_nb,
      pressure_drop_bar, boq_value_inr, rate_as_of, engine_version, payload, created_at
    FROM calculation_history
    WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?
  `).bind(identity.id, limit).all();
  const history = (result.results || []).map((row) => {
    try { return { ...row, payload: JSON.parse(row.payload) }; }
    catch { return { ...row, payload: null }; }
  });
  return json({ ok: true, history, limit });
}

function boundedHistoryNumber(value, maximum) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= maximum ? numeric : null;
}

async function createCalculationHistory(request, env, identity) {
  requireDatabase(env, "Calculation history");
  await ensureUser(env, identity);
  const input = await readJson(request, 180000);
  const projectName = String(input.project_name || "Untitled project").trim().slice(0, 100) || "Untitled project";
  const method = input.method === "direct" ? "direct" : input.method === "product" ? "product" : null;
  const triggerType = input.trigger_type === "scenario_saved" ? "scenario_saved" : input.trigger_type === "calculated" ? "calculated" : null;
  const steamDemand = boundedHistoryNumber(input.steam_demand, 1e9);
  const steamPipeNb = boundedHistoryNumber(input.steam_pipe_nb, 2000);
  const pressureDrop = boundedHistoryNumber(input.pressure_drop_bar, 1000);
  const boqValue = boundedHistoryNumber(input.boq_value_inr, 1e15);
  const rateAsOf = /^\d{4}-\d{2}-\d{2}$/.test(String(input.rate_as_of || "")) ? String(input.rate_as_of) : null;
  const engineVersion = String(input.engine_version || "").trim().slice(0, 60);
  const payload = input.payload && typeof input.payload === "object" ? input.payload : null;
  if (!method || !triggerType || steamDemand === null || steamPipeNb === null || pressureDrop === null || boqValue === null || !engineVersion || !payload) {
    return error("Calculation history payload is incomplete.");
  }
  const serialized = JSON.stringify(payload);
  if (serialized.length > 150000) return error("Calculation history data is too large.", 413);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const insert = env.DB.prepare(`
    INSERT INTO calculation_history (id, user_id, project_name, method, trigger_type, steam_demand,
      steam_pipe_nb, pressure_drop_bar, boq_value_inr, rate_as_of, engine_version, payload, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, identity.id, projectName, method, triggerType, steamDemand,
    Math.round(steamPipeNb), pressureDrop, boqValue, rateAsOf, engineVersion, serialized, createdAt);
  const limit = calculationHistoryLimit(env);
  const prune = env.DB.prepare(`
    DELETE FROM calculation_history
    WHERE user_id = ? AND id NOT IN (
      SELECT id FROM calculation_history WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?
    )
  `).bind(identity.id, identity.id, limit);
  if (typeof env.DB.batch === "function") await env.DB.batch([insert, prune]);
  else {
    await insert.run();
    await prune.run();
  }
  return json({ ok: true, id, created_at: createdAt, limit }, 201);
}

async function deleteCalculationHistory(env, identity, id) {
  requireDatabase(env, "Calculation history");
  if (!/^[a-zA-Z0-9_-]{8,80}$/.test(id || "")) return error("Invalid history identifier.");
  await env.DB.prepare("DELETE FROM calculation_history WHERE id = ? AND user_id = ?").bind(id, identity.id).run();
  return json({ ok: true });
}

async function clearCalculationHistory(env, identity) {
  requireDatabase(env, "Calculation history");
  await env.DB.prepare("DELETE FROM calculation_history WHERE user_id = ?").bind(identity.id).run();
  return json({ ok: true });
}

function signInRequired(api = false) {
  const signInUrl = "/signin-with-chatgpt?return_to=%2F";
  if (api) return error("Sign in or create a ChatGPT account to use SteamBOQ.", 401, "authentication_required", { sign_in_url: signInUrl });
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#102c3d"><title>Sign in · SteamBOQ</title><style>
  :root{color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#edf3f4;color:#163240}*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 15% 10%,#d5e9e8 0,transparent 34%),#edf3f4}.card{width:min(520px,100%);background:#fff;border:1px solid #d2dddf;border-radius:22px;box-shadow:0 24px 70px #1738471f;padding:36px}.brand{display:flex;align-items:center;gap:12px;font-weight:800;font-size:20px}.mark{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:#e55e2d;color:#fff}.eyebrow{margin:32px 0 8px;color:#4a7278;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}h1{font-size:34px;line-height:1.08;margin:0 0 16px;letter-spacing:-.03em}p{font-size:16px;line-height:1.65;color:#587078}.button{display:block;margin:26px 0 16px;padding:15px 20px;border-radius:12px;background:#e55e2d;color:#fff;text-align:center;text-decoration:none;font-weight:800}.facts{border-top:1px solid #e1e8e9;margin-top:26px;padding-top:20px}.facts p{margin:8px 0;font-size:14px}.note{font-size:13px;color:#71858a}@media(max-width:520px){.card{padding:26px 22px}h1{font-size:29px}}
  </style></head><body><main class="card"><div class="brand"><span class="mark">S</span><span>SteamBOQ</span></div><p class="eyebrow">Free public beta</p><h1>Sign in to build your estimate</h1><p>SteamBOQ is free to use. Sign in with ChatGPT—or create a free ChatGPT account—to calculate steam demand, build preliminary BOQs, compare scenarios, and keep account history.</p><a class="button" href="${signInUrl}" target="_top">Sign in or create free account</a><div class="facts"><p><strong>No ChatGPT Plus plan, subscription, checkout, payment mandate, or GST invoice is required.</strong></p><p>SteamBOQ receives your ChatGPT user ID, email, and available display name so your saved projects and calculation history stay private to your account.</p></div><p class="note">Engineering outputs are preliminary and require independent review by a competent engineer before design, procurement, or construction.</p></main></body></html>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "private, no-store" } });
}

async function route(request, env) {
  const url = new URL(request.url);
  const method = request.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && !writeOriginAllowed(request)) {
    return error("Cross-origin write request rejected.", 403, "origin_rejected");
  }
  try {
    if (url.pathname === "/api/health" && method === "GET") {
      return json({ ok: true, version: APP_VERSION, database: Boolean(env.DB?.prepare), mode: "public_free", payments: false });
    }

    const identity = await getIdentity(request, env);
    if (!identity) return signInRequired(url.pathname.startsWith("/api/"));

    if (url.pathname === "/api/config" && method === "GET") return json(publicConfig(env));
    if (url.pathname === "/api/session" && method === "GET") return json(await sessionFor(env, identity));
    if (url.pathname === "/api/rates" && method === "GET") return json({ ...(await licensedRates(env)), access: "free" }, 200, { "cache-control": "private, max-age=300" });
    if (url.pathname === "/api/feedback" && method === "POST") return await acceptFeedback(request, env, identity);
    if (url.pathname === "/api/projects" && method === "GET") return await listProjects(env, identity);
    if (url.pathname === "/api/projects" && method === "POST") return await saveProject(request, env, identity);
    if (url.pathname.startsWith("/api/projects/") && method === "DELETE") return await deleteProject(env, identity, decodeURIComponent(url.pathname.split("/").pop()));
    if (url.pathname === "/api/history" && method === "GET") return await listCalculationHistory(env, identity);
    if (url.pathname === "/api/history" && method === "POST") return await createCalculationHistory(request, env, identity);
    if (url.pathname === "/api/history" && method === "DELETE") return await clearCalculationHistory(env, identity);
    if (url.pathname.startsWith("/api/history/") && method === "DELETE") return await deleteCalculationHistory(env, identity, decodeURIComponent(url.pathname.split("/").pop()));
    if (url.pathname.startsWith("/api/")) return error("API endpoint not found.", 404, "not_found");

    const file = files[url.pathname] || (url.pathname.includes(".") ? null : files["/index.html"]);
    if (!file) return new Response("Not found", { status: 404 });
    const fileBody = file.encoding === "base64"
      ? Uint8Array.from(atob(file.body), (character) => character.charCodeAt(0))
      : file.body;
    return new Response(fileBody, {
      headers: {
        "content-type": file.type,
        "cache-control": url.pathname.startsWith("/assets/") ? "private, max-age=86400" : "private, no-cache"
      }
    });
  } catch (caught) {
    const status = Number(caught?.status) || 500;
    const message = status >= 500 ? "The service could not complete this request." : caught.message;
    return error(message, status, status >= 500 ? "service_error" : "request_error");
  }
}

export default {
  async fetch(request, env = {}) {
    return secured(await route(request, env));
  }
};
