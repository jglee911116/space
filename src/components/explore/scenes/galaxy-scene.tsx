'use client';

import { useLanguage } from '@/i18n/language';
import { Line, OrbitControls, Stars } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import { Color, MathUtils, Vector3, type Group, type Points, type ShaderMaterial } from 'three';
import { featuredObjects, type FeaturedObject, milkyWay, type Body, type StarSystem } from '@/constants/space';
import { UNITS_PER_AU } from '../utils/orbit';
import { GalaxyObservationDisk } from '../three/galaxies/galaxy-observation-disk';
import { LensedStarfield } from '../three/black-holes/black-hole-lensing';
import { SAGITTARIUS_FLOW_DIAMETER, SagittariusAccretionFlow } from '../three/black-holes/sagittarius-accretion-flow';
import { FeaturedObjectPreview } from '../three/maps/featured-object-preview';
import { galaxyObservationPoints } from '../three/galaxies/galaxy-observation-points';
import { useSurfaceMap } from '../three/shared/use-surface-map';
import { updatePointDetail } from '../three/maps/map-detail';
import { GalacticLabelLayer, GalacticMarker } from '../three/maps/galactic-marker';
import { useCursorZoom } from '../three/shared/use-cursor-zoom';
import { CanvasBoundary } from '../three/shared/canvas-boundary';
import { OortCloudModel } from '../three/planetary-systems/oort-cloud';
import { AU_PER_KPC, DAYS_PER_YEAR, KM_PER_AU, KM_PER_LIGHT_YEAR } from '@/constants/space/units';
import { kmPerPixel, type ReportDistanceScale } from '../utils/distance-scale';
import { galacticOrbitColor, nearbyPositions } from '../utils/nearby-positions';
import { BLACK_HOLE_EXIT_DISTANCE, GALACTIC_CENTER_ENTRY_KPC, GALACTIC_CENTER_RETURN_KPC, GALAXY_EXIT_KPC, featuredOverviewDistanceKpc, galaxyHandoffDistanceAu, type ZoomHandoff } from '../utils/zoom';

type GalaxySceneProps = {
  anchor: StarSystem;
  reportDistance: ReportDistanceScale;
  system: StarSystem;
  systems: readonly StarSystem[];
  onSelectSystem: (system: StarSystem) => void;
  target: string | null;
  simulationDaysRef: RefObject<number>;
  paused: boolean;
  daysPerSecond: number;
  demo: boolean;
  onSelectCenter: () => void;
  onSelectObject: (id: string) => void;
  focusedObjectId?: string;
  recenter: number;
  entry?: ZoomHandoff;
  onZoomIn: (handoff: ZoomHandoff) => void;
  onZoomOut: (handoff: ZoomHandoff) => void;
  groupEntry?: ZoomHandoff;
  blackHoleView: boolean;
  showCenterPolarization: boolean;
  centerEntry?: ZoomHandoff;
  onCenterZoom: (close: boolean, entry: ZoomHandoff) => void;
};

const MAP_CAMERA = new Vector3(0, 36, 28);
const CENTER_CAMERA = new Vector3(0, 1.8, 6.2);
const CENTER_OVERVIEW_DIAMETER_KPC = (SAGITTARIUS_FLOW_DIAMETER / BLACK_HOLE_EXIT_DISTANCE) * GALACTIC_CENTER_RETURN_KPC;
const CENTER_EINSTEIN_RADIUS = 2.26;
const CENTER_LENS_FADE_KPC = [0.20, 0.94] as const;
const COUNT = 24_000;
const PHASE = 0.36;
const BAR_ANGLE = 0.29;
const BAR_HALF_LENGTH = 3.8;
const LIGHT_YEAR_TO_KPC = KM_PER_LIGHT_YEAR / (AU_PER_KPC * KM_PER_AU);
const LOCAL_RADIUS = 0.0046;
const OORT_TO_KPC = 1 / (AU_PER_KPC * UNITS_PER_AU);

