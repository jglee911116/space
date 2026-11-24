import { MathUtils, Vector3 } from 'three';
import { milkyWay, type FeaturedObject, type Galaxy, type StarSystem } from '@/constants/space';
import { LIGHT_YEARS_PER_KPC } from '@/constants/space/units';

export function isNearbySystem(system: StarSystem) {
  return system.id === milkyWay.systemId || system.neighborhood !== undefined;
}

export function neighborhoodOverviewDistance(systems: readonly StarSystem[], aspect: number) {
  const radius = Math.max(1, ...systems.map(({ neighborhood }) => neighborhood?.distanceLightYears ?? 0));
  return (radius * 3.65) / MathUtils.clamp(aspect, 0.35, 1);
}

/** 적경·적위(도)와 거리 → 장면 좌표(x = cosδ cosα, y = sinδ, z = −cosδ sinα). 검증기가 Gaia 위치로 이 변환을 확인한다. */
export function equatorialPosition(rightAscension: number, declination: number, distance: number) {
  const ra = MathUtils.degToRad(rightAscension);
  const dec = MathUtils.degToRad(declination);
  return new Vector3(Math.cos(dec) * Math.cos(ra), Math.sin(dec), -Math.cos(dec) * Math.sin(ra)).multiplyScalar(distance);
}

export function nearbyPositions(systems: readonly StarSystem[]) {
  return systems.filter(isNearbySystem).map((system) => {
    const { distanceLightYears, rightAscension, declination } = system.neighborhood ?? { distanceLightYears: 0, rightAscension: 0, declination: 0 };
    return { system, distanceLightYears, position: equatorialPosition(rightAscension, declination, distanceLightYears) };
  });
}

export function galacticOrbitColor(system: StarSystem) {
  return system.galacticPath?.color ?? system.bodies[0].galacticOrbit?.color ?? system.bodies[0].colors[2];
}

export function featuredGalaxyPosition(object: FeaturedObject, galaxy: Galaxy): [number, number, number] {
  if (!galaxy.skyPosition || object.kind === 'black-hole') return [0, 0, 0];
  const angle = Math.PI / 180;
  const { rightAscension, declination } = galaxy.skyPosition;
  const distance = galaxy.distanceKpc || object.distanceLightYears / LIGHT_YEARS_PER_KPC;
  return [(object.rightAscension - rightAscension) * angle * Math.cos(declination * angle) * distance, 0, -(object.declination - declination) * angle * distance];
}
