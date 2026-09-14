export const STEAM_TABLE = [
  { p: 0, t: 99.974, hf: 418.991, hfg: 2256.541, vg: 1.673295 },
  { p: 0.5, t: 111.614, hf: 468.200, hfg: 2225.312, vg: 1.149858 },
  { p: 1, t: 120.420, hf: 505.572, hfg: 2200.972, vg: 0.880277 },
  { p: 1.5, t: 127.588, hf: 536.093, hfg: 2180.650, vg: 0.715146 },
  { p: 2, t: 133.676, hf: 562.099, hfg: 2162.996, vg: 0.603287 },
  { p: 2.5, t: 138.994, hf: 584.881, hfg: 2147.257, vg: 0.522339 },
  { p: 3, t: 143.732, hf: 605.236, hfg: 2132.970, vg: 0.460957 },
  { p: 3.5, t: 148.017, hf: 623.692, hfg: 2119.827, vg: 0.412757 },
  { p: 4, t: 151.936, hf: 640.617, hfg: 2107.609, vg: 0.373871 },
  { p: 4.5, t: 155.554, hf: 656.277, hfg: 2096.160, vg: 0.341815 },
  { p: 5, t: 158.919, hf: 670.876, hfg: 2085.359, vg: 0.314918 },
  { p: 5.5, t: 162.067, hf: 684.568, hfg: 2075.114, vg: 0.292018 },
  { p: 6, t: 165.029, hf: 697.476, hfg: 2065.353, vg: 0.272276 },
  { p: 6.5, t: 167.828, hf: 709.700, hfg: 2056.015, vg: 0.255075 },
  { p: 7, t: 170.482, hf: 721.319, hfg: 2047.052, vg: 0.239950 },
  { p: 7.5, t: 173.009, hf: 732.400, hfg: 2038.423, vg: 0.226543 },
  { p: 8, t: 175.420, hf: 743.000, hfg: 2030.096, vg: 0.214573 },
  { p: 8.5, t: 177.729, hf: 753.165, hfg: 2022.041, vg: 0.203819 },
  { p: 9, t: 179.943, hf: 762.937, hfg: 2014.233, vg: 0.194104 },
  { p: 9.5, t: 182.072, hf: 772.350, hfg: 2006.651, vg: 0.185281 },
  { p: 10, t: 184.123, hf: 781.434, hfg: 1999.277, vg: 0.177232 },
  { p: 10.5, t: 186.102, hf: 790.217, hfg: 1992.093, vg: 0.169858 },
  { p: 11, t: 188.015, hf: 798.721, hfg: 1985.087, vg: 0.163077 },
  { p: 11.5, t: 189.866, hf: 806.967, hfg: 1978.244, vg: 0.156820 },
  { p: 12, t: 191.660, hf: 814.973, hfg: 1971.554, vg: 0.151027 }
];

export const PIPES = [
  { nb: 15, id: 15.8 }, { nb: 20, id: 20.9 }, { nb: 25, id: 26.6 },
  { nb: 32, id: 35.1 }, { nb: 40, id: 40.9 }, { nb: 50, id: 52.5 },
  { nb: 65, id: 62.7 }, { nb: 80, id: 77.9 }, { nb: 100, id: 102.3 },
  { nb: 125, id: 128.2 }, { nb: 150, id: 154.1 }, { nb: 200, id: 202.7 }
];

export const ENGINE_VERSION = "engineering-beta-v5";
export const MATERIAL_ALLOWANCE = 0.05;
export const FRICTION_FACTOR = 0.02;
export const CONDENSATE_VELOCITY_GUIDE = 15;

// Preliminary equivalent-length ratios (Le/D). Fitting geometry and valve type
// must be confirmed during detailed design.
export const FITTING_LD = {
  elbow: 30,
  tee: 60,
  reducer: 20,
  isolationValve: 340
};

const countFields = [
  "elbows", "tees", "reducers", "isolationValves", "prvStations", "trapStations",
  "condElbows", "condTees", "condIsolationValves"
];

