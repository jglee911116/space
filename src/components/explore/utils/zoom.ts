import type { StarSystem } from '@/constants/space';
import { AU_PER_KPC } from '@/constants/space/units';
import { UNITS_PER_AU } from './orbit';

export type ZoomScale = 'system' | 'outer' | 'distant' | 'oort';

function blend(distance: number, from: number, to: number) {
  const progress = Math.min(1, Math.max(0, Math.log(distance / from) / Math.log(to / from)));
  return progress * progress * (3 - 2 * progress);
}

export function oortRadius(system: StarSystem) {
  return (system.oortCloud?.outerEdgeAu[1] ?? 0) * UNITS_PER_AU;
}

export function zoomLayers(system: StarSystem, distance: number, distantOverview: number) {
  const outer = system.outerRegion;
  const cloud = system.oortCloud;
  const radius = oortRadius(system);
  const cloudStart = cloud ? cloud.innerEdgeAu[0] * UNITS_PER_AU * 0.65 : Infinity;
  const cloudFull = Math.max(cloudStart * 2, radius * 0.4);
  const cloudOpacity = cloud ? blend(distance, cloudStart, cloudFull) : 0;
  const systemOpacity = 1 - cloudOpacity;
  const outerStart = system.overviewDistance * 1.65;
  const beltOpacity = outer ? blend(distance, outerStart * 0.72, outer.overviewDistance) * (1 - blend(distance, outer.overviewDistance * 1.5, distantOverview)) : 0;
  const scale: ZoomScale = cloudOpacity >= 0.5 ? 'oort' : outer && distance >= distantOverview * 0.5 ? 'distant' : outer && distance >= outerStart ? 'outer' : 'system';

  return { scale, cloudOpacity, systemOpacity, beltOpacity };
}

export type ZoomHandoff = {
  distanceAu: number;
  direction: [number, number, number];
};

export function galaxyHandoffDistanceAu(system: StarSystem) {
  return Math.max((system.oortCloud?.outerEdgeAu[1] ?? 0) * 3.8, 0.00185 * AU_PER_KPC);
}

// Overlapping zoom ranges prevent a single wheel gesture from immediately reversing the handoff.
export const GALAXY_EXIT_KPC = 130;
export const GALAXY_ENTRY_KPC = 103;

/** Compact systems skip the empty space between the outer orbit and the galaxy scene. */
export function systemHandoffDistanceAu(system: StarSystem, farOverview: number) {
  return system.oortCloud ? galaxyHandoffDistanceAu(system) : (farOverview * 3.2) / UNITS_PER_AU;
}

export const GALACTIC_CENTER_ENTRY_KPC = 0.09;
export const GALACTIC_CENTER_RETURN_KPC = 0.16;
// The black-hole shader is a visual model, so its camera distance has no physical unit.
export const BLACK_HOLE_EXIT_DISTANCE = 12;
export const BLACK_HOLE_ENTRY_DISTANCE = 8;

export const EXTERNAL_SYSTEM_ENTRY_KPC = 0.14;
export const EXTERNAL_SYSTEM_RETURN_KPC = 0.25;

export const LOCAL_GROUP_EXIT_KPC = 2900;
export const LOCAL_GROUP_ENTRY_MILLION_LIGHT_YEARS = 7;
