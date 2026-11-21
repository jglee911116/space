import type { CatalogText } from '@/i18n/messages';

export type BodyKind = 'star' | 'planet' | 'dwarf-planet' | 'small-body' | 'moon';

/** 행성 표면 셰이더 종류. craters 는 캔버스 텍스처를 쓴다. */
export type Appearance = 'craters' | 'clouds' | 'earth' | 'rock' | 'bands' | 'ice' | 'pluto';

/** 기본 기준면은 계의 황도면. 라플라스면은 J2000 적도 좌표의 북극으로 지정한다. */
export type OrbitReferencePlane = 'parent-equator' | { rightAscension: number; declination: number };

/** J2000 케플러 궤도 요소(도 단위). 위치는 부모 천체 기준이다. */
export type OrbitElements = {
  axisAu: number;
  eccentricity: number;
  inclination: number;
  meanLongitude: number;
  perihelionLongitude: number;
  ascendingNode: number;
  periodDays: number;
  referencePlane?: OrbitReferencePlane;
};

/** inner/outer 는 천체 표시 반지름의 배수. */
export type Ring = { inner: number; outer: number; color: string; opacity: number };

export type Source = { label: CatalogText; href: string };

export type Body = {
  id: string;
  name: CatalogText;
  kind: BodyKind;
  /** null 은 계의 질량중심 기준. 그 외에는 궤도의 부모 천체 id. */
  parent: string | null;
  radiusKm?: number;
  lengthKm?: number;
  spinDays?: number;
  /** 궤도면 기준 자전축 기울기(도). 궤도가 없으면 황도면 기준. */
  tilt: number;
  /** 화면 표시 반지름(장면 단위). 실제 축척보다 확대돼 있다. */
  displayRadius: number;
  /** 비구형 천체의 표시 반지름에 곱하는 X/Y/Z 비율. */
  shape?: [number, number, number];
  /** 다엽 천체는 각 부분의 중심과 축 비율을 표시 반지름 단위로 지정한다. */
  lobes?: readonly { offset: [number, number, number]; shape: [number, number, number] }[];
  /** 계의 outerRegion 에 속하는 천체. 해당 구역 보기에서만 내비게이션에 나온다. */
  region?: 'outer';
  /** [어두운, 중간, 밝은] — 밝은 색은 궤도선·마커에도 쓴다. */
  colors: readonly [string, string, string];
  appearance?: Appearance;
  orbit?: OrbitElements;
  rings?: readonly Ring[];
  ringMap?: { file: string; inner: number; outer: number };
  shapeModel?: string;
  surfaceMap?: { file: string; longitudeOffset?: number; fillMissing?: boolean };
  surfaceFeatures?: 'jupiter' | 'saturn' | 'mars' | 'neptune' | 'io' | 'europa';
  polarCaps?: boolean;
  rockySurface?: readonly [seed: number, brightDeposits: number, contrast: number, craters: number];
  cloudBands?: readonly [seed: number, frequency: number, turbulence: number, contrast: number];
  /** 카메라 초점 거리 = displayRadius × focusScale (기본 6.75). */
  focusScale?: number;
  mass?: CatalogText;
  spinNote?: CatalogText;
  stellar?: {
    evolutionaryStage: CatalogText;
    spectralType: CatalogText;
    temperatureK: number;
    luminosityWatts: number;
    emissionColor: string;
    glowStrength?: number;
    poleSpinDays?: number;
    photosphere?: {
      seed: number;
      granuleScale: number; // Zero selects a smooth photosphere.
      activeRegions: number;
      flarePreview?: boolean;
    };
  };
  /** 은하 장면의 기준 항성 공전. color 는 궤도선·범례 색. */
  galacticOrbit?: { radiusKpc: number; periodYears: number; color: string };
  note?: CatalogText;
  sources: readonly Source[];
};

export type OortCloud = {
  innerEdgeAu: readonly [number, number];
  outerEdgeAu: readonly [number, number];
  source: Source;
};

export type StarSystem = {
  id: string;
  galaxyId?: string;
  galaxyMarkerKpc?: readonly [number, number, number];
  initialView?: readonly [number, number, number];
  name: CatalogText;
  /** 전체 보기 카메라 거리(장면 단위). */
  overviewDistance: number;
  /** '전체 보기' 버튼 문구. 기본 '행성계'. */
  overviewLabel?: CatalogText;
  /** 먼 궤도까지 보는 추가 시점(예: 프록시마 궤도). */
  wideOverview?: { distance: number; label: CatalogText };
  summary?: CatalogText;
  neighborhood?: { distanceLightYears: number; rightAscension: number; declination: number; source: Source };
  galacticPath?: { radialAmplitudeKpc: number; minRadiusKpc?: number; periodYears: number; color: string; source: Source };
  /** 바깥 구역(예: 해왕성 너머·카이퍼대). 소속 천체는 region: 'outer'. */
  outerRegion?: { name: CatalogText; beltName: CatalogText; overviewDistance: number; beltAu: readonly [number, number]; source: Source };
  oortCloud?: OortCloud;
  /** 부모가 자식보다 먼저 오도록 정렬. */
  bodies: readonly Body[];
  sources: readonly Source[];
};