const numericFields = [
  "efficiency", "designMargin", "steamPressure", "minimumApproach", "targetVelocity",
  "allowablePressureDrop", "routeLength", "condensateReceiverPressure", "condensateRouteLength",
  "contingency", ...countFields
];

export function interpolateSteam(pressureBarg) {
  if (!Number.isFinite(pressureBarg) || pressureBarg < 0 || pressureBarg > 12) return null;
  const upperIndex = STEAM_TABLE.findIndex((row) => row.p >= pressureBarg);
  if (upperIndex <= 0) return { ...STEAM_TABLE[0], p: pressureBarg };
  const high = STEAM_TABLE[upperIndex];
  const low = STEAM_TABLE[upperIndex - 1];
  const ratio = (pressureBarg - low.p) / (high.p - low.p);
  const vaporDensity = (1 / low.vg) + ((1 / high.vg) - (1 / low.vg)) * ratio;
  return {
    p: pressureBarg,
    t: low.t + (high.t - low.t) * ratio,
    hf: low.hf + (high.hf - low.hf) * ratio,
    hfg: low.hfg + (high.hfg - low.hfg) * ratio,
    vg: 1 / vaporDensity
  };
}

function validPositive(value) {
  return Number.isFinite(value) && value > 0;
}

export function validateEngineeringInput(input) {
  const errors = [];
  const methodFields = input.method === "direct"
    ? ["directHeatLoad"]
    : ["productMass", "specificHeat", "initialTemp", "finalTemp", "heatingTime"];

  for (const field of [...numericFields, ...methodFields]) {
    if (!Number.isFinite(input[field])) errors.push(`Enter a valid number for ${field}.`);
  }
  if (errors.length) return errors;

  if (!['product', 'direct'].includes(input.method)) errors.push("Select a supported calculation method.");
  if (input.method === "product" && input.finalTemp <= input.initialTemp) errors.push("Final temperature must be higher than initial temperature.");
  if (input.method === "product" && (!validPositive(input.productMass) || !validPositive(input.specificHeat) || !validPositive(input.heatingTime))) {
    errors.push("Product mass, specific heat and heating time must be positive.");
  }
  if (input.method === "direct" && !validPositive(input.directHeatLoad)) errors.push("Direct heat load must be positive.");
  if (input.efficiency < 1 || input.efficiency > 100) errors.push("Thermal efficiency must be between 1% and 100%.");
  if (input.designMargin < 0 || input.designMargin > 100) errors.push("Design margin must be between 0% and 100%.");
  if (input.steamPressure < 0.1 || input.steamPressure > 12) errors.push("Steam pressure must be between 0.1 and 12 barg for this model.");
  if (input.minimumApproach < 1 || input.minimumApproach > 30) errors.push("Minimum temperature approach must be between 1°C and 30°C.");
  if (input.targetVelocity < 10 || input.targetVelocity > 40) errors.push("Target steam velocity must be between 10 and 40 m/s.");
  if (!validPositive(input.routeLength)) errors.push("Steam route length must be positive.");
  if (!validPositive(input.condensateRouteLength)) errors.push("Condensate route length must be positive.");
  if (!validPositive(input.allowablePressureDrop) || input.allowablePressureDrop >= input.steamPressure) {
    errors.push("Allowable pressure drop must be positive and lower than the steam supply pressure.");
  }
  if (input.condensateReceiverPressure < 0 || input.condensateReceiverPressure >= input.steamPressure) {
    errors.push("Condensate receiver pressure must be at least 0 barg and lower than the steam supply pressure.");
  }
  if (input.contingency < 0 || input.contingency > 30) errors.push("BOQ contingency must be between 0% and 30%.");
  for (const field of countFields) {
    if (!Number.isInteger(input[field]) || input[field] < 0) errors.push(`${field} must be a whole number of zero or more.`);
  }

  const steam = interpolateSteam(input.steamPressure);
  if (input.method === "product" && steam && input.finalTemp > steam.t - input.minimumApproach) {
    errors.push(`Final temperature must be at least ${input.minimumApproach.toFixed(1)}°C below the ${steam.t.toFixed(1)}°C steam saturation temperature.`);
  }
  return [...new Set(errors)];
}

