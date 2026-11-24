import type { CatalogText } from '@/i18n/messages';

export type BodyKind = 'star' | 'planet' | 'dwarf-planet' | 'small-body' | 'moon';
export type ClusterLayer = 'galaxies' | 'gas' | 'mass';

export type BodySilhouette = 'irregular' | 'lobed' | 'rounded-box';

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
  /** hidden 은 대기에 가려진 지도라 초점일 때 버튼으로만 켠다. */
  surfaceMap?: { file: string; longitudeOffset?: number; fillMissing?: boolean; hidden?: boolean };
  surfaceFeatures?: 'saturn' | 'mars' | 'neptune' | 'io' | 'europa';
  polarCaps?: boolean;
  /** 초점 시 연출. red-spot 은 대적점 쪽으로 카메라를 돌리고, ice-plumes 는 얼음 분출을 그린다. */
  surfaceEffect?: 'red-spot' | 'ice-plumes';
  /** 소형 천체의 구면 변형 형태. 시드는 rockySurface[0]. */
  silhouette?: BodySilhouette;
  rockySurface?: readonly [seed: number, brightDeposits: number, contrast: number, craters: number];
  cloudBands?: readonly [seed: number, frequency: number, turbulence: number, contrast: number];
  /** 카메라 초점 거리 = displayRadius × focusScale (기본 6.75). */
  focusScale?: number;
  mass?: CatalogText;
  spinNote?: CatalogText;
  stellarPulseSeconds?: number;
  stellar?: {
    evolutionaryStage: CatalogText;
    spectralType: CatalogText;
    temperatureK: number;
    luminosityWatts: number;
    emissionColor: string;
    glowStrength?: number;
    poleSpinDays?: number;
    /** 홍염·태양풍·활동 주기 미리보기를 켠다. */
    prominences?: boolean;
    photosphere?: {
      seed: number;
      granuleScale: number; // Zero selects a smooth photosphere.
      activeRegions: number;
      flarePreview?: boolean;
    };
  };
  /** 은하 장면의 기준 항성 공전. color 는 궤도선·범례 색. */
  galacticOrbit?: { radiusKpc: number; periodYears: number; color: string; source: Source };
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
  /** 모항성계: 천체 이름표와 크기 비교를 켠다. */
  home?: boolean;
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
  /** 은하군(galaxy-associations)에 속하지 않은 은하만 — 초은하단 지도에 따로 표시하고 그 지도로 나간다. */
  superclusterId?: string;
  morphology?: 'barred-spiral' | 'open-spiral' | 'barred-irregular' | 'irregular' | 'compact-elliptical' | 'dwarf-elliptical' | 'giant-elliptical' | 'dust-lane-elliptical';
  modelRadiusKpc: number;
  /** 원반 바깥쪽 색. */
  color: string;
  /** 국부은하군 장면에서 원반의 X축 기울기(라디안). */
  diskTilt?: number;
  /** blendProcedural: 상세 원반에서 관측 이미지 위에 절차 생성 은하를 겹쳐 그린다. */
  diskObservation?: { file: string; previewFile?: string; center: readonly [number, number]; span: readonly [number, number]; rotation?: number; blendProcedural?: boolean };
  /** 형태(morphology) 기본값 위에 덮어쓰는 원반 모형 값. */
  structure?: Partial<GalaxyStructure>;
  /** 램 압력으로 벗겨진 가스 꼬리. twin 이면 두 갈래. */
  ramPressureTail?: { twin?: boolean };
  sources: readonly Source[];
};

/** 은하 입자 원반 모형의 형태 값. */
export type GalaxyStructure = {
  shape: 'spiral' | 'irregular' | 'elliptical';
  axis: number;
  thickness: number;
  core: number;
  asymmetry: number;
  arms: number;
  winding: number;
  bar: number;
  dust: number;
  ring: number;
  wind: number;
  phase: number;
};

/** 항성계를 품어 은하 ↔ 항성계 줌 전환이 되는 은하. */
export type HostGalaxy = Galaxy & {
  /** 은하 공전 기준 항성계(줌인 대상). */
  systemId: string;
  /** 기준 항성계 주변 거리 지도. 계에 `neighborhood` 가 있으면 포함된다. */
  neighborhood: { name: CatalogText; summary: CatalogText; source: Source };
  /** 은하 장면 상세 패널에서 summary 앞에 놓는 문단. */
  notes: readonly CatalogText[];
  demoYearsPerSecond: number;
  center: {
    id: string;
    name: CatalogText;
    distanceLightYears: number;
    massSolar: number;
    shadowDiameterMicroarcseconds: number;
    observationMaps?: { intensity: string; polarization: string };
    sources: readonly Source[];
  };
};

