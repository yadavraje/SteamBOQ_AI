import "./style.css";
import {
  calculateEngineering,
  CONDENSATE_VELOCITY_GUIDE,
  ENGINE_VERSION,
  FITTING_LD,
  FRICTION_FACTOR,
  MATERIAL_ALLOWANCE
} from "./engine.js";

const fieldIds = [
  "projectName", "clientName", "preparedBy", "revision", "method", "productMass",
  "specificHeat", "initialTemp", "finalTemp", "heatingTime", "directHeatLoad",
  "efficiency", "designMargin", "steamPressure", "minimumApproach", "targetVelocity",
  "allowablePressureDrop", "routeLength", "condensateReceiverPressure", "condensateRouteLength",
  "contingency", "elbows", "tees", "reducers", "isolationValves", "prvStations", "trapStations",
  "condElbows", "condTees", "condIsolationValves"
];

let currentResult = null;
let customRates = {};
let scenarios = loadScenarios();
let lastQueuedFeedbackText = "";
let appConfig = null;
let accountSession = { authenticated: false, user: null, access: "free" };
let cloudProjects = [];
let calculationHistory = [];
let accountInitialization = null;
const fallbackRateSnapshot = {
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
  confidence: "C — unverified"
};
let rateSnapshot = loadApprovedRateSnapshot() || { ...fallbackRateSnapshot };

const $ = (id) => document.getElementById(id);
const numericIds = new Set(fieldIds.filter((id) => $(id)?.type === "number"));
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const number = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 });

async function authenticatedFetch(path, options = {}) {
  return fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });
}

function snapshotInputs() {
  return Object.fromEntries(fieldIds.map((id) => [id, numericIds.has(id) ? Number($(id).value) : $(id).value]));
}

function restoreInputs(values) {
  fieldIds.forEach((id) => {
    if (values[id] !== undefined) $(id).value = values[id];
  });
  setMethod(values.method || "product");
}

function rateForPipe(nb, service) {
  const base = service === "steam" ? 365 : 275;
  return Math.round(base * Math.pow(nb / 25, 1.32) / 10) * 10;
}

const rateProfiles = {
  steam_pipe: { steel: 1, supplier: 1, region: .8 },
  cond_pipe: { steel: 1, supplier: 1, region: .8 },
  elbows: { steel: .75, supplier: 1, region: .65 },
  tees: { steel: .75, supplier: 1, region: .65 },
  reducers: { steel: .75, supplier: 1, region: .65 },
  isolation: { steel: .25, supplier: 1, region: .5 },
  cond_elbows: { steel: .75, supplier: 1, region: .65 },
  cond_tees: { steel: .75, supplier: 1, region: .65 },
  cond_isolation: { steel: .25, supplier: 1, region: .5 },
  flange_sets: { steel: .55, supplier: 1, region: .55 },
  prv: { steel: .15, supplier: 1, region: .4 },
  trap: { steel: .15, supplier: 1, region: .4 },
  strainer: { steel: .4, supplier: 1, region: .5 },
  separator: { steel: .45, supplier: 1, region: .55 },
  supports: { steel: .6, supplier: .5, region: 1 },
  steam_insulation: { aluminium: .35, supplier: 1, region: .8 },
  cond_insulation: { aluminium: .35, supplier: 1, region: .8 },
  painting: { supplier: .2, region: 1 },
  ancillaries: { steel: .35, supplier: .7, region: .8 }
};

function adjustedRate(key, baseRate) {
  const profile = rateProfiles[key] || { supplier: 1, region: 1 };
  const steelFactor = 1 + (rateSnapshot.steel_index_change_pct || 0) / 100 * (profile.steel || 0);
  const aluminiumFactor = 1 + (rateSnapshot.aluminium_index_change_pct || 0) / 100 * (profile.aluminium || 0);
  const supplierFactor = 1 + ((rateSnapshot.supplier_factor || 1) - 1) * (profile.supplier || 0);
  const regionFactor = 1 + ((rateSnapshot.region_factor || 1) - 1) * (profile.region || 0);
  return Math.round(baseRate * steelFactor * aluminiumFactor * supplierFactor * regionFactor / 10) * 10;
}

function pricedItem(key, description, specification, unit, qty, defaultRate) {
  const indexedRate = adjustedRate(key, defaultRate);
  const rate = customRates[key] ?? indexedRate;
  return { key, description, specification, unit, qty, rate, indexedRate, isOverride: customRates[key] !== undefined, amount: qty * rate };
}

function buildBoq(input, result) {
  const steamLength = result.materialLengths.steam;
  const condensateLength = result.materialLengths.condensate;
  const supportQty = Math.ceil(input.routeLength / 3) + Math.ceil(input.condensateRouteLength / 3);
  const steamNb = result.steamPipe.nb;
  const condNb = result.condPipe.nb;
  const stationStrainers = input.prvStations + input.trapStations;
  const flangeSets = 2 * (input.isolationValves + input.condIsolationValves);

  return [
    pricedItem("steam_pipe", `CS seamless pipe · DN${steamNb}`, "ASTM A106 Gr.B / Sch. 40, supply & erection", "m", steamLength, rateForPipe(steamNb, "steam")),
    pricedItem("cond_pipe", `CS condensate pipe · DN${condNb}`, "ASTM A106 Gr.B / Sch. 40, supply & erection", "m", condensateLength, rateForPipe(condNb, "cond")),
    pricedItem("elbows", `Long-radius elbows · DN${steamNb}`, "BW / rating to suit line class", "no.", input.elbows, Math.round(380 * Math.pow(steamNb / 40, 1.3))),
    pricedItem("tees", `Equal tees · DN${steamNb}`, "BW / rating to suit line class", "no.", input.tees, Math.round(620 * Math.pow(steamNb / 40, 1.35))),
    pricedItem("reducers", `Concentric reducers · DN${steamNb}`, "BW / final sizes to P&ID", "no.", input.reducers, Math.round(540 * Math.pow(steamNb / 40, 1.25))),
    pricedItem("isolation", `Isolation valves · DN${steamNb}`, "Piston/globe type, flanged", "no.", input.isolationValves, Math.round(5200 * Math.pow(steamNb / 40, 1.45))),
    pricedItem("cond_elbows", `Condensate elbows · DN${condNb}`, "Long-radius BW / line class to be confirmed", "no.", input.condElbows, Math.round(330 * Math.pow(condNb / 40, 1.3))),
    pricedItem("cond_tees", `Condensate tees · DN${condNb}`, "BW / line class to be confirmed", "no.", input.condTees, Math.round(540 * Math.pow(condNb / 40, 1.35))),
    pricedItem("cond_isolation", `Condensate isolation valves · DN${condNb}`, "Piston/globe type, flanged", "no.", input.condIsolationValves, Math.round(4700 * Math.pow(condNb / 40, 1.45))),
    pricedItem("flange_sets", "Valve companion flange sets", "Pair of flanges, gaskets and fasteners", "set", flangeSets, 1850),
    pricedItem("prv", "Pressure-reducing station", "Budget allowance; capacity and vendor sizing TBD", "set", input.prvStations, 48500),
    pricedItem("trap", "Steam-trap station", "Budget allowance; type and discharge capacity TBD", "set", input.trapStations, 28600),
    pricedItem("strainer", "Y-strainers", "Flanged/threaded to station line class", "no.", stationStrainers, 5400),
    pricedItem("separator", "Steam separator package", "One per PRV station; final duty/vendor sizing TBD", "set", input.prvStations, 32500),
    pricedItem("supports", "Pipe supports and guides", "Preliminary 3 m spacing; anchors/stress review TBD", "no.", supportQty, 1750),
    pricedItem("steam_insulation", "Steam insulation with cladding", "Mineral wool + aluminium cladding, thickness TBD", "m", steamLength, 1120),
    pricedItem("cond_insulation", "Condensate insulation with cladding", "Mineral wool + aluminium cladding, thickness TBD", "m", condensateLength, 840),
    pricedItem("painting", "Surface preparation & painting", "Primer and finish coat allowance", "m", steamLength + condensateLength, 310),
    pricedItem("ancillaries", "Piping ancillaries allowance", "Vents, drains, pockets, small-bore take-offs and labels; final P&ID take-off TBD", "lot", 1, 18500)
  ];
}

