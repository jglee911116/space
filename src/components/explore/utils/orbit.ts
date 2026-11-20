import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import type { Body, StarSystem } from '@/constants/space';

export const REALTIME_DAYS_PER_SECOND = 1 / 86_400;

export function elapsedSimulationDays(delta: number, daysPerSecond: number) {
  return (daysPerSecond === REALTIME_DAYS_PER_SECOND ? delta : Math.min(delta, 0.1)) * daysPerSecond;
}

export function rotationPhase(days: number, periodDays?: number) {
  return periodDays ? ((days % periodDays) / periodDays) * 2 * Math.PI : 0;
}

export function stellarTextureShear(days: number, equatorDays?: number, poleDays?: number) {
  if (!equatorDays || !poleDays || equatorDays === poleDays) return 0;
  // Renew the visual pattern rather than winding the same granules into bands indefinitely.
  const maxShear = 0.35;
  const relativeTurnsPerDay = 1 / poleDays - 1 / equatorDays;
  return maxShear * Math.sin(rotationPhase(days, maxShear / relativeTurnsPerDay));
}

export const UNITS_PER_AU = 10;
// 위성 궤도는 확대 표시된 모행성 안으로 파묻히므로 거리만 늘려 표시한다(달 → 지구 반지름의 약 2.7배).
const SATELLITE_DISTANCE_SCALE = 30;
const J2000_OBLIQUITY = MathUtils.degToRad(23.43928);
const NORTH = new Vector3(0, 1, 0);
const radians = MathUtils.degToRad;

export type Motion = {
  /** 자전축 방향(궤도면 + 기울기). */
  orientation: Quaternion;
  /** 부모 기준 궤도선. 궤도가 없으면 빈 배열. */
  points: Vector3[];
  /** 부모 기준 위치. */
  setLocalPosition(position: Vector3, days: number): Vector3;
};

function referenceRotation(plane: NonNullable<Body['orbit']>['referencePlane'], parentOrientation: Quaternion | undefined) {
  if (!plane) return new Matrix4();
  if (plane === 'parent-equator') return new Matrix4().makeRotationFromQuaternion(parentOrientation ?? new Quaternion());

  const ra = radians(plane.rightAscension);
  const dec = radians(plane.declination);
  const pole = new Vector3(Math.cos(dec) * Math.cos(ra), Math.sin(dec), -Math.cos(dec) * Math.sin(ra)).applyAxisAngle(new Vector3(1, 0, 0), -J2000_OBLIQUITY);
  return new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(NORTH, pole));
}

function createMotion(body: Body, scale: number, parentOrientation?: Quaternion): Motion {
  if (!body.orbit) {
    return {
      orientation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), radians(body.tilt)),
      points: [],
      setLocalPosition: (position) => position.set(0, 0, 0),
    };
  }

  const { axisAu, eccentricity, inclination, meanLongitude, perihelionLongitude, ascendingNode, periodDays } = body.orbit;
  const axis = axisAu * scale;
  // 황도면은 X/−Z, +Y 가 북쪽.
  const orbitalPlane = referenceRotation(body.orbit.referencePlane, parentOrientation)
    .multiply(new Matrix4().makeRotationY(radians(ascendingNode)))
    .multiply(new Matrix4().makeRotationX(radians(inclination)));
  const rotation = orbitalPlane.clone().multiply(new Matrix4().makeRotationY(radians(perihelionLongitude - ascendingNode)));
  const axialRotation = orbitalPlane.multiply(new Matrix4().makeRotationX(radians(body.tilt)));
  const minorAxis = axis * Math.sqrt(1 - eccentricity ** 2);
  const meanAtEpoch = radians(meanLongitude - perihelionLongitude);

  function setPoint(position: Vector3, anomaly: number) {
    return position.set(axis * (Math.cos(anomaly) - eccentricity), 0, -minorAxis * Math.sin(anomaly)).applyMatrix4(rotation);
  }

  return {
    orientation: new Quaternion().setFromUnitVectors(NORTH, NORTH.clone().applyMatrix4(axialRotation)),
    points: Array.from({ length: 257 }, (_, index) => setPoint(new Vector3(), (index * Math.PI) / 128)),
    setLocalPosition(position, days) {
      const cycle = Math.PI * 2;
      const mean = MathUtils.euclideanModulo(meanAtEpoch + ((days % periodDays) * cycle) / periodDays + Math.PI, cycle) - Math.PI;
      let anomaly = eccentricity > 0.8 ? mean + 0.85 * eccentricity * Math.sign(mean) : mean;
      for (let iteration = 0; iteration < 12; iteration++) {
        const correction = (anomaly - eccentricity * Math.sin(anomaly) - mean) / (1 - eccentricity * Math.cos(anomaly));
        anomaly -= correction;
        if (Math.abs(correction) < 1e-12) break;
      }
      return setPoint(position, anomaly);
    },
  };
}

/** 위성 = 부모가 항성이 아닌 천체. */
export function isSatellite(system: StarSystem, body: Body) {
  return body.parent !== null && system.bodies.find((other) => other.id === body.parent)?.kind !== 'star';
}

export function createMotions(system: StarSystem) {
  const bodies = new Map(system.bodies.map((body) => [body.id, body]));
  const satelliteScales = new Map<string, number>();

  for (const body of system.bodies) {
    if (!body.parent || !body.orbit) continue;
    const parent = bodies.get(body.parent);
    if (!parent || parent.kind === 'star') continue;

    // Increase the entire moon system together to clear the enlarged planet and its rings.
    const outerRadius = parent.displayRadius * Math.max(1, ...(parent.rings ?? []).map((ring) => ring.outer));
    const moonRadius = body.displayRadius * Math.max(1, ...(body.shape ?? []));
    const periapsis = UNITS_PER_AU * body.orbit.axisAu * (1 - body.orbit.eccentricity);
    const scale = (outerRadius * 1.15 + moonRadius) / periapsis;
    satelliteScales.set(parent.id, Math.max(satelliteScales.get(parent.id) ?? SATELLITE_DISTANCE_SCALE, scale));
  }

  const motions: Record<string, Motion> = {};
  for (const body of system.bodies) {
    const scale = body.parent ? (satelliteScales.get(body.parent) ?? 1) : 1;
    const parentOrientation = body.parent ? motions[body.parent]?.orientation : undefined;
    motions[body.id] = createMotion(body, UNITS_PER_AU * scale, parentOrientation);
  }
  return motions;
}

/** 부모 위치를 거슬러 더한 장면 좌표. */
export function setWorldPosition(system: StarSystem, motions: Record<string, Motion>, id: string, position: Vector3, days: number): Vector3 {
  const body = system.bodies.find((other) => other.id === id);
  motions[id].setLocalPosition(position, days);
  if (!body?.parent) return position;
  return position.add(setWorldPosition(system, motions, body.parent, new Vector3(), days));
}