function solarPosition(target: Vector3, star: Body, years: number) {
  const orbit = star.galacticOrbit;
  const radius = orbit?.radiusKpc ?? 0;
  const angle = orbit ? PHASE + ((years % orbit.periodYears) / orbit.periodYears) * 2 * Math.PI : PHASE;
  return target.set(radius * Math.cos(angle), 0, radius * Math.sin(angle));
}

// A single revolution illustrates the modeled radial excursion in the schematic galaxy.
function neighborPosition(out: Vector3, offset: Vector3, anchorRadius: number, path: StarSystem['galacticPath'], turns: number) {
  const x = anchorRadius * Math.cos(PHASE) + offset.x;
  const z = anchorRadius * Math.sin(PHASE) + offset.z;
  const angle = turns * Math.PI * 2;
  const initialRadius = Math.hypot(x, z);
  const amplitude = path?.radialAmplitudeKpc ?? 0;
  const minimum = path?.minRadiusKpc ?? initialRadius;
  const initialRadialAngle = amplitude > 0 ? Math.acos(MathUtils.clamp(1 - (initialRadius - minimum) / amplitude, -1, 1)) : 0;
  const radius = minimum + amplitude * (1 - Math.cos(initialRadialAngle + angle));
  const longitude = Math.atan2(z, x) + angle;
  return out.set(radius * Math.cos(longitude), offset.y, radius * Math.sin(longitude));
}

function buildGalaxy() {
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const warm = new Color('#ffd7ac');
  const cool = new Color('#8ab0ec');
  const color = new Color();
  let seed = 19650218;

  function sample() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  }

  for (let index = 0; index < COUNT; index++) {
    const population = sample();
    const bar = population < 0.22;
    const bulge = population >= 0.22 && population < 0.3;
    const mainArm = population >= 0.3 && population < 0.82;
    const minorArm = population >= 0.82 && population < 0.94;
    const dispersion = sample() + sample() + sample() - 1.5;
    let x: number;
    let z: number;

    if (bar) {
      const along = (sample() * 2 - 1) * BAR_HALF_LENGTH;
      const across = dispersion * (1.04 - (0.52 * Math.abs(along)) / BAR_HALF_LENGTH);
      x = along * Math.cos(BAR_ANGLE) - across * Math.sin(BAR_ANGLE);
      z = along * Math.sin(BAR_ANGLE) + across * Math.cos(BAR_ANGLE);
    } else {
      const start = mainArm ? BAR_HALF_LENGTH : minorArm ? 4.8 : 0;
      const end = bulge ? 1.8 : milkyWay.modelRadiusKpc;
      const radius = start + (end - start) * sample() ** (bulge ? 1.7 : 1.25);
      const side = sample() < 0.5 ? 0 : Math.PI;
      const angle = mainArm || minorArm ? BAR_ANGLE + side + (minorArm ? Math.PI / 2 : 0) + 2.85 * Math.log(radius / start) + dispersion * (0.082 + 0.68 / radius) : sample() * 2 * Math.PI;
      x = radius * Math.cos(angle);
      z = radius * Math.sin(angle);
    }

    positions[index * 3] = x;
    positions[index * 3 + 1] = (sample() + sample() - 1) * (bulge ? 0.92 : bar ? 0.42 : 0.38);
    positions[index * 3 + 2] = z;
    color.copy(bar || bulge ? warm : cool).lerp(bar || bulge ? cool : warm, sample() * 0.38);
    color.toArray(colors, index * 3);
    sizes[index] = sample() * (mainArm || bar || bulge ? 1 : 0.74);
  }

  return { positions, colors, sizes };
}

const galaxyVertex = /* glsl */ `
  attribute vec3 tint;
  attribute float grain;
  uniform float pixelRatio;
  varying vec3 pointColor;
  varying float strength;

  void main() {
    pointColor = tint;
    strength = mix(0.12, 0.64, pow(grain, 2.8));
    gl_PointSize = mix(1.35, 3.05, grain) * pixelRatio;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const galaxyFragment = /* glsl */ `
  uniform float layerOpacity;
  varying vec3 pointColor;
  varying float strength;

  void main() {
    float edge = 1.0 - smoothstep(0.06, 0.49, length(gl_PointCoord - 0.5));
    gl_FragColor = vec4(pointColor, edge * strength * layerOpacity);
    #include <colorspace_fragment>
  }