function calculate({ preserveRates = true } = {}) {
  const input = snapshotInputs();
  if (!preserveRates) customRates = {};
  const engineering = calculateEngineering(input);
  if (!engineering.ok) {
    currentResult = null;
    renderError(engineering.errors, engineering.type);
    clearResults();
    return null;
  }
  const result = { ...engineering, rateSnapshot: { ...rateSnapshot } };
  result.boq = buildBoq(input, result);
  result.subtotal = result.boq.reduce((sum, item) => sum + item.amount, 0);
  result.contingencyAmount = result.subtotal * input.contingency / 100;
  result.total = result.subtotal + result.contingencyAmount;
  currentResult = result;
  render(result);
  return result;
}

function render(result) {
  const { input, steam, steamPipe, condPipe } = result;
  $("proposalTitle").textContent = input.projectName || "Untitled steam project";
  $("proposalClient").textContent = input.clientName || "Client not specified";
  $("proposalRevision").textContent = `Rev ${input.revision || "R0"}`;
  $("proposalDate").textContent = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date());
  $("preparedByFooter").textContent = input.preparedBy || "Not specified";
  $("steamDemand").textContent = number.format(result.steamDemand);
  $("steamBasis").textContent = `at ${input.steamPressure.toFixed(1)} barg · ${steam.t.toFixed(1)}°C sat.`;
  $("steamPipe").textContent = `DN${steamPipe.nb}`;
  $("velocityResult").textContent = `${steamPipe.maximumVelocity.toFixed(1)} m/s maximum`;
  $("proposalValue").textContent = money.format(result.total);
  $("pressureDrop").textContent = `${result.pressureDropBar.toFixed(3)} bar`;
  $("pressureCheck").textContent = `limit ${input.allowablePressureDrop.toFixed(3)} bar`;
  $("contingencyLabel").textContent = `${input.contingency}%`;
  $("contingencyAmount").textContent = money.format(result.contingencyAmount);
  $("boqSubtotal").textContent = money.format(result.subtotal);
  $("grandTotal").textContent = money.format(result.total);
  renderRateDesk();

  const warnings = [];
  if (steamPipe.maximumVelocity > 30) warnings.push(`Maximum steam velocity is ${steamPipe.maximumVelocity.toFixed(1)} m/s; review noise and erosion during detailed design.`);
  if (result.pressureDropBar > input.allowablePressureDrop * 0.9) warnings.push("Selected line is within 10% of the entered pressure-drop limit.");
  if (result.flashFraction > 0.15) warnings.push(`Flash fraction is ${(result.flashFraction * 100).toFixed(1)}%; confirm receiver backpressure and two-phase return design.`);
  renderStatus(warnings);
  renderBoq(result.boq);
  renderBasis(result);
}

function renderStatus(warnings) {
  const status = $("calcStatus");
  const alert = $("alertBox");
  if (warnings.length) {
    status.className = "status warning";
    status.innerHTML = "<span></span> Review required";
    alert.className = "alert";
    alert.innerHTML = `<strong>Engineering review:</strong> ${warnings.join(" ")}`;
  } else {
    status.className = "status okay";
    status.innerHTML = "<span></span> Estimate ready";
    alert.className = "alert hidden";
    alert.textContent = "";
  }
}

function renderError(errors, type = "validation") {
  const status = $("calcStatus");
  status.className = "status error";
  status.innerHTML = `<span></span> ${type === "no_solution" ? "Sizing blocked" : "Inputs incomplete"}`;
  const alert = $("alertBox");
  alert.className = "alert error";
  alert.innerHTML = `<strong>${type === "no_solution" ? "No preliminary solution:" : "Correct these inputs:"}</strong> ${errors.join(" ")}`;
}

function clearResults() {
  $("steamDemand").textContent = "—";
  $("steamBasis").textContent = "calculation blocked";
  $("steamPipe").textContent = "—";
  $("velocityResult").textContent = "no valid size";
  $("proposalValue").textContent = "—";
  $("pressureDrop").textContent = "—";
  $("pressureCheck").textContent = "correct inputs or design basis";
  $("boqBody").innerHTML = "";
  $("boqSubtotal").textContent = "—";
  $("contingencyAmount").textContent = "—";
  $("grandTotal").textContent = "—";
  $("engineeringBasis").innerHTML = "";
  $("assumptionChips").innerHTML = "";
}