export type LocalGroup = {
  name: CatalogText;
  summary: CatalogText;
  /** 첫 항목이 기준 은하(거리 0). */
  galaxies: readonly [HostGalaxy, ...Galaxy[]];
  /** galaxies 중 작은 왜소은하(장면에서 미리보기로만 그린다). */
  dwarfs: readonly Galaxy[];
  source: Source;
};

/** 은하 안의 성운·잔해·블랙홀 등. galaxyId 가 없으면 우리은하. parentObjectId 는 함께 표시되는 상위 천체. */
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
    | 'wolf-rayet'
    | 'light-echo'
    | 'debris-disk'
    | 'pulsar-wind-nebula'
    | 'x-ray-binary'
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
  observationStatus: ObservationStatus;
  radiusSolar?: number;
  radiusUncertaintySolar?: number;
  radiusBasis?: 'estimate' | 'model-assumption';
  distanceAssumed?: boolean;
  radiusKm?: number;
  spinSeconds?: number;
  variabilityDays?: number;
  observationImage?: {
    file: string;
    telescope?: 'hubble' | 'chandra' | 'eso';
    shape:
      | 'crab'
      | 'ring'
      | 'pillars'
      | 'ejecta'
      | 'nursery'
      | 'hourglass'
      | 'bipolar-jet'
      | 'shocked-shell'
      | 'southern-ring'
      | 'dust-spiral'
      | 'edge-on-disk'
      | 'homunculus'
      | 'light-echo'
      | 'cats-eye'
      | 'debris-disk'
      | 'vela-wind'
      | 'butterfly'
      | 'horsehead'
      | 'wolf-rayet-ejecta'
      | 'tycho-shell'
      | 'helix'
      | 'sn-1006-shell'
      | 'ngc-346-ridges'
      | 'jewel-bug'
      | 'wind-bubble'
      | 'oxygen-remnant'
      | 'symbiotic-outflow'
      | 'protostar-bows';
  };
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
  remnantPulsar?: { position: readonly [number, number, number]; color: string };
  /** 성단 별 분포 모델. 없으면 kind 기본 모양. */
  clusterModel?: 'pleiades' | '47-tucanae' | 'omega-centauri';
  /** 항성풍 볼륨 모양과 따뜻한(적색) 헤일로 여부. */
  stellarWind?: { shape: 'betelgeuse-plume' | 'rigel-wind'; warm: boolean };
  /** 빔 대신 회전하는 열 반점 표면으로 그리는 중성자별. */
  thermalSurface?: boolean;
  /** 항성 상세 모델 카메라 거리. 없으면 photosphere 유무로 정한다. */
  modelCameraDistance?: number;
  accretionDisk?: AccretionDisk;
  sources: readonly Source[];
};

/** 강착원반 시각 회전 속도·반경 폭·대비와 관측 이미지, 제트 모양. */
export type AccretionDisk = {
  rate: number;
  width: number;
  contrast: number;
  observationMap?: string;
  jet?: { map: string; counterjet: number; collimation: number };
};

/** 초은하단 지도 위 은하군·은하단(첫 member 가 지도 기준 은하). */
export type GalaxyAssociation = {
  id: string;
  mapRegionId: string;
  name: CatalogText;
  aliases?: readonly string[];
  summary?: CatalogText;
  members: readonly Galaxy[];
  gridRadiusMly: number;
  volumeMembers?: boolean;
  illustrativeDepthMly?: number;
  sources: readonly Source[];
};

export type Supercluster = {
  id: string;
  flowModel?: 'laniakea';
  /** 흐름 모형이 이어 붙는 은하군·은하단 id(galaxyAssociations). norma 는 흐름이 모이는 수렴점. */
  flowAnchors?: { norma: string; virgo: string; hydra: string; fornax: string };
  name: CatalogText;
  spanMly: number;
  gridRadiusMly: number;
  zoomOutMly: number;
  zoomInMly: number;
  summary: CatalogText;
  sources: readonly Source[];
};

export type ObservableUniverse = { name: CatalogText; radiusMillionLightYears: number; sources: readonly Source[] };

type DistantObjectFields = {
  id: string;
  observationScale?: { lightYears: number; spanInModelRadii: number; reference: 'field' | 'ring' };
  aliases?: readonly string[];
  name: CatalogText;
  observationStatus: ObservationStatus;
  redshift: number;
  rightAscension: number;
  declination: number;
  color: string;
  summary: CatalogText;
  sources: readonly Source[];
};

export type DistantObject = DistantObjectFields &
  (
    | { kind: 'quasar'; visibleJet: boolean; blackHoleMassSolar?: number; accretionDisk: AccretionDisk }
    | { kind: 'early-galaxy'; ultravioletHalfLightRadiusParsecs: number }
    | { kind: 'ring-galaxy'; observationImage: string }
    | { kind: 'galaxy-group'; observationImage: string }
    | { kind: 'galaxy-cluster'; clusterModel: 'pandora' | 'bullet' | 'macs-j0416' }
    | { kind: 'galaxy-merger'; observationImage: string }
  );
