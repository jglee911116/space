'use client';

import { useLanguage } from '@/i18n/language';
import { OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import { AdditiveBlending, Color, type Group, type ShaderMaterial } from 'three';
import type { FeaturedObject } from '@/constants/space';
import { DAYS_PER_YEAR, KM_PER_LIGHT_YEAR } from '@/constants/space/units';
import { AccretionModel } from '../three/black-holes/accretion-model';
import { CygnusBinary } from '../three/black-holes/cygnus-binary';
import { CrabPulsarWind } from '../three/nebulae/crab-pulsar-wind';
import { CanvasBoundary } from '../three/shared/canvas-boundary';
import { KeyboardOrbitControls } from '../three/shared/keyboard-orbit';
import { zoomedOut } from '../utils/zoom';
import { surfaceVertex, supergiantFragment } from '../three/shared/shaders';
import { NebulaVolume, OBSERVATION_VIEW } from '../three/nebulae/nebula-volume';
import { PleiadesCluster } from '../three/stellar/pleiades-cluster';
import { GlobularCluster } from '../three/stellar/globular-cluster';
import { neutronThermalFragment } from '../three/stellar/neutron-thermal-surface';
import { MagnetarSurface } from '../three/stellar/magnetar-surface';
import { useSurfaceMap } from '../three/shared/use-surface-map';
import { StellarGlow } from '../three/stellar/stellar-glow';
import { STELLAR_DETAIL_EXIT, STELLAR_WIND_RADIUS } from '../three/stellar/stellar-wind-density';
import { StellarWindHalo } from '../three/stellar/stellar-wind-halo';
import { kmPerPixel, type ReportDistanceScale } from '../utils/distance-scale';
import { REALTIME_DAYS_PER_SECOND } from '../utils/orbit';
import { seededRandom } from '../utils/random';

const TAU = Math.PI * 2;
const vertexShader = /* glsl */ `
  varying vec3 particleColor;
  attribute float grain;
  attribute float expanding;
  uniform float expansion;
  uniform float particleScale;
  void main() {
    particleColor = color;
    vec4 view = modelViewMatrix * vec4(position * (1.0 + expanding * expansion), 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = clamp(grain * particleScale * 25.0 / -view.z, 1.0, 21.0);
  }
`;
const fragmentShader = /* glsl */ `
  varying vec3 particleColor;
  uniform float particleOpacity;
  void main() {
    float radius = length(gl_PointCoord - 0.5) * 2.0;
    if (radius > 1.0) discard;
    gl_FragColor = vec4(particleColor, 0.32 * particleOpacity * pow(1.0 - radius, 2.0));
    #include <colorspace_fragment>
  }
`;

function nebulaParticles(object: FeaturedObject) {
  const positions: number[] = [];
  const colors: number[] = [];
  const sizes: number[] = [];
  const expansionMask: number[] = [];
  const random = seededRandom(1911);
  const pale = new Color('#ffd2a0');
  const orange = new Color('#d76d42');
  const dark = new Color('#51394c');
  const aqua = new Color('#54bfd8');
  const tint = new Color();
  const push = (x: number, y: number, z: number, color: Color, size: number, expanding = object.kind === 'supernova-remnant') => {
    positions.push(x, y, z);
    colors.push(color.r, color.g, color.b);
    sizes.push(size);
    expansionMask.push(Number(expanding));
  };
  if (object.kind === 'open-cluster' || object.kind === 'globular-cluster') {
    const globular = object.kind === 'globular-cluster';
    const blue = new Color('#8dbaff');
    const white = new Color('#fff6df');
    const warm = new Color('#e99e64');
    for (let i = 0; i < (globular ? 16_000 : 520); i++) {
      const angle = random() * TAU;
      const vertical = random() * 2 - 1;
      const r = 3 * random() ** (globular ? 2.8 : 0.65);
      const horizontal = r * Math.sqrt(1 - vertical * vertical);
      tint
        .copy(white)
        .lerp(globular ? warm : blue, random() * 0.72)
        .multiplyScalar(0.45 + random() * 0.55);
      push(horizontal * Math.cos(angle), r * vertical, horizontal * Math.sin(angle), tint, globular ? 1 + random() : 2 + 4 * random());
    }
    if (!globular) {
      for (let i = 0; i < 5000; i++) {
        const x = 6 * (random() - 0.5);
        const y = 3.8 * (random() - 0.5);
        const z = 2.1 * (random() - 0.5);
        const ribbon = Math.exp(-14 * (y - 0.45 * Math.sin(2 * x)) ** 2);
        tint.copy(blue).multiplyScalar(ribbon * 0.26);
        push(x, y, z, tint, 3.2);
      }
    }
  } else if (object.kind === 'planetary-nebula') {
    const inner = new Color('#68e1ca');
    const outer = new Color('#e96c43');
    for (let i = 0; i < 21_000; i++) {
      const angle = random() * TAU;
      const halo = i < 5000;
      const r = 1.85 + (random() - 0.5) * 0.53 + 0.1 * Math.sin(9 * angle) + (halo ? 0.48 + random() * 0.53 : 0);
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle) * 0.79;
      const z = (random() - 0.5) * (halo ? 1 : 0.58);
      tint
        .copy(inner)
        .lerp(outer, halo ? 0.87 : Math.min(0.85, Math.max(0, (r - 1.6) * 1.4)))
        .multiplyScalar(halo ? 0.22 : 0.82);
      push(x, y * 0.87 - z * 0.49, y * 0.49 + z * 0.87, tint, 1.5 + random());
    }
  } else if (object.kind === 'pillars') {
    const columns = [
      { x: -1.42, z: -0.32, height: 4.9, width: 0.54, bend: 0.36 },
      { x: -0.36, z: 0.66, height: 3.62, width: 0.31, bend: 0.75 },
      { x: 0.83, z: -0.03, height: 3.03, width: 0.29, bend: 0.53 },
      { x: 1.65, z: -0.6, height: 2.42, width: 0.26, bend: 0.29 },
    ];
    for (const column of columns) {
      for (let i = 0; i < 6500; i++) {
        const t = random();
        const angle = random() * TAU;
        const cap = Math.sqrt(Math.max(0.02, 1 - Math.max(0, (t - 0.88) / 0.12) ** 2));
        const radius = column.width * (1.2 - 0.44 * t + 0.16 * Math.sin(19 * t + 3 * angle)) * cap * Math.sqrt(random());
        const x = column.x + column.bend * t ** 2 + Math.cos(angle) * radius;
        const z = column.z + Math.sin(angle) * radius * 0.83;
        tint
          .copy(dark)
          .lerp(orange, t * 0.65 + random() * 0.22)
          .lerp(pale, t ** 8 * random() * 0.8);
        push(x, t * column.height - 2.32, z, tint, 1.4 + random() * 1.9);
      }
    }
    for (let i = 0; i < 4500; i++) {
      const x = (random() - 0.5) * 8;
      const z = (random() - 0.5) * 2.8;
      tint.copy(dark).lerp(aqua, random() * 0.27);
      push(x, -2.05 - 0.18 * x + (random() - 0.5) * 1.75, z, tint.multiplyScalar(0.45), 3.3);
    }
  } else if (object.kind === 'ring-remnant') {
    for (let ring = 0; ring < 3; ring++) {
      for (let i = 0; i < 5600; i++) {
        const angle = random() * TAU;
        const r = (ring === 0 ? 1.58 : 2.05) + (random() - 0.5) * (ring === 0 ? 0.18 : 0.11);
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        const z = (ring === 0 ? 0 : ring === 1 ? 1.15 : -1.15) + (random() - 0.5) * 0.2;
        const knot = (1 + Math.cos(angle * 19 + 0.3 * Math.sin(angle * 7))) / 2;
        tint
          .copy(orange)
          .lerp(pale, knot ** 5)
          .multiplyScalar(ring === 0 ? 0.85 : 0.23);
        push(x, y * 0.74 - z * 0.67, y * 0.67 + z * 0.74, tint, 0.85 + random() * 1.25);
      }
    }
    for (let i = 0; i < 11_000; i++) {
      const angle = random() * TAU;
      const r = Math.sqrt(random()) * 0.77;
      tint.copy(dark).lerp(aqua, random() * 0.42);
      push(r * Math.cos(angle), r * Math.sin(angle) * 0.69, (random() - 0.5) * (0.95 - r), tint, 1.25 + random(), true);
    }
  } else if (object.kind === 'star-forming-region') {
    // 성단이 박힌 성운은 중심이 밝게 열린 형태, 아니면 공동이 파인 형태.
    const lit = object.embeddedCluster !== undefined;
    const glow = new Color(object.color);
    for (let i = 0; i < 36_000; i++) {
      const angle = random() * TAU;
      const r = Math.sqrt(random()) * 3;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle) * (lit ? 0.82 : 0.64);
      const hole = Math.hypot(x - 0.48, (y - 0.18) * 1.36);
      const ridge = 0.65 + 0.17 * Math.sin(angle * 5 + r * 4);
      if (!lit && (hole < ridge || Math.hypot(x + 0.98, y + 0.46) < 0.43)) continue;
      const cloud = 0.5 + 0.5 * Math.sin(angle * 6 + r * 4 + Math.sin(angle * 3));
      const bright = lit ? Math.exp(-r * 0.75) : Math.exp(-((hole - ridge) ** 2) * 8);
      tint
        .copy(dark)
        .lerp(glow, cloud * 0.73)
        .lerp(lit ? aqua : pale, bright * 0.55)
        .multiplyScalar(0.35 + random() * 0.4);
      push(x, y, (random() - 0.5) * (1.1 + 0.45 * cloud), tint, 1.0 + random() * 2.1);
    }
  } else {
    for (let strand = 0; strand < 110; strand++) {
      const longitude = random() * TAU;
      const latitude = (random() - 0.5) * Math.PI;
      const phase = random() * TAU;
      const stretch = 0.42 + random() * 0.49;
      for (let i = 0; i < 210; i++) {
        const t = i / 210;
        const a = longitude + (t - 0.5) * 1.55;
        const b = latitude + 0.19 * Math.sin(t * 8 + phase);
        const r = 2.95 * stretch + 0.1 * Math.sin(t * 19 + phase) + (random() - 0.5) * 0.1;
        tint
          .copy(orange)
          .lerp(pale, random() * 0.7)
          .multiplyScalar(0.42 + 0.53 * random());
        push(r * Math.cos(a) * Math.cos(b) * 0.84, r * Math.sin(b), r * Math.sin(a) * Math.cos(b) * 0.73, tint, 0.9 + random() * 1.5);
      }
    }
    for (let i = 0; i < 9800; i++) {
      const angle = random() * TAU;
      const vertical = random() * 2 - 1;
      const r = Math.cbrt(random()) * 2.25;
      const horizontal = Math.sqrt(1 - vertical * vertical);
      tint
        .copy(aqua)
        .lerp(dark, random() * 0.67)
        .multiplyScalar(0.34);
      push(r * horizontal * Math.cos(angle) * 0.85, r * vertical, r * horizontal * Math.sin(angle) * 0.78, tint, 1.5 + random() * 2.6);
    }
    for (let i = 0; i < 2400; i++) {
      const angle = random() * TAU;
      const r = 0.28 + random() * 0.34;
      const jet = i < 650;
      const x = jet ? (random() - 0.5) * 0.09 : r * Math.cos(angle);
      const y = jet ? (random() - 0.5) * 2 : (random() - 0.5) * 0.09;
      tint.copy(aqua).lerp(pale, random() * 0.44);
      push(x, y * 0.85 - x * 0.5, jet ? (random() - 0.5) * 0.08 : r * Math.sin(angle), tint, 1.4);
    }
  }
  return { positions: new Float32Array(positions), colors: new Float32Array(colors), sizes: new Float32Array(sizes), expansionMask: new Float32Array(expansionMask) };
}

