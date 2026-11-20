'use client';

import { useLanguage } from '@/i18n/language';
import { Line, OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useCallback, useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import { AdditiveBlending, Color, Vector3, type Group, type ShaderMaterial } from 'three';
import { featuredObjects, type FeaturedObject } from '@/constants/space';
import { DAYS_PER_YEAR, KM_PER_LIGHT_YEAR } from '@/constants/space/units';
import styles from '../explore.module.scss';
import { AccretionModel } from '../three/accretion-model';
import { CanvasBoundary } from '../three/canvas-boundary';
import { surfaceVertex, supergiantFragment } from '../three/shaders';
import { NebulaVolume } from '../three/nebula-volume';
import { useSurfaceMap } from '../three/use-surface-map';
import { StellarGlow } from '../three/stellar-glow';
import { kmPerPixel, type ReportDistanceScale } from '../utils/distance-scale';
import { REALTIME_DAYS_PER_SECOND } from '../utils/orbit';

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
  let seed = 1911;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }
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

type PlaceChildButton = (x: number, y: number, visible: boolean) => void;

// 중심에서 확대해 들어갈 하위 천체(예: 게 성운 → 게 펄서).
function childObject(object: FeaturedObject) {
  return featuredObjects.find(({ parentObjectId }) => parentObjectId === object.id);
}

function Scene({ object, reportDistance, simulationDaysRef, onLeave, placeChildButton }: Props & { placeChildButton: PlaceChildButton }) {
  const center = useMemo(() => new Vector3(), []);
  const scale = object.kind === 'pillars' || object.kind === 'supernova-remnant' ? 1 : object.extentLightYears / 6;
  const image = object.observationImage;
  const texture = useSurfaceMap(image?.file);
  const uniforms = useMemo(() => ({ particleScale: { value: scale }, expansion: { value: 0 }, particleOpacity: { value: texture ? 0.29 : 1 } }), [scale, texture]);
  const particles = useMemo(() => nebulaParticles(object), [object]);
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
    center.set(0, 0, 0).project(camera);
    placeChildButton((center.x + 1) * size.width * 0.5, (1 - center.y) * size.height * 0.5, Math.abs(center.z) <= 1);
  });
  return (
    <>
      <Stars radius={46 * scale} depth={23 * scale} count={1800} factor={3} saturation={0} fade speed={0} />
      {texture && image && <NebulaVolume texture={texture} radius={object.extentLightYears * (image.shape === 'crab' ? 0.71 : 0.61)} shape={image.shape} />}
      <points scale={scale} visible={!texture || image?.shape === 'crab' || image?.shape === 'ejecta'}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[particles.positions, 3]} />
          <bufferAttribute attach="attributes-color" args={[particles.colors, 3]} />
          <bufferAttribute attach="attributes-grain" args={[particles.sizes, 1]} />
          <bufferAttribute attach="attributes-expanding" args={[particles.expansionMask, 1]} />
        </bufferGeometry>
        <shaderMaterial ref={material} uniforms={uniforms} vertexShader={vertexShader} fragmentShader={fragmentShader} vertexColors transparent depthWrite={false} blending={AdditiveBlending} />
      </points>
      {object.embeddedCluster?.map(([x, y, z], index) => (
        <group key={index} position={[x * scale, y * scale, z * scale]}>
          <mesh>
            <sphereGeometry args={[scale * 0.024, 16, 12]} />
            <meshBasicMaterial color="#f4f7ff" />
          </mesh>
          <StellarGlow radius={scale * 0.024} color="#c1ddff" />
        </group>
      ))}
      {(object.kind === 'supernova-remnant' || object.kind === 'planetary-nebula') && (
        <>
          <mesh>
            <sphereGeometry args={[object.kind === 'planetary-nebula' ? scale * 0.047 : 0.036, 16, 12]} />
            <meshBasicMaterial color="#f7fcff" />
          </mesh>
          <StellarGlow radius={object.kind === 'planetary-nebula' ? scale * 0.047 : 0.036} color="#a4d8ff" strength={0.65} />
        </>
      )}
      <OrbitControls
        ref={controls}
        zoomToCursor
        enablePan={false}
        minDistance={object.extentLightYears * 0.23}
        maxDistance={limit * 1.2}
        zoomSpeed={2.4}
        onStart={() => {
          start.current = controls.current?.getDistance() ?? 0;
        }}
        onEnd={() => {
          const distance = controls.current?.getDistance() ?? 0;
          if (distance >= limit && distance > start.current) onLeave();
        }}
      />
    </>
  );
}