/** 국부은하군 지도와 원반 모형에 쓰는 은하 공통 정보. */
export type Galaxy = {
  id: string;
  aliases?: readonly string[];
  name: CatalogText;
  /** 상세 패널 제목. 기본 name. */
  title?: CatalogText;
  summary: CatalogText;
  /** 지도에서 태양 인근을 원점으로 잡은 거리. */
  distanceKpc: number;
  skyPosition?: { rightAscension: number; declination: number };
  parentGalaxyId?: string;
  superclusterId?: string;
  morphology?: 'barred-spiral' | 'open-spiral' | 'barred-irregular' | 'irregular' | 'compact-elliptical' | 'dwarf-elliptical' | 'giant-elliptical' | 'dust-lane-elliptical';
  modelRadiusKpc: number;
  /** 원반 바깥쪽 색. */
  color: string;
  /** 국부은하군 장면에서 원반의 X축 기울기(라디안). */
  diskTilt?: number;
  diskObservation?: { file: string; previewFile?: string; center: readonly [number, number]; span: readonly [number, number]; rotation?: number };
  sources: readonly Source[];
};

/** 항성계를 품어 은하 ↔ 항성계 줌 전환이 되는 은하. */
export type HostGalaxy = Galaxy & {
  /** 은하 공전 기준 항성계(줌인 대상). */
  systemId: string;
  /** 기준 항성계 주변 거리 지도. 계에 `neighborhood` 가 있으면 포함된다. */
  neighborhood: { name: CatalogText; summary: CatalogText; source: Source };
  /** 은하 장면 상세 패널에서 summary 앞에 놓는 문단. */
  notes: readonly CatalogText[];
  orbitSource: Source;
  demoYearsPerSecond: number;
  center: { id: string; name: CatalogText; distanceLightYears: number; massSolar: number; shadowDiameterMicroarcseconds: number; observationMaps?: { intensity: string; polarization: string }; sources: readonly Source[] };
};

export type LocalGroup = {
  name: CatalogText;
  summary: CatalogText;
  /** 첫 항목이 기준 은하(거리 0). */
  galaxies: readonly [HostGalaxy, ...Galaxy[]];
  source: Source;
};

/** 은하 안의 성운·잔해·블랙홀 등. galaxyId 가 없으면 우리은하. parentObjectId 는 확대해 들어가는 상위 천체. */
export type ObservationStatus = 'observed' | 'candidate';

export type FeaturedObject = {
  id: string;
  aliases?: readonly string[];
  name: CatalogText;
  designation: CatalogText;
  description: CatalogText;
  kind:
    | 'pillars'
    | 'supernova-remnant'
    | 'ring-remnant'
    | 'star-forming-region'
    | 'wind-binary'
    | 'open-cluster'
    | 'globular-cluster'
    | 'planetary-nebula'
    | 'black-hole'
    | 'pulsar'
    | 'neutron-star'
    | 'magnetar'
    | 'supergiant';
  galaxyId?: string;
  parentObjectId?: string;
  observationStatus?: ObservationStatus;
  radiusSolar?: number;
  radiusUncertaintySolar?: number;
  radiusBasis?: 'estimate' | 'model-assumption';
  distanceAssumed?: boolean;
  radiusKm?: number;
  spinSeconds?: number;
  variabilityDays?: number;
  observationImage?: { file: string; shape: 'crab' | 'ring' | 'pillars' | 'ejecta' | 'nursery' | 'hourglass' | 'bipolar-jet' | 'shocked-shell' | 'southern-ring' | 'dust-spiral' | 'edge-on-disk' };
  photosphere?: { dark: string; bright: string; cellScale: number };
  expansionPerYear?: number;
  blackHoleMassSolar?: number;
  distanceLightYears: number;
  rightAscension: number;
  declination: number;
  extentLightYears: number;
  color: string;
  /** 성운 속 성단 별 위치(장면 scale 비율). 있으면 중심이 밝게 열린 성운으로 그린다. */
  embeddedCluster?: readonly (readonly [number, number, number])[];
  sources: readonly Source[];
};

export type ClusterMarker = {
  clusterId?: string;
  galaxyId?: string;
  name: CatalogText;
  distanceMly: number;
  rightAscension: number;
  declination: number;
  color: string;
};

export type Supercluster = {
  id: string;
  name: CatalogText;
  spanMly: number;
  gridRadiusMly: number;
  zoomOutMly: number;
  zoomInMly: number;
  summary: CatalogText;
  markers: readonly ClusterMarker[];
  sources: readonly Source[];
};

export type ObservableUniverse = { name: CatalogText; radiusMillionLightYears: number; sources: readonly Source[] };

type DistantObjectFields = {
  id: string;
  aliases?: readonly string[];
  name: CatalogText;
  observationStatus?: ObservationStatus;
  redshift: number;
  rightAscension: number;
  declination: number;
  color: string;
  summary: CatalogText;
  sources: readonly Source[];
};

export type DistantObject = DistantObjectFields & (
  | { kind: 'quasar'; visibleJet: boolean; blackHoleMassSolar?: number }
  | { kind: 'early-galaxy'; ultravioletHalfLightRadiusParsecs: number }
  | { kind: 'ring-galaxy'; observationImage: string }
);