function Scene({ object, reportDistance, simulationDaysRef, accretionPlaybackTime, paused, daysPerSecond, onLeave }: Props) {
  const pleiades = object.clusterModel === 'pleiades';
  const globular = object.kind === 'globular-cluster';
  const scale = object.kind === 'pillars' || object.kind === 'supernova-remnant' ? 1 : object.extentLightYears / 6;
  const backgroundScale = Math.max(1, scale);
  const image = object.observationImage;
  const southernRing = image?.shape === 'southern-ring';
  const centralRadius =
    object.kind === 'planetary-nebula' && !southernRing && image?.shape !== 'butterfly'
      ? scale * 0.047
      : image?.shape === 'ejecta'
        ? 0.036
        : image?.shape === 'wolf-rayet-ejecta'
          ? scale * 0.088
          : image?.shape === 'light-echo' || image?.shape === 'homunculus' || image?.shape === 'debris-disk' || image?.shape === 'vela-wind'
            ? scale * 0.13
            : 0;
  const texture = useSurfaceMap(image?.file);
  const uniforms = useMemo(() => ({ particleScale: { value: scale }, expansion: { value: 0 }, particleOpacity: { value: texture ? 0.29 : 1 } }), [scale, texture]);
  const particles = useMemo(
    () => (pleiades || globular || object.kind === 'x-ray-binary' || (image && image.shape !== 'crab' && image.shape !== 'ejecta') ? undefined : nebulaParticles(object)),
    [object, pleiades, globular, image],
  );
  const material = useRef<ShaderMaterial>(null);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const start = useRef(0);
  const limit = object.extentLightYears * 5;
  useFrame(({ camera, size }) => {
    if (material.current && object.expansionPerYear) {
      const years = Math.min(simulationDaysRef.current / DAYS_PER_YEAR, 25);
      material.current.uniforms.expansion.value = object.expansionPerYear * years;
    }
    const distance = controls.current?.getDistance();
    if (distance) reportDistance(kmPerPixel(camera, size.height, distance, KM_PER_LIGHT_YEAR));
  });
  return (
    <>
      <Stars radius={46 * backgroundScale} depth={23 * backgroundScale} count={1800} factor={3} saturation={0} fade speed={0} />
      {pleiades && <PleiadesCluster radius={object.extentLightYears * 0.61} />}
      {globular && <GlobularCluster radius={object.extentLightYears * 0.5} profile={object.clusterModel} />}
      {object.kind === 'x-ray-binary' && <CygnusBinary disk={object.accretionDisk} size={object.extentLightYears} days={simulationDaysRef} time={accretionPlaybackTime} />}
      {image && (
        <NebulaVolume
          texture={texture}
          radius={object.extentLightYears * (image.shape === 'crab' ? 0.71 : OBSERVATION_VIEW.radius)}
          shape={image.shape}
          paused={paused}
          daysPerSecond={daysPerSecond}
        />
      )}
      {particles && (
        <points scale={scale} visible={!image || image.shape === 'crab' || image.shape === 'ejecta'}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
            <bufferAttribute attach="attributes-color" args={[particles.colors, 3]} />
            <bufferAttribute attach="attributes-grain" args={[particles.sizes, 1]} />
            <bufferAttribute attach="attributes-expanding" args={[particles.expansionMask, 1]} />
          </bufferGeometry>
          <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} vertexColors transparent depthWrite={false} blending={AdditiveBlending} />
        </points>
      )}
      {object.embeddedCluster?.map(([x, y, z], index) => (
        <group key={index} position={[x * scale, y * scale, z * scale]}>
          <mesh>
            <sphereGeometry args={[scale * 0.024, 16, 12]} />
            <meshBasicMaterial color="#f4f7ff" />
          </mesh>
          <StellarGlow radius={scale * 0.024} color="#c1ddff" />
        </group>
      ))}
      {southernRing && (
        <>
          <group position={[scale * 0.14, scale * 0.07, -scale * 0.06]}>
            <mesh>
              <sphereGeometry args={[scale * 0.054, 16, 12]} />
              <meshBasicMaterial color="#fff7dd" />
            </mesh>
            <StellarGlow radius={scale * 0.054} color="#ffe5b3" />
          </group>
          <group position={[-scale * 0.18, -scale * 0.05, scale * 0.08]}>
            <mesh>
              <sphereGeometry args={[scale * 0.034, 16, 12]} />
              <meshBasicMaterial color="#e1efff" />
            </mesh>
            <StellarGlow radius={scale * 0.062} color="#fca876" strength={0.68} />
          </group>
        </>
      )}
      {image?.shape === 'crab' && <CrabPulsarWind paused={paused} daysPerSecond={daysPerSecond} texture={texture} scale={object.extentLightYears * 0.048} />}
      {object.remnantPulsar && (
        <group position={object.remnantPulsar.position.map((value) => value * object.extentLightYears * OBSERVATION_VIEW.radius) as [number, number, number]}>
          <StellarGlow radius={object.extentLightYears * 0.012} color={object.remnantPulsar.color} strength={0.65} paused={paused} />
          <mesh raycast={() => {}}>
            <sphereGeometry args={[object.extentLightYears * 0.003, 12, 8]} />
            <meshBasicMaterial color={object.remnantPulsar.color} />
          </mesh>
        </group>
      )}
      {centralRadius > 0 && (
        <>
          <mesh>
            <sphereGeometry args={[centralRadius, 16, 12]} />
            <meshBasicMaterial color={image?.shape === 'light-echo' ? '#ffbf79' : '#f7fcff'} />
          </mesh>
          <StellarGlow radius={centralRadius} color={image?.shape === 'light-echo' ? '#ff9d60' : '#a4d8ff'} strength={0.65} />
        </>
      )}
      <OrbitControls
        makeDefault
        ref={controls}
        enablePan={false}
        minDistance={object.extentLightYears * 0.23}
        maxDistance={limit * 1.2}
        zoomSpeed={2.4}
        onStart={() => {
          start.current = controls.current?.getDistance() ?? 0;
        }}
        onEnd={() => {
          const orbit = controls.current;
          if (!orbit) return;
          const distance = orbit.getDistance();
          if (distance >= limit && zoomedOut(start.current, distance)) onLeave(orbit.object.position.clone().sub(orbit.target).normalize().toArray());
        }}
      />
    </>
  );
}