function fittingLength(pipeDiameterM, counts) {
  const totalLd = counts.elbows * FITTING_LD.elbow
    + counts.tees * FITTING_LD.tee
    + counts.reducers * FITTING_LD.reducer
    + counts.isolationValves * FITTING_LD.isolationValve;
  return { totalLd, lengthM: totalLd * pipeDiameterM };
}

export function steamPipeHydraulics({
  massFlowKgHr,
  inletPressureBarg,
  routeLengthM,
  counts,
  pipe,
  segments = 80
}) {
  const diameterM = pipe.id / 1000;
  const areaM2 = Math.PI * diameterM ** 2 / 4;
  const massFlowKgS = massFlowKgHr / 3600;
  const fittings = fittingLength(diameterM, counts);
  const equivalentLengthM = routeLengthM + fittings.lengthM;
  const segmentLengthM = equivalentLengthM / segments;
  let pressureBarg = inletPressureBarg;
  let maximumVelocity = 0;

  for (let index = 0; index < segments; index += 1) {
    const properties = interpolateSteam(pressureBarg);
    if (!properties || pressureBarg <= 0) {
      return { feasible: false, pressureDropBar: inletPressureBarg, outletPressureBarg: 0, maximumVelocity, equivalentLengthM, fittingLengthM: fittings.lengthM, totalLd: fittings.totalLd };
    }
    const density = 1 / properties.vg;
    const velocity = massFlowKgS / density / areaM2;
    maximumVelocity = Math.max(maximumVelocity, velocity);
    const incrementBar = FRICTION_FACTOR * (segmentLengthM / diameterM) * (density * velocity ** 2 / 2) / 100000;
    if (!Number.isFinite(incrementBar) || incrementBar >= pressureBarg) {
      return { feasible: false, pressureDropBar: inletPressureBarg, outletPressureBarg: 0, maximumVelocity, equivalentLengthM, fittingLengthM: fittings.lengthM, totalLd: fittings.totalLd };
    }
    pressureBarg -= incrementBar;
  }

  const outletProperties = interpolateSteam(pressureBarg);
  const outletVelocity = outletProperties ? massFlowKgS * outletProperties.vg / areaM2 : maximumVelocity;
  maximumVelocity = Math.max(maximumVelocity, outletVelocity);
  return {
    feasible: true,
    pressureDropBar: inletPressureBarg - pressureBarg,
    outletPressureBarg: pressureBarg,
    inletVelocity: massFlowKgS * interpolateSteam(inletPressureBarg).vg / areaM2,
    outletVelocity,
    maximumVelocity,
    equivalentLengthM,
    fittingLengthM: fittings.lengthM,
    totalLd: fittings.totalLd
  };
}

export function sizeSteamPipe({ massFlowKgHr, inletPressureBarg, routeLengthM, counts, targetVelocity, allowablePressureDrop }) {
  const candidates = PIPES.map((pipe) => ({
    ...pipe,
    ...steamPipeHydraulics({ massFlowKgHr, inletPressureBarg, routeLengthM, counts, pipe })
  }));
  const selected = candidates.find((candidate) => candidate.feasible
    && candidate.maximumVelocity <= targetVelocity
    && candidate.pressureDropBar <= allowablePressureDrop);
  return selected
    ? { ok: true, selected, candidates }
    : { ok: false, largest: candidates[candidates.length - 1], candidates };
}

export function sizeCondensatePipe(volumetricFlowM3S, targetVelocity = CONDENSATE_VELOCITY_GUIDE) {
  const candidates = PIPES.map((pipe) => {
    const diameterM = pipe.id / 1000;
    const areaM2 = Math.PI * diameterM ** 2 / 4;
    return { ...pipe, velocity: volumetricFlowM3S / areaM2 };
  });
  const selected = candidates.find((candidate) => candidate.velocity <= targetVelocity);
  return selected
    ? { ok: true, selected, candidates }
    : { ok: false, largest: candidates[candidates.length - 1], candidates };
}

