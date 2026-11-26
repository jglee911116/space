import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three';
import type { Body, StarSystem, TrajectorySample } from '@/constants/space';

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

/** 표본 사이 직선 보간한 일심 황도 위치(AU). 첫 표본 이전은 첫 위치, 마지막 이후는 마지막 구간 속도로 외삽한다. */
export function setTrajectoryPositionAu(samples: readonly TrajectorySample[], days: number, out: Vector3) {
  let high = 1;
  if (days >= samples[samples.length - 1][0]) high = samples.length - 1;
  else if (days > samples[0][0]) {
    let low = 0;
    high = samples.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (samples[middle][0] <= days) low = middle;
      else high = middle;
    }
  }
  const [t0, x0, y0, z0] = samples[high - 1];
  const [t1, x1, y1, z1] = samples[high];
  // shortcut: 발사 전에는 첫 표본(발사 다음 날 위치)에 머문다 — 발사 전 시각에 숨기려면 표시 여부 필드가 필요하다.
  const u = Math.max(0, (days - t0) / (t1 - t0));
  return out.set(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, z0 + (z1 - z0) * u);
}

function createTrajectoryMotion(samples: readonly TrajectorySample[], scale: number): Motion {
  // 황도 (x, y, z) → 장면 (x, z, −y): 황도면은 X/−Z, +Y 가 북쪽.
  const toScene = (position: Vector3) => position.set(position.x, position.z, -position.y).multiplyScalar(scale);
  const points = new Float64Array(samples.length * 3);
  const point = new Vector3();
  samples.forEach(([, x, y, z], index) => toScene(point.set(x, y, z)).toArray(points, index * 3));
  return { orientation: new Quaternion(), points, unitsPerAu: scale, setLocalPosition: (position, days) => toScene(setTrajectoryPositionAu(samples, days, position)) };
}

function createMotion(body: Body, scale: number, parentOrientation?: Quaternion): Motion {
  if (body.trajectory) return createTrajectoryMotion(body.trajectory.samples, scale);
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

  // 확대된 모행성(고리 포함) 밖으로 위성 궤도를 밀어내는 배율.
  const clearScale = (body: Body, parent: Body, orbit: NonNullable<Body['orbit']>) => {
    const outerRadius = parent.displayRadius * Math.max(1, ...(parent.rings ?? []).map((ring) => ring.outer));
    const moonRadius = body.displayRadius * Math.max(1, ...(body.shape ?? []));
    // 탐사선은 초점 카메라(표시 반지름의 수 배 거리)가 모행성 안으로 들어가지 않게 더 띄운다.
    const clearance = body.kind === 'spacecraft' ? 1.6 : 1.15;
    return (outerRadius * clearance + moonRadius) / (UNITS_PER_AU * orbit.axisAu * (1 - orbit.eccentricity));
  };
  for (const body of system.bodies) {
    // 탐사선(저궤도 망원경 등)은 위성계 전체 배율을 키우지 않는다 — 달이 멀리 밀려나지 않게.
    if (!body.parent || !body.orbit || body.kind === 'spacecraft') continue;
    const parent = bodies.get(body.parent);
    if (!parent || parent.kind === 'star') continue;
    // Increase the entire moon system together to clear the enlarged planet and its rings.
    satelliteScales.set(parent.id, Math.max(satelliteScales.get(parent.id) ?? SATELLITE_DISTANCE_SCALE, clearScale(body, parent, body.orbit)));
  }

  const motions: Record<string, Motion> = {};
  for (const body of system.bodies) {
    const parent = body.parent ? bodies.get(body.parent) : undefined;
    const familyScale = body.parent ? (satelliteScales.get(body.parent) ?? 1) : 1;
    // 위성계 배율로도 모행성 안에 파묻히는 탐사선만 따로 밖으로 꺼낸다.
    const scale = body.kind === 'spacecraft' && parent && parent.kind !== 'star' && body.orbit ? Math.max(familyScale, clearScale(body, parent, body.orbit)) : familyScale;
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