type Props = {
  object: FeaturedObject;
  reportDistance: ReportDistanceScale;
  simulationDaysRef: RefObject<number>;
  accretionPlaybackTime: RefObject<number>;
  daysPerSecond: number;
  paused: boolean;
  onLeave: (direction: [number, number, number]) => void;
};

function StellarModel({ object, simulationDaysRef, daysPerSecond, paused, onLeave }: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const start = useRef(0);
  const beams = useRef<Group>(null);
  const surface = useRef<ShaderMaterial>(null);
  const brightness = useRef(1);
  const thermalSurface = object.thermalSurface;
  const thermalUniforms = useMemo(() => ({ phase: { value: 0.65 } }), []);
  const { photosphere } = object;
  const magnetar = object.kind === 'magnetar';
  const surfaceUniforms = useMemo(
    () =>
      photosphere && {
        surfaceDark: { value: new Color(photosphere.dark) },
        surfaceBright: { value: new Color(photosphere.bright) },
        cellScale: { value: photosphere.cellScale },
        brightness: { value: 1 },
      },
    [photosphere],
  );
  const spinPeriod = object.spinSeconds;
  const pulsePeriod = object.variabilityDays;
  const naturalTurns = (daysPerSecond * 86400) / (spinPeriod ?? 1);
  const beamTurnsPerSecond = daysPerSecond >= 1 ? 1.3 + 0.38 * Math.log10(daysPerSecond) : daysPerSecond === REALTIME_DAYS_PER_SECOND && object.kind === 'pulsar' ? 0.9 : naturalTurns;
  const tilt = Math.PI / 5;
  useFrame((_, delta) => {
    const days = simulationDaysRef.current;
    if (beams.current && !paused) beams.current.rotation.y = (beams.current.rotation.y + Math.min(delta, 0.1) * beamTurnsPerSecond * TAU) % TAU;
    if (surface.current && thermalSurface && !paused) {
      const phase = surface.current.uniforms.phase;
      phase.value = (phase.value + Math.min(delta, 0.1) * beamTurnsPerSecond * TAU) % TAU;
    } else if (surface.current && pulsePeriod) {
      brightness.current = 0.79 + 0.2 * Math.cos(((days % pulsePeriod) / pulsePeriod) * TAU);
      surface.current.uniforms.brightness.value = brightness.current;
    }
  });
  return (
    <>
      <Stars radius={46} depth={23} count={1500} factor={3} saturation={0} fade speed={0} />
      {!magnetar && (
        <>
          <mesh>
            <sphereGeometry args={[1, 64, 40]} />
            {thermalSurface ? (
              <shaderMaterial ref={surface} uniforms={thermalUniforms} vertexShader={surfaceVertex} fragmentShader={neutronThermalFragment} />
            ) : surfaceUniforms ? (
              <shaderMaterial ref={surface} uniforms={surfaceUniforms} vertexShader={surfaceVertex} fragmentShader={supergiantFragment} />
            ) : (
              <meshBasicMaterial color={object.color} />
            )}
          </mesh>
          <StellarGlow radius={1} color={object.color} strength={thermalSurface ? 0.31 : photosphere ? 1.15 : 0.65} brightness={brightness} paused={paused || !photosphere} />
        </>
      )}
      {object.stellarWind && (
        <>
          <NebulaVolume radius={STELLAR_WIND_RADIUS} shape={object.stellarWind.shape} paused={paused} daysPerSecond={daysPerSecond} />
          <StellarWindHalo warm={object.stellarWind.warm} />
        </>
      )}
      {spinPeriod && !thermalSurface && (
        <>
          <group ref={beams}>
            <group rotation-z={tilt}>
              {object.kind === 'magnetar' ? (
                <MagnetarSurface color={object.color} paused={paused} />
              ) : object.kind === 'neutron-star' ? (
                <mesh position={[0, 0.98, 0]}>
                  <sphereGeometry args={[0.16, 24, 16]} />
                  <meshBasicMaterial color="#ebfbff" />
                </mesh>
              ) : (
                [-1, 1].map((side) => (
                  <mesh key={side} position={[0, side * 2.2, 0]} rotation-z={side > 0 ? Math.PI : 0}>
                    <cylinderGeometry args={[0.29, 0.07, 2.5, 32, 1, true]} />
                    <meshBasicMaterial color="#a1dffe" transparent opacity={0.53} depthWrite={false} blending={AdditiveBlending} />
                  </mesh>
                ))
              )}
            </group>
          </group>
        </>
      )}
      <OrbitControls
        makeDefault
        ref={controls}
        enablePan={false}
        minDistance={2.5}
        maxDistance={16}
        onStart={() => {
          start.current = controls.current?.getDistance() ?? 0;
        }}
        onEnd={() => {
          const orbit = controls.current;
          if (!orbit) return;
          const distance = orbit.getDistance();
          if (distance >= STELLAR_DETAIL_EXIT && zoomedOut(start.current, distance)) onLeave(orbit.object.position.clone().sub(orbit.target).normalize().toArray());
        }}
      />
    </>
  );
}