export function calculateEngineering(input) {
  const errors = validateEngineeringInput(input);
  if (errors.length) return { ok: false, type: "validation", errors };

  const steam = interpolateSteam(input.steamPressure);
  const usefulHeat = input.method === "product"
    ? input.productMass * input.specificHeat * (input.finalTemp - input.initialTemp)
    : input.directHeatLoad;
  const usefulHeatLoad = input.method === "product" ? usefulHeat / input.heatingTime : usefulHeat;
  const designHeatLoad = usefulHeatLoad / (input.efficiency / 100) * (1 + input.designMargin / 100);
  const steamDemand = designHeatLoad / steam.hfg;
  const volumetricFlow = steamDemand * steam.vg / 3600;
  const fittingCounts = {
    elbows: input.elbows,
    tees: input.tees,
    reducers: input.reducers,
    isolationValves: input.isolationValves
  };
  const steamSizing = sizeSteamPipe({
    massFlowKgHr: steamDemand,
    inletPressureBarg: input.steamPressure,
    routeLengthM: input.routeLength,
    counts: fittingCounts,
    targetVelocity: input.targetVelocity,
    allowablePressureDrop: input.allowablePressureDrop
  });
  if (!steamSizing.ok) {
    const largest = steamSizing.largest;
    const diagnostic = largest.feasible
      ? `DN${largest.nb} reaches ${largest.maximumVelocity.toFixed(1)} m/s and ${largest.pressureDropBar.toFixed(3)} bar drop.`
      : `DN${largest.nb} cannot retain positive outlet pressure in this preliminary model.`;
    return {
      ok: false,
      type: "no_solution",
      errors: [`No Sch. 40 pipe through DN${largest.nb} satisfies ${input.targetVelocity.toFixed(1)} m/s and ${input.allowablePressureDrop.toFixed(3)} bar. ${diagnostic} Split the load, shorten the route, raise supply pressure, or complete detailed sizing.`],
      diagnostics: steamSizing
    };
  }

  const receiverSteam = interpolateSteam(input.condensateReceiverPressure);
  const flashFraction = Math.max(0, Math.min(1, (steam.hf - receiverSteam.hf) / receiverSteam.hfg));
  const liquidCondensateFlow = steamDemand * (1 - flashFraction) / 3600 / 950;
  const flashSteamFlow = steamDemand * flashFraction * receiverSteam.vg / 3600;
  const condensateVolumetricFlow = liquidCondensateFlow + flashSteamFlow;
  const condensateSizing = sizeCondensatePipe(condensateVolumetricFlow);
  if (!condensateSizing.ok) {
    return {
      ok: false,
      type: "no_solution",
      errors: [`No Sch. 40 condensate line through DN${condensateSizing.largest.nb} meets the ${CONDENSATE_VELOCITY_GUIDE} m/s two-phase screening guide. Complete detailed condensate return sizing.`],
      diagnostics: condensateSizing
    };
  }

  const steamPipe = steamSizing.selected;
  const condPipe = condensateSizing.selected;
  return {
    ok: true,
    input,
    steam,
    receiverSteam,
    usefulHeat,
    usefulHeatLoad,
    designHeatLoad,
    steamDemand,
    volumetricFlow,
    steamPipe,
    condPipe,
    equivalentLength: steamPipe.equivalentLengthM,
    fittingLength: steamPipe.fittingLengthM,
    pressureDropBar: steamPipe.pressureDropBar,
    outletPressureBarg: steamPipe.outletPressureBarg,
    flashFraction,
    condensateVolumetricFlow,
    materialLengths: {
      steam: input.routeLength * (1 + MATERIAL_ALLOWANCE),
      condensate: input.condensateRouteLength * (1 + MATERIAL_ALLOWANCE)
    }
  };
}
