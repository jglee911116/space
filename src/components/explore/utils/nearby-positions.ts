import { MathUtils, Vector3 } from 'three';
import { milkyWay, type FeaturedObject, type Galaxy, type StarSystem } from '@/constants/space';
import { AU_PER_KPC, KM_PER_AU, KM_PER_LIGHT_YEAR } from '@/constants/space/units';

export function isNearbySystem(system: StarSystem) {
  return system.id === milkyWay.systemId || system.neighborhood !== undefined;
}

export function nearbyPositions(systems: readonly StarSystem[]) {
  return systems.filter(isNearbySystem).map((system) => {
    const { distanceLightYears, rightAscension, declination } = system.neighborhood ?? { distanceLightYears: 0, rightAscension: 0, declination: 0 };
    const ra = MathUtils.degToRad(rightAscension);
    const dec = MathUtils.degToRad(declination);
    const position = new Vector3(Math.cos(dec) * Math.cos(ra), Math.sin(dec), -Math.cos(dec) * Math.sin(ra)).multiplyScalar(distanceLightYears);
    return { system, distanceLightYears, position };
  });
}

export function galacticOrbitColor(system: StarSystem) {
  return system.galacticPath?.color ?? system.bodies[0].galacticOrbit?.color ?? system.bodies[0].colors[2];
}

export function featuredGalaxyPosition(object: FeaturedObject, galaxy: Galaxy): [number, number, number] {
  if (!galaxy.skyPosition || object.kind === 'black-hole') return [0, 0, 0];
  const angle = Math.PI / 180;
  const { rightAscension, declination } = galaxy.skyPosition;
  const distance = galaxy.distanceKpc || (object.distanceLightYears * KM_PER_LIGHT_YEAR) / (AU_PER_KPC * KM_PER_AU);
  return [(object.rightAscension - rightAscension) * angle * Math.cos(declination * angle) * distance, 0, -(object.declination - declination) * angle * distance];
}
