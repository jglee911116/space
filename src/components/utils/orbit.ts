import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import type { Body, StarSystem } from '@/constants/space';

export const REALTIME_DAYS_PER_SECOND = 1 / 86_400;
export const MS_PER_DAY = 86_400_000;
/** 궤도 요소의 기준 시점 J2000(2000-01-01 12:00). TT 와 UTC 의 약 1분 차이는 무시한다. */
export const J2000_UTC_MS = Date.UTC(2000, 0, 1, 12);

/** 재생 시간에 맞춰 움직이는 관측 볼륨 형태 — NebulaVolume 애니메이션과 재생 패널 안내가 함께 쓴다. */
export const animatedVolumeShapes: ReadonlySet<string> = new Set(['bipolar-jet', 'shocked-shell', 'dust-spiral', 'edge-on-disk', 'light-echo', 'vela-wind', 'symbiotic-outflow', 'protostar-bows']);

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
  points: Float64Array;
  /** 부모 기준 위치. */
  setLocalPosition(position: Vector3, days: number): Vector3;
  unitsPerAu: number;
};

function referenceRotation(plane: NonNullable<Body['orbit']>['referencePlane'], parentOrientation: Quaternion | undefined) {
  if (!plane) return new Matrix4();
  if (plane === 'parent-equator') return new Matrix4().makeRotationFromQuaternion(parentOrientation ?? new Quaternion());

  const ra = radians(plane.rightAscension);
  const dec = radians(plane.declination);
  const pole = new Vector3(Math.cos(dec) * Math.cos(ra), Math.sin(dec), -Math.cos(dec) * Math.sin(ra)).applyAxisAngle(new Vector3(1, 0, 0), -J2000_OBLIQUITY);
  return new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(NORTH, pole));
}

// 탈출 궤적 선: 기준 시점 30년 전부터 10년 뒤까지(직선이라 lineLoop 로 닫혀도 같은 선 위를 되돌아간다).
const TRAJECTORY_SPAN_DAYS = [-30 * 365.25, 10 * 365.25] as const;

function createTrajectoryMotion(trajectory: NonNullable<Body['trajectory']>, scale: number): Motion {
  const epochDays = (Date.parse(trajectory.epoch) - J2000_UTC_MS) / MS_PER_DAY;
  const [x, y, z] = trajectory.positionAu;
  const [vx, vy, vz] = trajectory.velocityAuPerDay;
  // 황도 (x, y, z) → 장면 (x, z, −y): 황도면은 X/−Z, +Y 가 북쪽.
  const setAt = (position: Vector3, days: number) => {
    const elapsed = days - epochDays;
    return position.set(x + vx * elapsed, z + vz * elapsed, -(y + vy * elapsed)).multiplyScalar(scale);
  };
  const points = new Float64Array(6);
  const point = new Vector3();
  TRAJECTORY_SPAN_DAYS.forEach((offset, index) => setAt(point, epochDays + offset).toArray(points, index * 3));
  return { orientation: new Quaternion(), points, unitsPerAu: scale, setLocalPosition: setAt };
}

function createMotion(body: Body, scale: number, parentOrientation?: Quaternion): Motion {
  if (body.trajectory) return createTrajectoryMotion(body.trajectory, scale);
  if (!body.orbit) {
    return {
      orientation: new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), radians(body.tilt)),
      points: new Float64Array(),
      unitsPerAu: scale,
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

  // Keep the orbit's chord error below a fraction of the rendered body radius,
  // including when tiny bodies on very wide orbits are viewed up close.
  const segments = MathUtils.clamp(Math.ceil(Math.PI * Math.sqrt(axis / (0.16 * body.displayRadius))), 256, 8192);
  const points = new Float64Array(segments * 3);
  const point = new Vector3();
  for (let index = 0; index < segments; index++) {
    setPoint(point, (index * 2 * Math.PI) / segments).toArray(points, index * 3);
  }

  return {
    orientation: new Quaternion().setFromUnitVectors(NORTH, NORTH.clone().applyMatrix4(axialRotation)),
    points,
    unitsPerAu: scale,
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

export function writeOrbitVertices(source: Float64Array, output: Float32Array, origin: Vector3) {
  for (let index = 0; index < source.length; index += 3) {
    output[index] = source[index] - origin.x;
    output[index + 1] = source[index + 1] - origin.y;
    output[index + 2] = source[index + 2] - origin.z;
  }
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

/** Physical center positions in AU, with the display-only satellite scale removed at every parent step. */
export function setOrbitalPositionAu(system: StarSystem, motions: Record<string, Motion>, id: string, position: Vector3, local: Vector3, days: number): Vector3 {
  position.set(0, 0, 0);
  for (let body = system.bodies.find((item) => item.id === id); body; body = system.bodies.find((item) => item.id === body?.parent)) {
    const motion = motions[body.id];
    position.addScaledVector(motion.setLocalPosition(local, days), 1 / motion.unitsPerAu);
  }
  return position;
}
