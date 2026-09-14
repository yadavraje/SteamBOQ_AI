import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateEngineering,
  interpolateSteam,
  PIPES,
  steamPipeHydraulics,
  validateEngineeringInput
} from "../src/engine.js";

const baseInput = {
  method: "product",
  productMass: 500,
  specificHeat: 3.8,
  initialTemp: 30,
  finalTemp: 121,
  heatingTime: 1,
  directHeatLoad: 180000,
  efficiency: 85,
  designMargin: 10,
  steamPressure: 3,
  minimumApproach: 5,
  targetVelocity: 25,
  allowablePressureDrop: 0.8,
  routeLength: 80,
  condensateReceiverPressure: 0,
  condensateRouteLength: 52,
  contingency: 5,
  elbows: 10,
  tees: 2,
  reducers: 2,
  isolationValves: 4,
  prvStations: 1,
  trapStations: 1,
  condElbows: 8,
  condTees: 1,
  condIsolationValves: 2
};

test("IAPWS benchmark nodes and density interpolation remain accurate", () => {
  assert.equal(interpolateSteam(0.5).vg, 1.149858);
  assert.equal(interpolateSteam(3).hfg, 2132.97);
  const quarterBar = interpolateSteam(0.25);
  const iapwsQuarterBarVg = 1.3614417;
  assert.ok(Math.abs(quarterBar.vg / iapwsQuarterBarVg - 1) < 0.002);
});

test("default energy balance and steam demand reproduce the benchmark", () => {
  const result = calculateEngineering({ ...baseInput });
  assert.equal(result.ok, true);
  assert.equal(result.usefulHeat, 172900);
  assert.ok(Math.abs(result.designHeatLoad - 223752.9412) < 0.001);
  assert.ok(Math.abs(result.steamDemand - 104.9020573) < 0.0001);
  assert.equal(result.steamPipe.nb, 32);
  assert.equal(result.condPipe.nb, 20);
  assert.ok(result.pressureDropBar > 0 && result.pressureDropBar < baseInput.allowablePressureDrop);
});

test("compressible iteration produces a higher drop than inlet-density-only Darcy", () => {
  const pipe = PIPES.find((item) => item.nb === 32);
  const hydraulic = steamPipeHydraulics({
    massFlowKgHr: 104.9020573,
    inletPressureBarg: 3,
    routeLengthM: 80,
    counts: { elbows: 10, tees: 2, reducers: 2, isolationValves: 4 },
    pipe
  });
  const inlet = interpolateSteam(3);
  const density = 1 / inlet.vg;
  const diameterM = pipe.id / 1000;
  const areaM2 = Math.PI * diameterM ** 2 / 4;
  const velocity = 104.9020573 / 3600 / density / areaM2;
  const constantDensityDrop = 0.02 * (hydraulic.equivalentLengthM / diameterM) * (density * velocity ** 2 / 2) / 100000;
  assert.ok(hydraulic.pressureDropBar > constantDensityDrop);
});

test("hydraulic and BOQ material lengths are kept separate", () => {
  const result = calculateEngineering({ ...baseInput, elbows: 0, tees: 0, reducers: 0, isolationValves: 0 });
  assert.equal(result.ok, true);
  assert.equal(result.equivalentLength, 80);
  assert.equal(result.materialLengths.steam, 84);
  assert.equal(result.materialLengths.condensate, 54.6);
});

test("invalid margins, velocities, counts and pressure limits are blocked", () => {
  assert.ok(validateEngineeringInput({ ...baseInput, designMargin: -150 }).some((message) => message.includes("Design margin")));
  assert.ok(validateEngineeringInput({ ...baseInput, targetVelocity: 0 }).some((message) => message.includes("velocity")));
  assert.ok(validateEngineeringInput({ ...baseInput, elbows: 1.5 }).some((message) => message.includes("elbows")));
  assert.ok(validateEngineeringInput({ ...baseInput, allowablePressureDrop: 3 }).some((message) => message.includes("Allowable pressure drop")));
});

test("minimum steam-to-product temperature approach is enforced", () => {
  const result = calculateEngineering({ ...baseInput, finalTemp: 142 });
  assert.equal(result.ok, false);
  assert.equal(result.type, "validation");
  assert.ok(result.errors.some((message) => message.includes("below")));
});

test("an excessive duty returns no solution instead of DN200 approval", () => {
  const result = calculateEngineering({
    ...baseInput,
    method: "direct",
    directHeatLoad: 100000000,
    efficiency: 100,
    designMargin: 0
  });
  assert.equal(result.ok, false);
  assert.equal(result.type, "no_solution");
  assert.ok(result.errors[0].includes("No Sch. 40 pipe"));
});

test("receiver backpressure reduces the predicted flash fraction", () => {
  const atmospheric = calculateEngineering({ ...baseInput });
  const pressurized = calculateEngineering({ ...baseInput, condensateReceiverPressure: 1 });
  assert.equal(atmospheric.ok, true);
  assert.equal(pressurized.ok, true);
  assert.ok(pressurized.flashFraction < atmospheric.flashFraction);
});