`;

function orbitOpacity(fade: number, hovered: boolean, selected: boolean) {
  return hovered ? Math.max(0.55, 1 - fade) * 0.9 : (1 - fade) * (selected ? 0.28 : 0.14);
}

function GalacticNeighbor({
  system,
  position,
  anchorRadius,
  anchorPeriod,
  labelOffset,
  wideLabelSpacing,
  years,
  localOpacity,
  hoveredOrbitRef,
  dashPhase,
  dashCount,
  selected,
  onSelect,
}: ReturnType<typeof nearbyPositions>[number] & {
  anchorRadius: number;
  anchorPeriod: number;
  labelOffset: number;
  wideLabelSpacing: RefObject<number>;
  years: RefObject<number>;
  localOpacity: RefObject<number>;
  hoveredOrbitRef: RefObject<string | null>;
  dashPhase: number;
  dashCount: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const path = system.galacticPath;
  const period = path?.periodYears ?? anchorPeriod;
  const color = galacticOrbitColor(system);
  const hover = (active: boolean) => {
    if (active) hoveredOrbitRef.current = system.id;
    else if (hoveredOrbitRef.current === system.id) hoveredOrbitRef.current = null;
  };
  const group = useRef<Group>(null);
  const line = useRef<ComponentRef<typeof Line>>(null);
  const points = useMemo(() => Array.from({ length: 257 }, (_, i) => neighborPosition(new Vector3(), position, anchorRadius, path, i / 256)), [anchorRadius, path, position]);
  useFrame(() => {
    if (group.current) neighborPosition(group.current.position, position, anchorRadius, path, (years.current % period) / period);
    if (line.current) {
      const hovered = hoveredOrbitRef.current === system.id;
      line.current.material.opacity = orbitOpacity(localOpacity.current, hovered, selected);
      line.current.visible = line.current.material.opacity > 0.005;
      line.current.material.linewidth = hovered ? 2.8 : 1.5;
      line.current.renderOrder = hovered ? 1 : 0;
    }
  });
  return (
    <>
      <Line
        ref={line}
        points={points}
        color={color}
        lineWidth={1.5}
        dashed={!path}
        dashSize={0.24}
        gapSize={0.3 * dashCount - 0.24}
        dashOffset={dashPhase * 0.3}
        transparent
        depthWrite={false}
        onPointerMove={(event) => {
          if (localOpacity.current > 0.85) return;
          event.stopPropagation();
          hover(true);
        }}
        onPointerOut={() => hover(false)}
      />
      <group ref={group} position={points[0]}>
        <GalacticMarker name={system.name} priority={selected ? 3 : 0} color={color} onHover={hover} onSelect={onSelect} labelOffset={labelOffset} wideLabelSpacing={wideLabelSpacing} />
      </group>
    </>
  );
}

function featuredPosition(object: FeaturedObject, sunRadius: number): [number, number, number] {
  const ra = MathUtils.degToRad(object.rightAscension);
  const dec = MathUtils.degToRad(object.declination);
  const x = Math.cos(dec) * Math.cos(ra);
  const y = Math.cos(dec) * Math.sin(ra);
  const z = Math.sin(dec);
  // Equatorial J2000 to Galactic axes. From the Sun, longitude zero points inward.
  const inward = -0.05487556 * x - 0.87343709 * y - 0.48383502 * z;
  const tangent = 0.49410943 * x - 0.44482963 * y + 0.74698224 * z;
  const north = -0.86766615 * x - 0.19807637 * y + 0.45598378 * z;
  const distance = object.distanceLightYears * LIGHT_YEAR_TO_KPC;
  return [
    (sunRadius - inward * distance) * Math.cos(PHASE) - tangent * distance * Math.sin(PHASE),
    north * distance,
    (sunRadius - inward * distance) * Math.sin(PHASE) + tangent * distance * Math.cos(PHASE),
  ];
}

function GalacticMap({
  star,
  anchor,
  activeSystemId,
  centerFocused,
  onSelectCenter,
  onSelectSystem,
  onSelectObject,
  neighbors,
  years,
  wideLabelSpacing,
  sun,
  cloudOpacity,
  centerLabelFade,
  focusedObjectId,
}: Pick<GalaxySceneProps, 'anchor' | 'onSelectCenter' | 'onSelectSystem' | 'onSelectObject'> & {
  activeSystemId: string;
  centerFocused: boolean;
  star: Body;
  neighbors: ReturnType<typeof nearbyPositions>;
  years: RefObject<number>;
  wideLabelSpacing: RefObject<number>;
  sun: RefObject<Group | null>;
  cloudOpacity: RefObject<number>;
  centerLabelFade: RefObject<number>;
  focusedObjectId?: string;
}) {
  const observation = milkyWay.diskObservation;
  const texture = useSurfaceMap(observation?.file);
  const diskOpacity = useRef(0);
  const model = useMemo(() => {
    if (observation && texture) {
      const points = galaxyObservationPoints(texture, observation, milkyWay.modelRadiusKpc, 12_000);
      if (points) {
        const sizes = Float32Array.from({ length: points.positions.length / 3 }, (_, i) => 0.24 + ((i * 131) % 997) / 1994);
        return { ...points, sizes };
      }
      return null;
    }
    return buildGalaxy();
  }, [observation, texture]);
  const dpr = useThree((state) => state.viewport.dpr);
  const pointsMaterial = useRef<ShaderMaterial>(null);
  const galaxyPoints = useRef<Points>(null);
  const lodPosition = useMemo(() => new Vector3(), []);
  const orbitLine = useRef<ComponentRef<typeof Line>>(null);
  const hoveredOrbitRef = useRef<string | null>(null);
  const anchorColor = galacticOrbitColor(anchor);
  const hoverAnchor = (active: boolean) => {
    if (active) hoveredOrbitRef.current = anchor.id;
    else if (hoveredOrbitRef.current === anchor.id) hoveredOrbitRef.current = null;
  };
  const approximate = neighbors.filter(({ system }) => !system.galacticPath);
  const uniforms = useMemo(() => ({ pixelRatio: { value: dpr }, layerOpacity: { value: 0 } }), [dpr]);
  useFrame(({ camera, size }) => {
    const opacity = 1 - cloudOpacity.current;
    const centerDistance = camera.position.length();
    const solarDistance = sun.current ? camera.position.distanceTo(sun.current.position) : centerDistance;
    diskOpacity.current = opacity * MathUtils.smoothstep(Math.min(centerDistance, solarDistance), 1.5, 15);
    if (galaxyPoints.current) updatePointDetail(galaxyPoints.current, lodPosition, camera, size.height, milkyWay.modelRadiusKpc, opacity);
    if (pointsMaterial.current) pointsMaterial.current.uniforms.layerOpacity.value = opacity * (texture ? 0.62 : 1);
    if (orbitLine.current) {
      const hovered = hoveredOrbitRef.current === anchor.id;
      orbitLine.current.material.opacity = orbitOpacity(cloudOpacity.current, hovered, activeSystemId === anchor.id);
      orbitLine.current.visible = orbitLine.current.material.opacity > 0.005;
      orbitLine.current.material.linewidth = hovered ? 2.8 : 1.5;
      orbitLine.current.renderOrder = hovered ? 1 : 0;
    }
  });
  const radius = star.galacticOrbit?.radiusKpc ?? 0;
  const orbit = useMemo(
    () =>
      Array.from({ length: 257 }, (_, index) => {
        const angle = (index * Math.PI) / 128;
        return new Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle));
      }),
    [radius],
  );

  return (
    <>
      {texture && observation && (
        <GalaxyObservationDisk texture={texture} radius={milkyWay.modelRadiusKpc} center={observation.center} span={observation.span} rotation={observation.rotation} opacity={diskOpacity} />
      )}
      {model && (
        <points ref={galaxyPoints} raycast={() => {}}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[model.positions, 3]} />
            <bufferAttribute attach="attributes-tint" args={[model.colors, 3]} />
            <bufferAttribute attach="attributes-grain" args={[model.sizes, 1]} />
          </bufferGeometry>
          <shaderMaterial ref={pointsMaterial} uniforms={uniforms} vertexShader={galaxyVertex} fragmentShader={galaxyFragment} transparent depthWrite={false} />
        </points>
      )}
      <Line
        ref={orbitLine}
        points={orbit}
        color={anchorColor}
        lineWidth={1.5}
        transparent
        opacity={0}
        depthWrite={false}
        onPointerMove={(event) => {
          if (cloudOpacity.current > 0.85) return;
          event.stopPropagation();
          hoverAnchor(true);
        }}
        onPointerOut={() => hoverAnchor(false)}
      />
      <group ref={sun} position={[radius * Math.cos(PHASE), 0, radius * Math.sin(PHASE)]}>
        {anchor.oortCloud && (
          <group scale={OORT_TO_KPC}>
            <OortCloudModel cloud={anchor.oortCloud} opacity={cloudOpacity} />
          </group>
        )}
        <GalacticMarker name={star.name} priority={!centerFocused && activeSystemId === anchor.id ? 3 : 1} color={anchorColor} onHover={hoverAnchor} onSelect={() => onSelectSystem(anchor)} />
      </group>
      {neighbors.map((neighbor, index) => (
        <GalacticNeighbor
          key={neighbor.system.id}
          {...neighbor}
          anchorRadius={radius}
          anchorPeriod={star.galacticOrbit?.periodYears ?? 230_000_000}
          labelOffset={(index % 2 === 0 ? 1 : -1) * (Math.floor(index / 2) + 1)}
          wideLabelSpacing={wideLabelSpacing}
          years={years}
          localOpacity={cloudOpacity}
          hoveredOrbitRef={hoveredOrbitRef}
          dashPhase={approximate.indexOf(neighbor)}
          dashCount={Math.max(1, approximate.length)}
          selected={!centerFocused && activeSystemId === neighbor.system.id}
          onSelect={() => onSelectSystem(neighbor.system)}
        />
      ))}
      {featuredObjects
        .filter((object) => !object.parentObjectId && (!object.galaxyId || object.galaxyId === milkyWay.id))
        .map((object, index) => (
          <group key={object.id} position={featuredPosition(object, radius)}>
            {(object.extentLightYears > 0 || object.photosphere || object.id === focusedObjectId) && <FeaturedObjectPreview object={object} focused={object.id === focusedObjectId} />}
            <GalacticMarker name={object.name} color={object.color} labelOffset={index ? -1.0 : 1.0} modelRadius={object.id === focusedObjectId ? featuredOverviewDistanceKpc(object) * 0.13 : undefined} priority={object.id === focusedObjectId ? 3 : 0} localOpacity={cloudOpacity} onSelect={() => onSelectObject(object.id)} />
          </group>
        ))}
      <GalacticMarker name={milkyWay.center.name} priority={centerFocused ? 3 : 2} onSelect={onSelectCenter} localOpacity={centerLabelFade} labelOffset={1.15} modelRadius={CENTER_OVERVIEW_DIAMETER_KPC * 0.30} />
    </>
  );
}

function Scene({
  anchor,
  reportDistance,
  system,
  systems,
  onSelectSystem,
  onSelectObject,
  focusedObjectId,
  target,
  simulationDaysRef,
  paused,
  daysPerSecond,
  demo,
  onSelectCenter,
  recenter,
  entry,
  onZoomIn,
  onZoomOut,
  groupEntry,
  blackHoleView,
  showCenterPolarization,
  centerEntry,
  onCenterZoom,
}: GalaxySceneProps) {
  const star = anchor.bodies[0];
  const neighbors = useMemo(
    () =>
      nearbyPositions(systems)
        .filter((item) => item.system.id !== anchor.id)
        .map((item) => ({ ...item, position: item.position.multiplyScalar(LIGHT_YEAR_TO_KPC) })),
    [anchor.id, systems],
  );
  const selectedNeighbor = neighbors.find((item) => item.system.id === system.id);
  const localCenter = useMemo(() => {
    const origin = new Vector3();
    const activePosition = selectedNeighbor?.position ?? origin;
    const localPositions = [origin, ...neighbors.map(({ position }) => position)].filter((position) => position.distanceTo(activePosition) <= LOCAL_RADIUS);
    return localPositions.reduce((sum, position) => sum.add(position), new Vector3()).divideScalar(localPositions.length);
  }, [neighbors, selectedNeighbor]);
  const focusLocal = target === system.bodies[0].id;
  const camera = useThree((state) => state.camera);
  const { width, height } = useThree((state) => state.size);
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const cursorZoomRef = useCursorZoom();
  const sun = useRef<Group>(null);
  const backdrop = useRef<Group>(null);
  const demoYears = useRef(0);
  const galacticYears = useRef(0);
  const cloudOpacity = useRef(0);
  const centerLabelFade = useRef(0);
  const wideLabelSpacing = useRef(1);
  const distanceAtStart = useRef(0);
  const centerFocused = target === milkyWay.center.id;
  const close = centerFocused && blackHoleView;
  const focusedObject = featuredObjects.find(({ id }) => id === focusedObjectId);
  const focusedDistance = focusedObject ? featuredOverviewDistanceKpc(focusedObject) : 0;
  const focusedPosition = useMemo(
    () => focusedObject ? new Vector3(...featuredPosition(focusedObject, star.galacticOrbit?.radiusKpc ?? 0)) : undefined,
    [focusedObject, star.galacticOrbit?.radiusKpc],
  );
  const handoffRadius = galaxyHandoffDistanceAu(system) / AU_PER_KPC;
  const initialRecenter = useRef(recenter);
  const observationMaps = milkyWay.center.observationMaps;
  const intensityMap = useSurfaceMap(observationMaps?.intensity, centerFocused);
  const polarizationMap = useSurfaceMap(observationMaps?.polarization, centerFocused && showCenterPolarization);
  const observationMap = showCenterPolarization ? polarizationMap ?? intensityMap : intensityMap;
  const scratch = useMemo(() => ({ offset: new Vector3(), center: new Vector3(), sun: new Vector3(), selected: new Vector3() }), []);
  const selectedPath = selectedNeighbor?.system.galacticPath;
  const anchorRadius = star.galacticOrbit?.radiusKpc ?? 0;

  useLayoutEffect(() => {
    const orbit = controls.current;
    if (!orbit) return;
    cursorZoomRef.current = false;
    if (centerFocused && centerEntry) {
      orbit.target.set(0, 0, 0);
      const distance = close
        ? MathUtils.clamp((centerEntry.distanceAu / AU_PER_KPC) * SAGITTARIUS_FLOW_DIAMETER / CENTER_OVERVIEW_DIAMETER_KPC, 2.4, BLACK_HOLE_EXIT_DISTANCE * 0.85)
        : (centerEntry.distanceAu / AU_PER_KPC) * CENTER_OVERVIEW_DIAMETER_KPC / SAGITTARIUS_FLOW_DIAMETER;
      camera.position.set(...centerEntry.direction).multiplyScalar(distance);
    } else if (focusedPosition) {
      orbit.target.copy(focusedPosition);
      const direction = groupEntry ? scratch.offset.set(...groupEntry.direction) : scratch.offset.copy(MAP_CAMERA).normalize();
      camera.position.copy(focusedPosition).addScaledVector(direction, groupEntry ? groupEntry.distanceAu / AU_PER_KPC : focusedDistance);
    } else if (!close && !centerFocused && ((entry && recenter === initialRecenter.current) || focusLocal)) {
      solarPosition(scratch.sun, star, simulationDaysRef.current / DAYS_PER_YEAR + demoYears.current);
      orbit.target.copy(scratch.sun).add(localCenter);
      const direction = entry ? scratch.offset.set(...entry.direction) : scratch.offset.copy(MAP_CAMERA).normalize();
      const radius = entry ? Math.max(handoffRadius, entry.distanceAu / AU_PER_KPC) : LOCAL_RADIUS * Math.max(1, (0.75 * height) / Math.max(width, 1));
      camera.position.copy(orbit.target).addScaledVector(direction, radius);
    } else if (groupEntry && !close) {
      orbit.target.set(0, 0, 0);
      camera.position.set(...groupEntry.direction).multiplyScalar(groupEntry.distanceAu / AU_PER_KPC);
    } else {
      orbit.target.set(0, 0, 0);
      camera.position.copy(close ? CENTER_CAMERA : MAP_CAMERA).multiplyScalar(Math.max(1, ((close ? 0.55 : 0.85) * height) / Math.max(width, 1)));
    }
    orbit.update();
  }, [camera, centerEntry, centerFocused, close, cursorZoomRef, entry, focusLocal, focusedDistance, focusedPosition, groupEntry, handoffRadius, height, localCenter, recenter, scratch, simulationDaysRef, star, system.id, width]);

  useFrame(({ camera }, delta) => {
    if (!paused) {
      if (demo && !close) demoYears.current += Math.min(delta, 0.1) * milkyWay.demoYearsPerSecond;
    }

    const orbit = controls.current;
    if (!close && orbit) {
      galacticYears.current = simulationDaysRef.current / DAYS_PER_YEAR + demoYears.current;
      solarPosition(scratch.sun, star, galacticYears.current);
      sun.current?.position.copy(scratch.sun);
      const radius = orbit.getDistance();
      reportDistance(kmPerPixel(camera, height, radius, AU_PER_KPC * KM_PER_AU));
      const logDistance = Math.log(radius);
      // Cross the sparsely populated range quickly without changing the controls near either end.
      const faster = MathUtils.smoothstep(logDistance, Math.log(0.008), Math.log(0.08)) * (1 - MathUtils.smoothstep(logDistance, Math.log(8), Math.log(30)));
      orbit.zoomSpeed = 2.25 + 2.15 * faster;
      if (!cursorZoomRef.current && !focusedPosition) {
        const centerBlend = MathUtils.smoothstep(logDistance, Math.log(0.018), Math.log(38));
        const center = scratch.center.copy(scratch.sun).add(localCenter);
        const focusBlend = demoYears.current !== 0 ? 1 : 1 - MathUtils.smoothstep(radius, handoffRadius, LOCAL_RADIUS);
        const selectedPosition = scratch.selected.copy(scratch.sun);
        if (selectedNeighbor) {
          const period = selectedPath?.periodYears ?? star.galacticOrbit?.periodYears ?? 230_000_000;
          neighborPosition(selectedPosition, selectedNeighbor.position, anchorRadius, selectedPath, (galacticYears.current % period) / period);
        }
        center.lerp(selectedPosition, focusBlend);
        center.multiplyScalar(centerFocused ? 0 : 1 - centerBlend);
        if (center.distanceToSquared(orbit.target) > 1e-20) {
          camera.position.add(scratch.offset.subVectors(center, orbit.target));
          orbit.target.copy(center);
          orbit.update();
        }
      }
      cloudOpacity.current = centerFocused || focusedPosition ? 0 : 1 - MathUtils.smoothstep(logDistance, Math.log(handoffRadius * 1.08), Math.log(0.025));
      centerLabelFade.current = centerFocused ? 1 - MathUtils.smoothstep(radius, 0.65, 2.4) : cloudOpacity.current;
      wideLabelSpacing.current = MathUtils.smoothstep(logDistance, Math.log(LOCAL_RADIUS), Math.log(LOCAL_RADIUS * 4));
      const near = MathUtils.clamp(radius * 0.002, 0.000002, 0.12);
      if (camera.near !== near) {
        camera.near = near;
        camera.updateProjectionMatrix();
      }
    } else {
      if (orbit) orbit.zoomSpeed = 2.25;
      if (camera.near !== 0.03) {
        camera.near = 0.03;
        camera.updateProjectionMatrix();
      }
    }
    backdrop.current?.position.copy(camera.position);
  });

  return (
    <>
      {centerFocused && (
        <LensedStarfield
          einsteinRadius={close ? CENTER_EINSTEIN_RADIUS : CENTER_EINSTEIN_RADIUS * CENTER_OVERVIEW_DIAMETER_KPC / SAGITTARIUS_FLOW_DIAMETER}
          fadeRange={close ? undefined : CENTER_LENS_FADE_KPC}
        />
      )}
      {!close && (
        <>
          <group ref={backdrop}>
            <Stars radius={70} depth={30} count={1700} factor={3} saturation={0} fade speed={0} />
          </group>
          <GalacticMap
            star={star}
            anchor={anchor}
            activeSystemId={system.id}
            centerFocused={centerFocused}
            onSelectCenter={onSelectCenter}
            onSelectSystem={onSelectSystem}
            onSelectObject={onSelectObject}
            neighbors={neighbors}
            years={galacticYears}
            wideLabelSpacing={wideLabelSpacing}
            sun={sun}
            cloudOpacity={cloudOpacity}
            centerLabelFade={centerLabelFade}
            focusedObjectId={focusedObjectId}
          />
        </>
      )}
      <SagittariusAccretionFlow observationMap={observationMap} paused={paused} daysPerSecond={daysPerSecond} overviewDiameter={close ? undefined : CENTER_OVERVIEW_DIAMETER_KPC} />
      <OrbitControls
        ref={controls}
        enablePan={false}
        minDistance={close ? 2.4 : centerFocused ? GALACTIC_CENTER_ENTRY_KPC * 0.7 : focusedPosition ? focusedDistance * 0.55 : handoffRadius * 0.65}
        maxDistance={close ? 16 : GALAXY_EXIT_KPC * 1.18}
        zoomSpeed={2.25}
        onStart={() => {
          distanceAtStart.current = controls.current?.getDistance() ?? 0;
        }}
        onEnd={() => {
          const orbit = controls.current;
          if (!orbit) return;
          const radius = orbit.getDistance();
          const direction = scratch.offset.subVectors(camera.position, orbit.target).normalize().toArray();
          const handoff = { distanceAu: radius * AU_PER_KPC, direction };
          const zoomingOut = radius > distanceAtStart.current;
          const zoomingIn = radius < distanceAtStart.current;
          if (close) {
            if (zoomingOut && radius >= BLACK_HOLE_EXIT_DISTANCE) onCenterZoom(false, handoff);
          } else if (zoomingOut && radius >= GALAXY_EXIT_KPC) {
            onZoomOut(handoff);
          } else if (centerFocused) {
            if (zoomingIn && radius <= GALACTIC_CENTER_ENTRY_KPC) onCenterZoom(true, handoff);
          } else if (focusedObject) {
            if (zoomingIn && radius <= focusedDistance * 0.72) onSelectObject(focusedObject.id);
          } else if (zoomingIn && radius <= handoffRadius * 0.88) {
            onZoomIn(handoff);
          }
        }}
      />
    </>
  );
}

const CAMERA_OPTIONS = { position: [0, 36, 28] as [number, number, number], fov: 45, near: 0.03, far: 240 };

export default function GalaxyScene(props: GalaxySceneProps) {
  const { t } = useLanguage();
  return (
    <CanvasBoundary>
      <Canvas camera={CAMERA_OPTIONS} dpr={[1, 1.5]} fallback={<span aria-hidden="true">{t('canvas.milkyWayModel')}</span>} aria-label={t('canvas.milkyWayBlackHole')}>
        <GalacticLabelLayer>
          <Scene {...props} />
        </GalacticLabelLayer>
      </Canvas>
    </CanvasBoundary>
  );
}