function renderBoq(items) {
  $("boqBody").innerHTML = items.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td class="item-desc"><strong>${item.description}</strong><span>${item.specification}${item.isOverride ? " · Manual rate override" : " · Hybrid indexed rate"}</span></td>
      <td>${item.unit}</td>
      <td>${formatQty(item.qty)}</td>
      <td><input class="rate-input no-print-border" data-key="${item.key}" type="number" min="0" step="10" value="${Math.round(item.rate)}" aria-label="Rate for ${item.description}" /></td>
      <td data-amount="${item.key}">${money.format(item.amount)}</td>
    </tr>
  `).join("");

  document.querySelectorAll(".rate-input").forEach((input) => {
    input.addEventListener("change", (event) => {
      customRates[event.target.dataset.key] = Math.max(0, Number(event.target.value) || 0);
      calculate();
    });
  });
}

function renderBasis(result) {
  const { input, steam } = result;
  const basis = [
    ["Calculation method", input.method === "product" ? "Product sensible heating" : "Direct heat load"],
    ["Useful process duty", `${number.format(result.usefulHeatLoad)} kJ/hr`],
    ["Design heat load", `${number.format(result.designHeatLoad)} kJ/hr`],
    ["Saturated steam hfg", `${steam.hfg.toFixed(0)} kJ/kg`],
    ["Specific volume", `${steam.vg.toFixed(3)} m³/kg`],
    ["Volumetric steam flow", `${result.volumetricFlow.toFixed(4)} m³/s`],
    ["Hydraulic length", `${result.equivalentLength.toFixed(1)} m (${input.routeLength.toFixed(1)} m route + ${result.fittingLength.toFixed(1)} m fittings)`],
    ["Outlet steam pressure", `${result.outletPressureBarg.toFixed(3)} barg`],
    ["Estimated flash fraction", `${(result.flashFraction * 100).toFixed(1)}% to ${input.condensateReceiverPressure.toFixed(1)} barg`],
    ["Condensate line", `DN${result.condPipe.nb} · ${result.condPipe.velocity.toFixed(1)} m/s two-phase screen`],
    ["BOQ material lengths", `${result.materialLengths.steam.toFixed(1)} m steam · ${result.materialLengths.condensate.toFixed(1)} m condensate`]
  ];
  $("engineeringBasis").innerHTML = basis.map(([key, value]) => `<div><dt>${key}</dt><dd>${value}</dd></div>`).join("");
  $("assumptionChips").innerHTML = [
    "IAPWS-IF97 property nodes", "Sch. 40 IDs", `Iterative Darcy f = ${FRICTION_FACTOR}`,
    `Le/D: elbow ${FITTING_LD.elbow}, tee ${FITTING_LD.tee}, reducer ${FITTING_LD.reducer}, valve ${FITTING_LD.isolationValve}`,
    `${MATERIAL_ALLOWANCE * 100}% material allowance`, `${CONDENSATE_VELOCITY_GUIDE} m/s condensate screen`,
    `${input.efficiency}% efficiency`, `${input.designMargin}% margin`
  ].map((label) => `<span class="chip">${label}</span>`).join("");
}

function formatQty(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function setMethod(method) {
  $("method").value = method;
  document.querySelectorAll(".segment").forEach((button) => button.classList.toggle("active", button.dataset.method === method));
  $("productFields").classList.toggle("hidden", method !== "product");
  $("directFields").classList.toggle("hidden", method !== "direct");
}

function loadScenarios() {
  try { return JSON.parse(localStorage.getItem("steamboq-scenarios") || "[]"); }
  catch { return []; }
}

function loadApprovedRateSnapshot() {
  try { return JSON.parse(localStorage.getItem("steamboq-approved-rate-snapshot") || "null"); }
  catch { return null; }
}

function persistRateSnapshot() {
  localStorage.setItem("steamboq-approved-rate-snapshot", JSON.stringify(rateSnapshot));
}

function persistScenarios() {
  localStorage.setItem("steamboq-scenarios", JSON.stringify(scenarios));
}

async function saveScenarioToCloud(scenario) {
  if (!accountSession.authenticated || !appConfig?.persistence_enabled) return false;
  const response = await authenticatedFetch("/api/projects", {
    method: "POST",
    body: JSON.stringify({ id: scenario.id, name: scenario.name, payload: scenario })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Cloud project could not be saved.");
  await loadCloudProjects();
  return true;
}

function calculationHistoryPayload(result, triggerType) {
  return {
    project_name: result.input.projectName || "Untitled project",
    method: result.input.method,
    trigger_type: triggerType,
    steam_demand: result.steamDemand,
    steam_pipe_nb: result.steamPipe.nb,
    pressure_drop_bar: result.pressureDropBar,
    boq_value_inr: result.total,
    rate_as_of: rateSnapshot.as_of,
    engine_version: ENGINE_VERSION,
    payload: {
      inputs: snapshotInputs(),
      rates: { ...customRates },
      rateSnapshot: { ...rateSnapshot },
      summary: {
        steamDemand: result.steamDemand,
        pipeNb: result.steamPipe.nb,
        pressureDrop: result.pressureDropBar,
        total: result.total,
        pressure: result.input.steamPressure,
        heatLoad: result.designHeatLoad
      }
    }
  };
}

async function recordCalculationHistory(result, triggerType) {
  if (!accountSession.authenticated || !appConfig?.persistence_enabled) return false;
  const response = await authenticatedFetch("/api/history", {
    method: "POST",
    body: JSON.stringify(calculationHistoryPayload(result, triggerType))
  });
  const saved = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(saved.error || "Calculation history could not be saved.");
  await loadCalculationHistory();
  return true;
}

async function calculateAndRecord() {
  const result = calculate();
  if (!result) return;
  try {
    if (accountInitialization) await accountInitialization;
    const stored = await recordCalculationHistory(result, "calculated");
    $("cloudSaveHint").textContent = stored ? "Calculation stored in your account history." : "Calculation completed. Account history is temporarily unavailable.";
    $("cloudSaveHint").className = stored ? "account-note success" : "account-note warning";
  } catch (caught) {
    $("cloudSaveHint").textContent = `Calculation completed, but history did not sync: ${caught.message}`;
    $("cloudSaveHint").className = "account-note warning";
  }
}

async function saveScenario() {
  if (accountInitialization) await accountInitialization;
  const result = calculate();
  if (!result) return;
  const name = $("scenarioName").value.trim() || `Scenario ${scenarios.length + 1}`;
  const scenario = {
    id: crypto.randomUUID(), name, createdAt: new Date().toISOString(),
    inputs: snapshotInputs(), rates: { ...customRates }, rateSnapshot: { ...rateSnapshot },
    summary: {
      steamDemand: result.steamDemand, pipeNb: result.steamPipe.nb,
      pressureDrop: result.pressureDropBar, total: result.total,
      pressure: result.input.steamPressure, heatLoad: result.designHeatLoad
    }
  };
  scenarios.push(scenario);
  persistScenarios();
  $("scenarioName").value = `Option ${String.fromCharCode(65 + Math.min(scenarios.length, 25))}`;
  renderScenarios();
  if (accountSession.authenticated && appConfig?.persistence_enabled) {
    const failures = [];
    try { await saveScenarioToCloud(scenario); }
    catch (caught) { failures.push(caught.message); }
    try { await recordCalculationHistory(result, "scenario_saved"); }
    catch (caught) { failures.push(caught.message); }
    if (failures.length) {
      $("cloudSaveHint").textContent = `${failures.join(" ")} The local scenario copy is safe in this browser.`;
      $("cloudSaveHint").className = "account-note warning";
    } else {
      $("cloudSaveHint").textContent = "Scenario saved locally, to your account, and to calculation history.";
      $("cloudSaveHint").className = "account-note success";
    }
  }
}

function loadScenario(id) {
  const scenario = scenarios.find((item) => item.id === id);
  if (!scenario) return;
  restoreInputs(scenario.inputs);
  customRates = { ...(scenario.rates || {}) };
  if (scenario.rateSnapshot) rateSnapshot = { ...scenario.rateSnapshot };
  calculate();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteScenario(id) {
  scenarios = scenarios.filter((item) => item.id !== id);
  persistScenarios();
  renderScenarios();
  if (accountSession.authenticated && appConfig?.persistence_enabled) {
    await authenticatedFetch(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    await loadCloudProjects().catch(() => null);
  }
}

function renderScenarios() {
  $("scenarioCount").textContent = `${scenarios.length} saved`;
  const list = $("scenarioList");
  if (!scenarios.length) {
    list.innerHTML = '<div class="empty-state">Save the base case, change an input, then save another case to compare.</div>';
    $("comparisonCard").classList.add("hidden");
    return;
  }
  list.innerHTML = scenarios.map((scenario) => `
    <div class="scenario-item">
      <div><strong>${escapeHtml(scenario.name)}</strong><span>${number.format(scenario.summary.steamDemand)} kg/hr · DN${scenario.summary.pipeNb} · ${money.format(scenario.summary.total)}</span></div>
      <div class="scenario-actions">
        <button class="icon-btn" data-load="${scenario.id}" title="Load scenario" type="button">OPEN</button>
        <button class="icon-btn delete" data-delete="${scenario.id}" title="Delete scenario" type="button">×</button>
      </div>
    </div>
  `).join("");
  list.querySelectorAll("[data-load]").forEach((button) => button.addEventListener("click", () => loadScenario(button.dataset.load)));
  list.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => deleteScenario(button.dataset.delete)));
  renderComparison();
}

function renderComparison() {
  if (!scenarios.length) return;
  $("comparisonCard").classList.remove("hidden");
  $("comparisonHead").innerHTML = `<tr><th>Measure</th>${scenarios.map((s) => `<th>${escapeHtml(s.name)}</th>`).join("")}</tr>`;
  const lowestTotal = Math.min(...scenarios.map((s) => s.summary.total));
  const rows = [
    ["Steam pressure", (s) => `${s.summary.pressure.toFixed(1)} barg`],
    ["Design heat load", (s) => `${number.format(s.summary.heatLoad)} kJ/hr`],
    ["Steam demand", (s) => `${number.format(s.summary.steamDemand)} kg/hr`],
    ["Recommended line", (s) => `DN${s.summary.pipeNb}`],
    ["Pressure drop", (s) => `${s.summary.pressureDrop.toFixed(3)} bar`],
    ["Proposal value", (s) => money.format(s.summary.total), (s) => s.summary.total === lowestTotal]
  ];
  $("comparisonBody").innerHTML = rows.map(([label, formatter, isBest]) => `<tr><td>${label}</td>${scenarios.map((s) => `<td class="${isBest?.(s) ? "best" : ""}">${formatter(s)}</td>`).join("")}</tr>`).join("");
}

function exportCsv() {
  const result = calculate();
  if (!result) return;
  const rows = [
    ["SteamBOQ Preliminary BOQ"],
    ["Project", result.input.projectName], ["Client", result.input.clientName], ["Revision", result.input.revision],
    ["Rate basis", result.rateSnapshot.source_label], ["Rate date", result.rateSnapshot.as_of], ["Rate confidence", result.rateSnapshot.confidence],
    [], ["Item", "Description", "Specification", "Unit", "Quantity", "Rate INR", "Amount INR"],
    ...result.boq.map((item, i) => [i + 1, item.description, item.specification, item.unit, item.qty.toFixed(2), item.rate.toFixed(2), item.amount.toFixed(2)]),
    [], ["", "BOQ subtotal", "", "", "", "", result.subtotal.toFixed(2)],
    ["", `Contingency ${result.input.contingency}%`, "", "", "", "", result.contingencyAmount.toFixed(2)],
    ["", "Preliminary proposal value", "", "", "", "", result.total.toFixed(2)]
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(result.input.projectName || "steamboq")}-boq.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function normalizeRateSnapshot(value) {
  if (!value || typeof value !== "object") return null;
  return {
    mode: value.live ? "live" : (value.mode === "manual" ? "manual" : "review"),
    live: Boolean(value.live),
    as_of: /^\d{4}-\d{2}-\d{2}$/.test(value.as_of || "") ? value.as_of : fallbackRateSnapshot.as_of,
    source_label: String(value.source_label || fallbackRateSnapshot.source_label).slice(0, 160),
    steel_index_change_pct: Number(value.steel_index_change_pct) || 0,
    aluminium_index_change_pct: Number(value.aluminium_index_change_pct) || 0,
    supplier_factor: Math.min(2, Math.max(.5, Number(value.supplier_factor) || 1)),
    region: String(value.region || fallbackRateSnapshot.region).slice(0, 60),
    region_factor: Math.min(1.5, Math.max(.7, Number(value.region_factor) || 1)),
    coverage_pct: Math.min(100, Math.max(0, Number(value.coverage_pct) || 0)),
    confidence: String(value.confidence || fallbackRateSnapshot.confidence).slice(0, 40)
  };
}

function formatRateDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function signedPercent(value) {
  const numeric = Number(value) || 0;
  return `${numeric > 0 ? "+" : ""}${numeric.toFixed(1)}%`;
}

function renderRateDesk() {
  const mode = rateSnapshot.live ? "live" : rateSnapshot.mode === "manual" ? "manual" : "review";
  const labels = {
    live: ["Licensed daily rate feed", "Connected", "Live"],
    manual: ["Manually reviewed hybrid rates", "User reviewed", "Manual"],
    review: ["Review catalogue — not live", "Review catalogue", "Fallback"]
  };
  const [stripTitle, statusLabel, badge] = labels[mode];
  $("ratePulse").className = `rate-pulse ${mode}`;
  $("rateStripTitle").textContent = stripTitle;
  $("rateStripMeta").textContent = `${rateSnapshot.source_label} · ${formatRateDate(rateSnapshot.as_of)} · ${rateSnapshot.region}`;
  $("steelPulse").textContent = signedPercent(rateSnapshot.steel_index_change_pct);
  $("coveragePulse").textContent = `${rateSnapshot.coverage_pct}%`;
  $("confidencePulse").textContent = rateSnapshot.confidence.split("—")[0].trim();
  $("feedStatusDot").className = `feed-dot ${mode}`;
  $("feedStatusLabel").textContent = statusLabel;
  $("feedModeBadge").textContent = badge;
  $("feedSourceLabel").textContent = rateSnapshot.source_label;
  $("rateAsOf").textContent = formatRateDate(rateSnapshot.as_of);
  $("rateCoverage").textContent = `${rateSnapshot.coverage_pct}% verified`;
  $("rateConfidence").textContent = rateSnapshot.confidence;
  $("rateDateInput").value = rateSnapshot.as_of;
  $("steelIndexInput").value = rateSnapshot.steel_index_change_pct;
  $("aluminiumIndexInput").value = rateSnapshot.aluminium_index_change_pct;
  $("supplierFactorInput").value = rateSnapshot.supplier_factor;
  $("rateSourceInput").value = rateSnapshot.source_label;
  const regionOption = [...$("rateRegion").options].find((option) => Number(option.value) === Number(rateSnapshot.region_factor));
  if (regionOption) $("rateRegion").value = regionOption.value;
  $("rateNote").textContent = mode === "live"
    ? `Rates use the licensed feed dated ${formatRateDate(rateSnapshot.as_of)} plus approved supplier and regional factors. Freight, taxes and excluded scope remain additional.`
    : `Rates are ${mode === "manual" ? "manually reviewed" : "unverified review"} values, not market quotations. Connect a licensed feed and supplier catalogue before procurement reliance.`;
}

function openRateDesk() {
  renderRateDesk();
  $("rateOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeRateDesk() {
  $("rateOverlay").classList.add("hidden");
  document.body.style.overflow = "";
}

function applyApprovedRates() {
  const option = $("rateRegion").selectedOptions[0];
  rateSnapshot = normalizeRateSnapshot({
    mode: "manual",
    live: false,
    as_of: $("rateDateInput").value,
    source_label: $("rateSourceInput").value.trim() || "Owner-approved supplier review",
    steel_index_change_pct: $("steelIndexInput").value,
    aluminium_index_change_pct: $("aluminiumIndexInput").value,
    supplier_factor: $("supplierFactorInput").value,
    region: option.textContent,
    region_factor: option.value,
    coverage_pct: 70,
    confidence: "B — owner approved"
  });
  persistRateSnapshot();
  customRates = {};
  calculate();
}

async function initRateFeed() {
  const approved = loadApprovedRateSnapshot();
  try {
    const response = await authenticatedFetch("/api/rates", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error("Rate endpoint unavailable");
    const remote = normalizeRateSnapshot(await response.json());
    if (remote?.live || !approved) rateSnapshot = remote || rateSnapshot;
  } catch {
    rateSnapshot = approved || { ...fallbackRateSnapshot };
  }
  calculate();
}

const feedbackLabels = ["Difficult", "Poor", "Okay", "Good", "Excellent"];

function renderQuickRating() {
  $("quickRating").innerHTML = feedbackLabels.map((label, index) => `<button type="button" data-quick-rating="${index + 1}" title="${index + 1} — ${label}" aria-label="${index + 1} out of 5: ${label}">${index + 1}</button>`).join("");
  $("quickRating").querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      setFeedbackRating(Number(button.dataset.quickRating));
      openFeedback();
    });
  });
}

function setFeedbackRating(value) {
  $("feedbackRatingValue").value = String(value);
  $("feedbackRating").querySelectorAll("button").forEach((button) => {
    const active = Number(button.dataset.rating) === Number(value);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("quickRating").querySelectorAll("button").forEach((button) => button.classList.toggle("active", Number(button.dataset.quickRating) === Number(value)));
  $("ratingError").classList.add("hidden");
}

function setFeedbackCategory(value) {
  $("feedbackCategoryValue").value = value;
  $("feedbackCategories").querySelectorAll("button").forEach((button) => {
    const active = button.dataset.category === value;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $("categoryError").classList.add("hidden");
}

function openFeedback() {
  $("feedbackForm").classList.remove("hidden");
  $("feedbackSuccess").classList.add("hidden");
  $("feedbackOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeFeedback() {
  $("feedbackOverlay").classList.add("hidden");
  document.body.style.overflow = "";
}

function resetFeedbackForm() {
  $("feedbackForm").reset();
  $("feedbackRatingValue").value = "";
  $("feedbackCategoryValue").value = "";
  $("feedbackCharCount").textContent = "0";
  $("feedbackRating").querySelectorAll("button").forEach((button) => { button.classList.remove("active"); button.setAttribute("aria-pressed", "false"); });
  $("feedbackCategories").querySelectorAll("button").forEach((button) => { button.classList.remove("active"); button.setAttribute("aria-pressed", "false"); });
  $("quickRating").querySelectorAll("button").forEach((button) => button.classList.remove("active"));
  ["ratingError", "categoryError", "commentError", "feedbackSubmitStatus"].forEach((id) => $(id).classList.add("hidden"));
  $("copyQueuedFeedback").classList.add("hidden");
  $("copyFeedbackStatus").classList.add("hidden");
  lastQueuedFeedbackText = "";
}

function feedbackCalculationContext() {
  if (!currentResult || !$("feedbackIncludeContext").checked) return null;
  return {
    method: currentResult.input.method,
    steam_pressure_barg: currentResult.input.steamPressure,
    steam_demand_kg_hr: Number(currentResult.steamDemand.toFixed(2)),
    steam_pipe_nb: currentResult.steamPipe.nb,
    condensate_pipe_nb: currentResult.condPipe.nb,
    pressure_drop_bar: Number(currentResult.pressureDropBar.toFixed(4)),
    boq_total_inr: Math.round(currentResult.total),
    rate_mode: currentResult.rateSnapshot.live ? "live" : currentResult.rateSnapshot.mode,
    app_version: ENGINE_VERSION
  };
}

function queueFeedbackLocally(payload, id) {
  try {
    const queued = JSON.parse(localStorage.getItem("steamboq-feedback-outbox") || "[]");
    queued.push({ ...payload, id, queued_at: new Date().toISOString() });
    localStorage.setItem("steamboq-feedback-outbox", JSON.stringify(queued.slice(-25)));
  } catch { /* Storage may be blocked; the UI still reports the server delivery state. */ }
}

function showFeedbackSuccess(message, queued = false) {
  $("feedbackForm").classList.add("hidden");
  $("feedbackSuccess").classList.remove("hidden");
  $("feedbackSuccessMessage").textContent = message;
  $("copyQueuedFeedback").classList.toggle("hidden", !queued);
  $("copyFeedbackStatus").classList.add("hidden");
}

function feedbackShareText(payload, id) {
  const context = payload.calculation_context
    ? `\nCalculation summary: ${JSON.stringify(payload.calculation_context)}`
    : "";
  return `SteamBOQ beta feedback ${id}\nRating: ${payload.rating}/5\nCategory: ${payload.category}\nRole: ${payload.role}\nComment: ${payload.comment}${context}`;
}

async function copyQueuedFeedback() {
  if (!lastQueuedFeedbackText) return;
  const status = $("copyFeedbackStatus");
  try {
    await navigator.clipboard.writeText(lastQueuedFeedbackText);
    status.textContent = "Copied. Paste this message to the SteamBOQ owner.";
  } catch {
    status.textContent = "Copy was blocked by the browser. Select and copy the feedback from your browser outbox before closing.";
  }
  status.classList.remove("hidden");
}

async function submitFeedback(event) {
  event.preventDefault();
  const rating = Number($("feedbackRatingValue").value);
  const category = $("feedbackCategoryValue").value;
  const comment = $("feedbackComment").value.trim();
  const email = $("feedbackEmail").value.trim();
  const followUp = $("feedbackFollowUp").checked;
  let valid = true;

  $("ratingError").classList.toggle("hidden", rating >= 1 && rating <= 5);
  $("categoryError").classList.toggle("hidden", Boolean(category));
  $("commentError").classList.toggle("hidden", comment.length >= 20);
  if (!(rating >= 1 && rating <= 5) || !category || comment.length < 20) valid = false;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) valid = false;
  if (followUp && !email) valid = false;

  const status = $("feedbackSubmitStatus");
  if (!valid) {
    status.textContent = followUp && !email ? "Add a valid email address if you want a follow-up." : "Please complete the highlighted feedback fields.";
    status.classList.remove("hidden");
    return;
  }

  const payload = {
    rating,
    category,
    comment,
    role: $("feedbackRole").value,
    email: followUp ? email : null,
    follow_up_consent: followUp,
    calculation_context: feedbackCalculationContext(),
    website: $("feedbackWebsite").value
  };

  const button = $("submitFeedbackBtn");
  button.disabled = true;
  button.textContent = "Submitting…";
  status.classList.add("hidden");
  try {
    const response = await authenticatedFetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Feedback could not be submitted.");
    if (result.delivery === "browser_queue") {
      queueFeedbackLocally(payload, result.id);
      lastQueuedFeedbackText = feedbackShareText(payload, result.id);
      showFeedbackSuccess("Saved in this browser's private review outbox. Copy the sanitized summary and send it to the SteamBOQ owner.", true);
    } else {
      lastQueuedFeedbackText = "";
      showFeedbackSuccess("Your experience has been sent privately and will help prioritize the next SteamBOQ improvement.");
    }
  } catch (error) {
    status.textContent = error.message || "Feedback could not be submitted. Please try again.";
    status.classList.remove("hidden");
  } finally {
    button.disabled = false;
    button.textContent = "Submit private feedback";
  }
}

function setFormStatus(id, message = "", success = false) {
  const element = $(id);
  element.textContent = message;
  element.classList.toggle("hidden", !message);
  element.classList.toggle("success", Boolean(message) && success);
}

function openAccount() {
  renderFreeAccount();
  $("accountOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeAccount() {
  $("accountOverlay").classList.add("hidden");
  if ($("legalOverlay").classList.contains("hidden")) document.body.style.overflow = "";
}

function freeLegalDocument(kind) {
  const legal = appConfig?.legal || {};
  const operator = escapeHtml(legal.operator || "SteamBOQ");
  const support = legal.support_email
    ? `<a href="mailto:${escapeHtml(legal.support_email)}">${escapeHtml(legal.support_email)}</a>`
    : "Use the in-app feedback form for product feedback; an operator support address is not yet published.";
  if (kind === "privacy") {
    return `<p class="legal-meta">Privacy version ${escapeHtml(legal.privacy_version || "2026-09-free-beta")} · Operator: ${operator}</p>
      <h3>1. Data received</h3><p>After you sign in, SteamBOQ receives your ChatGPT user identifier, email address and available display name. It also stores projects you save, deliberate calculation-history records and feedback you submit.</p>
      <h3>2. How data is used</h3><p>Account data identifies your private project records, operates the estimator, prevents misuse and supports product improvement. SteamBOQ does not sell account data, show advertising, or collect card, bank, payment-mandate or subscription details in this free edition.</p>
      <h3>3. Project confidentiality</h3><p>Projects and calculation history are separated by authenticated user ID. Do not enter confidential client names, plant secrets or restricted prices unless your organization has approved their use in an online beta service.</p>
      <h3>4. Feedback and follow-up</h3><p>Feedback is stored with your account ID. A contact email is retained only when you request follow-up; if you do not enter another address, your signed-in email is used.</p>
      <h3>5. Retention and requests</h3><p>The latest 50 calculation-history records are retained per account unless you clear them sooner. Account, saved-project and feedback records are retained for operating and improving the public beta. Contact ${support} for access, correction or deletion requests, subject to technical and lawful retention requirements.</p>
      <h3>6. Security</h3><p>SteamBOQ uses host-provided authentication, encrypted transport, server-side ownership checks and same-origin write controls. No online service can guarantee absolute security.</p>`;
  }
  return `<p class="legal-meta">Terms version ${escapeHtml(legal.terms_version || "2026-09-free-beta")} · Operator: ${operator}</p>
    <h3>1. Free beta access</h3><p>SteamBOQ is currently offered without a subscription fee. This edition has no checkout, payment mandate or GST invoice. Access and reasonable usage limits may change with notice as the beta develops.</p>
    <h3>2. Service scope</h3><p>SteamBOQ provides preliminary saturated-steam demand, line-sizing screening and budgetary BOQ estimates. It is decision support—not a final design, quotation, guarantee, certification or substitute for engineering judgment.</p>
    <h3>3. Engineering responsibility</h3><p>You are responsible for input quality and independent review by a competent engineer. Final work requires approved process data, P&amp;ID and line lists, code checks, detailed hydraulics, water-hammer and condensate review, equipment selection, stress analysis, site routing and vendor confirmation.</p>
    <h3>4. Rates and estimates</h3><p>Rates are indicative unless the displayed source, date, coverage and confidence have been verified for your procurement. Taxes, freight, duties, civil, electrical and excluded scope may be additional. An estimate is not an offer capable of acceptance.</p>
    <h3>5. Acceptable use</h3><p>Keep account access secure. Do not probe other users’ data, bypass limits, disrupt availability, upload unlawful content or present an unreviewed estimate as an approved engineering design.</p>
    <h3>6. Availability and liability</h3><p>The beta may change, impose fair-use limits or be unavailable. To the extent permitted by law, ${operator} is not responsible for decisions made from unverified inputs, rates or preliminary outputs.</p>
    <h3>7. Contact</h3><p>${support}</p>`;
}

function renderLegal(kind = "terms") {
  const privacy = kind === "privacy";
  $("legalTitle").textContent = privacy ? "Privacy notice" : "Terms of use";
  $("showTerms").classList.toggle("active", !privacy);
  $("showPrivacy").classList.toggle("active", privacy);
  $("legalContent").innerHTML = freeLegalDocument(kind);
}

function openLegal(kind = "terms") {
  renderLegal(kind);
  $("legalOverlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeLegal() {
  $("legalOverlay").classList.add("hidden");
  if ($("accountOverlay").classList.contains("hidden")) document.body.style.overflow = "";
}

function renderCloudProjects() {
  $("cloudProjectCount").textContent = String(cloudProjects.length);
  const list = $("cloudProjectList");
  if (!cloudProjects.length) {
    list.innerHTML = '<div class="empty-state">No account projects yet. Save a scenario from the estimator to add one.</div>';
    return;
  }
  list.innerHTML = cloudProjects.map((project) => `
    <div class="cloud-project">
      <div><strong>${escapeHtml(project.name)}</strong><span>Updated ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(project.updated_at))}</span></div>
      <div class="scenario-actions"><button class="icon-btn" data-cloud-load="${project.id}" type="button">OPEN</button><button class="icon-btn delete" data-cloud-delete="${project.id}" type="button">×</button></div>
    </div>`).join("");
  list.querySelectorAll("[data-cloud-load]").forEach((button) => button.addEventListener("click", () => loadCloudProject(button.dataset.cloudLoad)));
  list.querySelectorAll("[data-cloud-delete]").forEach((button) => button.addEventListener("click", () => deleteCloudProject(button.dataset.cloudDelete)));
}

async function loadCloudProjects() {
  if (!accountSession.authenticated || !appConfig?.persistence_enabled) {
    cloudProjects = [];
    renderCloudProjects();
    return;
  }
  const response = await authenticatedFetch("/api/projects");
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Cloud projects could not be loaded.");
  cloudProjects = Array.isArray(result.projects) ? result.projects.filter((project) => project.payload) : [];
  renderCloudProjects();
}

function loadCloudProject(id) {
  const project = cloudProjects.find((item) => item.id === id);
  if (!project?.payload) return;
  const scenario = { ...project.payload, id: project.id, name: project.name };
  const index = scenarios.findIndex((item) => item.id === scenario.id);
  if (index >= 0) scenarios[index] = scenario;
  else scenarios.push(scenario);
  persistScenarios();
  renderScenarios();
  closeAccount();
  loadScenario(scenario.id);
}

async function deleteCloudProject(id) {
  const response = await authenticatedFetch(`/api/projects/${encodeURIComponent(id)}`, { method: "DELETE" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return setFormStatus("accountStatus", result.error || "Cloud project could not be deleted.");
  await loadCloudProjects();
  setFormStatus("accountStatus", "Cloud project deleted. Any separate browser copy remains available.", true);
}

function formatHistoryDate(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function renderCalculationHistory() {
  $("historyCount").textContent = String(calculationHistory.length);
  $("clearHistoryBtn").disabled = calculationHistory.length === 0;
  const list = $("historyList");
  if (!calculationHistory.length) {
    list.innerHTML = '<div class="empty-state">No recorded calculations yet. Press Calculate or save a scenario to create the first history record.</div>';
    return;
  }
  list.innerHTML = calculationHistory.map((record) => `
    <article class="history-record">
      <div class="history-record-head">
        <div><strong>${escapeHtml(record.project_name)}</strong><span>${formatHistoryDate(record.created_at)} · ${record.trigger_type === "scenario_saved" ? "Scenario saved" : "Calculated"}</span></div>
        <span class="history-method">${record.method === "direct" ? "Direct load" : "Product heating"}</span>
      </div>
      <div class="history-metrics">
        <span><b>${number.format(record.steam_demand)}</b> kg/hr</span>
        <span><b>DN${Number(record.steam_pipe_nb)}</b> steam</span>
        <span><b>${Number(record.pressure_drop_bar).toFixed(3)}</b> bar drop</span>
        <span><b>${money.format(record.boq_value_inr)}</b> BOQ</span>
      </div>
      <div class="history-foot"><span>Rate ${escapeHtml(record.rate_as_of || "unverified")} · Engine ${escapeHtml(record.engine_version)}</span><div class="scenario-actions"><button class="icon-btn" data-history-open="${record.id}" type="button">OPEN</button><button class="icon-btn" data-history-copy="${record.id}" type="button">COPY</button><button class="icon-btn" data-history-export="${record.id}" type="button">CSV</button><button class="icon-btn delete" data-history-delete="${record.id}" aria-label="Delete history record" type="button">×</button></div></div>
    </article>`).join("");
  list.querySelectorAll("[data-history-open]").forEach((button) => button.addEventListener("click", () => openHistoryRecord(button.dataset.historyOpen)));
  list.querySelectorAll("[data-history-copy]").forEach((button) => button.addEventListener("click", () => openHistoryRecord(button.dataset.historyCopy, true)));
  list.querySelectorAll("[data-history-export]").forEach((button) => button.addEventListener("click", () => exportHistoryRecord(button.dataset.historyExport)));
  list.querySelectorAll("[data-history-delete]").forEach((button) => button.addEventListener("click", () => deleteHistoryRecord(button.dataset.historyDelete)));
}

async function loadCalculationHistory() {
  if (!accountSession.authenticated || !appConfig?.persistence_enabled) {
    calculationHistory = [];
    renderCalculationHistory();
    return;
  }
  const response = await authenticatedFetch("/api/history");
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Calculation history could not be loaded.");
  calculationHistory = Array.isArray(result.history) ? result.history.filter((record) => record.payload?.inputs) : [];
  renderCalculationHistory();
}

function openHistoryRecord(id, duplicate = false) {
  const record = calculationHistory.find((item) => item.id === id);
  if (!record?.payload?.inputs) return;
  restoreInputs(record.payload.inputs);
  customRates = { ...(record.payload.rates || {}) };
  if (record.payload.rateSnapshot) rateSnapshot = normalizeRateSnapshot(record.payload.rateSnapshot) || rateSnapshot;
  if (duplicate) {
    const copyName = `${record.project_name} – copy`.slice(0, 100);
    $("projectName").value = copyName;
    $("scenarioName").value = copyName;
  }
  calculate();
  closeAccount();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function exportHistoryRecord(id) {
  const record = calculationHistory.find((item) => item.id === id);
  if (!record) return;
  const rows = [
    ["SteamBOQ Calculation History"],
    ["Recorded", record.created_at],
    ["Project", record.project_name],
    ["Method", record.method],
    ["Trigger", record.trigger_type],
    ["Steam demand kg/hr", record.steam_demand],
    ["Steam pipe DN", record.steam_pipe_nb],
    ["Pressure drop bar", record.pressure_drop_bar],
    ["Preliminary BOQ value INR", record.boq_value_inr],
    ["Rate date", record.rate_as_of || "Unverified"],
    ["Engine version", record.engine_version],
    [],
    ["Input", "Value"],
    ...Object.entries(record.payload?.inputs || {})
  ];
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${slugify(record.project_name || "steamboq")}-history.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function deleteHistoryRecord(id) {
  const response = await authenticatedFetch(`/api/history/${encodeURIComponent(id)}`, { method: "DELETE" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return setFormStatus("historyStatus", result.error || "History record could not be deleted.");
  await loadCalculationHistory();
  setFormStatus("historyStatus", "History record deleted.", true);
}

async function clearCalculationHistory() {
  if (!calculationHistory.length || !window.confirm("Delete all calculation history for this account? Saved projects will not be affected.")) return;
  const response = await authenticatedFetch("/api/history", { method: "DELETE" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) return setFormStatus("historyStatus", result.error || "Calculation history could not be cleared.");
  await loadCalculationHistory();
  setFormStatus("historyStatus", "Calculation history cleared. Saved projects were not deleted.", true);
}

function renderFreeAccount() {
  if (!appConfig || !accountSession.authenticated) return;
  const displayName = accountSession.user.name || accountSession.user.email.split("@")[0] || "SteamBOQ user";
  $("accountHeaderStatus").textContent = `${accountSession.user.email} · free public access`;
  $("accountBtn").textContent = displayName;
  $("signedInName").textContent = displayName;
  $("signedInEmail").textContent = accountSession.user.email;
  $("accountProjectLimit").textContent = `${appConfig.project_limit} cloud projects`;
  $("historyLimit").textContent = `Latest ${appConfig.history_limit || 50}`;
  renderCloudProjects();
  renderCalculationHistory();
}

async function initializeFreeAccount() {
  try {
    const [configResponse, sessionResponse] = await Promise.all([
      authenticatedFetch("/api/config"),
      authenticatedFetch("/api/session")
    ]);
    if (configResponse.status === 401 || sessionResponse.status === 401) {
      window.location.assign("/signin-with-chatgpt?return_to=%2F");
      return;
    }
    appConfig = await configResponse.json();
    accountSession = await sessionResponse.json();
    if (!configResponse.ok || !sessionResponse.ok || !accountSession.authenticated) throw new Error("Your account could not be verified.");
    const [projectLoad, historyLoad] = await Promise.allSettled([loadCloudProjects(), loadCalculationHistory()]);
    const loadFailures = [projectLoad, historyLoad].filter((result) => result.status === "rejected");
    if (loadFailures.length) setFormStatus("accountStatus", "Some account records could not be loaded. Please refresh and try again.");
    renderFreeAccount();
    $("cloudSaveHint").textContent = "New scenarios are saved locally and to your free account.";
    $("cloudSaveHint").className = "account-note success";
  } catch (caught) {
    appConfig = { mode: "public_free", persistence_enabled: false, payments_enabled: false, project_limit: 25, history_limit: 50, legal: {} };
    $("accountHeaderStatus").textContent = "Account service unavailable";
    setFormStatus("accountStatus", caught.message || "Your free account could not be initialized.");
  }
}

document.querySelectorAll(".segment").forEach((button) => {
  button.addEventListener("click", () => { setMethod(button.dataset.method); calculate(); });
});
fieldIds.filter((id) => !["method"].includes(id)).forEach((id) => {
  $(id).addEventListener("change", () => calculate());
});
$("calculateBtn").addEventListener("click", calculateAndRecord);
$("saveScenarioBtn").addEventListener("click", saveScenario);
$("exportCsvBtn").addEventListener("click", exportCsv);
$("printBtn").addEventListener("click", () => { calculate(); window.print(); });
$("rateDeskBtn").addEventListener("click", openRateDesk);
$("openRatesInline").addEventListener("click", openRateDesk);
$("closeRateDesk").addEventListener("click", closeRateDesk);
$("rateOverlay").addEventListener("click", (event) => { if (event.target === $("rateOverlay")) closeRateDesk(); });
$("applyRatesBtn").addEventListener("click", applyApprovedRates);
$("clearRateOverridesBtn").addEventListener("click", () => { customRates = {}; calculate(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeRateDesk(); });
$("feedbackBtn").addEventListener("click", openFeedback);
$("openFeedbackInline").addEventListener("click", openFeedback);
$("closeFeedback").addEventListener("click", closeFeedback);
$("feedbackOverlay").addEventListener("click", (event) => { if (event.target === $("feedbackOverlay")) closeFeedback(); });
$("feedbackRating").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => setFeedbackRating(Number(button.dataset.rating))));
$("feedbackCategories").querySelectorAll("button").forEach((button) => button.addEventListener("click", () => setFeedbackCategory(button.dataset.category)));
$("feedbackComment").addEventListener("input", () => { $("feedbackCharCount").textContent = String($("feedbackComment").value.length); $("commentError").classList.add("hidden"); });
$("feedbackForm").addEventListener("submit", submitFeedback);
$("copyQueuedFeedback").addEventListener("click", copyQueuedFeedback);
$("sendAnotherFeedback").addEventListener("click", () => { resetFeedbackForm(); $("feedbackForm").classList.remove("hidden"); $("feedbackSuccess").classList.add("hidden"); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeFeedback(); });
$("accountBtn").addEventListener("click", openAccount);
$("closeAccount").addEventListener("click", closeAccount);
$("accountOverlay").addEventListener("click", (event) => { if (event.target === $("accountOverlay")) closeAccount(); });
$("clearHistoryBtn").addEventListener("click", clearCalculationHistory);
document.querySelectorAll("[data-legal]").forEach((button) => button.addEventListener("click", () => openLegal(button.dataset.legal)));
$("showTerms").addEventListener("click", () => renderLegal("terms"));
$("showPrivacy").addEventListener("click", () => renderLegal("privacy"));
$("closeLegal").addEventListener("click", closeLegal);
$("legalOverlay").addEventListener("click", (event) => { if (event.target === $("legalOverlay")) closeLegal(); });
document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!$("legalOverlay").classList.contains("hidden")) closeLegal();
  else if (!$("accountOverlay").classList.contains("hidden")) closeAccount();
});

renderQuickRating();
renderScenarios();
calculate();
accountInitialization = initializeFreeAccount();
accountInitialization.finally(() => initRateFeed());