export default function FeaturedObjectScene(props: Props) {
  const { t, catalogText } = useLanguage();
  const { object } = props;
  const blackHole = object.kind === 'black-hole';
  const stellar = object.kind === 'pulsar' || object.kind === 'neutron-star' || object.kind === 'magnetar' || object.kind === 'supergiant';
  const distance = object.extentLightYears * (object.observationImage?.shape === 'hourglass' ? 2.15 : OBSERVATION_VIEW.distance);
  return (
    <CanvasBoundary>
      <Canvas
        camera={{
          position: blackHole
            ? [5, 5.6, 13]
            : stellar
              ? [0, 1.5, object.modelCameraDistance ?? (object.photosphere ? 5.7 : 8)]
              : [distance * OBSERVATION_VIEW.offset[0], distance * (object.kind === 'x-ray-binary' ? 0.38 : OBSERVATION_VIEW.offset[1]), distance],
          fov: 45,
          near: stellar || blackHole ? 0.05 : Math.min(0.05, object.extentLightYears * 0.015),
          far: Math.max(170, object.extentLightYears * 32),
        }}
        // 관측 성운은 화면 전체를 픽셀마다 44~64스텝 raymarch 하므로 레티나에서도 1배로 그린다(부드러운 가스라 차이가 거의 없다).
        dpr={object.observationImage ? 1 : [1, 1.5]}
        role="group"
        aria-label={t('canvas.namedObjectModel', [catalogText(object.name)])}
      >
        <KeyboardOrbitControls />
        {blackHole ? (
          <AccretionModel object={{ color: object.color, visibleJet: true, accretionDisk: object.accretionDisk }} onExit={props.onLeave} time={props.accretionPlaybackTime} />
        ) : stellar ? (
          <StellarModel {...props} />
        ) : (
          <Scene {...props} />
        )}
      </Canvas>
    </CanvasBoundary>
  );
}