type Props = {
  object: FeaturedObject;
  reportDistance: ReportDistanceScale;
  simulationDaysRef: RefObject<number>;
  daysPerSecond: number;
  paused: boolean;
  onSelectObject: (id: string) => void;
  onLeave: () => void;
};

function MagnetarField({ color }: { color: string }) {
  const lines = useMemo(
    () =>
      [1.65, 2.35, 3.1].flatMap((shell) =>
        Array.from({ length: 6 }, (_, index) => {
          const longitude = (index * TAU) / 6;
          const edge = Math.asin(Math.sqrt(1 / shell));
          return Array.from({ length: 48 }, (_, step): [number, number, number] => {
            const theta = edge + (step / 47) * (Math.PI - 2 * edge);
            const radius = shell * Math.sin(theta) ** 2;
            const plane = radius * Math.sin(theta);
            return [plane * Math.cos(longitude), radius * Math.cos(theta), plane * Math.sin(longitude)];
          });
        }),
      ),
    [],
  );

  return lines.map((points, index) => <Line key={index} points={points} color={color} lineWidth={1} transparent opacity={0.32} depthWrite={false} raycast={() => {}} />);
}

function StellarModel({ object, simulationDaysRef, daysPerSecond, paused, onLeave }: Props) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const start = useRef(0);
  const beams = useRef<Group>(null);
  const surface = useRef<ShaderMaterial>(null);
  const brightness = useRef(1);
  const { photosphere } = object;
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
    if (surface.current && pulsePeriod) {
      brightness.current = 0.79 + 0.2 * Math.cos(((days % pulsePeriod) / pulsePeriod) * TAU);
      surface.current.uniforms.brightness.value = brightness.current;
    }
  });
  return (
    <>
      <Stars radius={46} depth={23} count={1500} factor={3} saturation={0} fade speed={0} />
      <mesh>
        <sphereGeometry args={[1, 64, 40]} />
        {surfaceUniforms ? <shaderMaterial ref={surface} uniforms={surfaceUniforms} vertexShader={surfaceVertex} fragmentShader={supergiantFragment} /> : <meshBasicMaterial color={object.color} />}
      </mesh>
      <StellarGlow radius={1} color={object.color} strength={photosphere ? 1.15 : 0.65} brightness={brightness} paused={paused || !photosphere} />
      {spinPeriod && (
        <>
          <group ref={beams}>
            <group rotation-z={tilt}>
              {object.kind === 'magnetar' ? (
                <MagnetarField color={object.color} />
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
        ref={controls}
        zoomToCursor
        enablePan={false}
        minDistance={2.5}
        maxDistance={16}
        onStart={() => {
          start.current = controls.current?.getDistance() ?? 0;
        }}
        onEnd={() => {
          const distance = controls.current?.getDistance() ?? 0;
          if (distance >= 13 && distance > start.current) onLeave();
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
  const distance = object.extentLightYears * 1.75;
  // drei <Html> 은 React 19 StrictMode 에서 내부 root 가 언마운트돼 비므로, 캔버스 밖 DOM 버튼을 매 프레임 투영 위치로 옮긴다.
  const childButton = useRef<HTMLButtonElement>(null);
  const child = blackHole || stellar ? undefined : childObject(object);
  const placeChildButton = useCallback<PlaceChildButton>((x, y, visible) => {
    const button = childButton.current;
    if (!button) return;
    button.style.visibility = visible ? 'visible' : 'hidden';
    button.style.transform = `translate(${x}px, ${y}px) translateX(-50%)`;
  }, []);
  return (
    <CanvasBoundary>
      <Canvas
        camera={{
          position: blackHole ? [5, 5.6, 13] : stellar ? [0, 1.5, object.photosphere ? 5.7 : 8] : [distance * 0.023, distance * 0.063, distance],
          fov: 45,
          near: 0.05,
          far: Math.max(170, object.extentLightYears * 32),
        }}
        dpr={[1, 1.5]}
        aria-label={t('canvas.namedObjectModel', [catalogText(object.name)])}
      >
        {blackHole ? (
          <AccretionModel object={{ color: object.color, visibleJet: true }} onExit={props.onLeave} />
        ) : stellar ? (
          <StellarModel {...props} />
        ) : (
          <Scene {...props} placeChildButton={placeChildButton} />
        )}
      </Canvas>
      {child && (
        <button ref={childButton} className={styles.sceneObjectButton} type="button" style={{ visibility: 'hidden' }} onClick={() => props.onSelectObject(child.id)}>
          {t('navigation.zoomInto', [catalogText(child.name)])}
        </button>
      )}
    </CanvasBoundary>
  );
}
