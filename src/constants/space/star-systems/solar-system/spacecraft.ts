import { message } from '@/i18n/messages';
import type { Body, Source } from '../../types';
import { EARTH_RADIUS_KM, KM_PER_AU } from '../../units';

import { NEW_HORIZONS_TRAJECTORY, VOYAGER_1_TRAJECTORY, VOYAGER_2_TRAJECTORY } from './trajectories';

const HORIZONS: Source = { label: 'NASA/JPL · Horizons', href: 'https://ssd.jpl.nasa.gov/horizons/' };
// 고도 약 483 km·궤도 경사 28.5°(NASA). 주기는 이 고도의 케플러 주기(약 94.3분, NASA '약 95분'). 궤도 위상·승교점은 실제와 맞추지 않는다.
const HUBBLE_AXIS_KM = EARTH_RADIUS_KM + 483;
const EARTH_GM_KM3_S2 = 398_600.4418;

const VOYAGER_MODEL: Source = { label: 'NASA 3D Resources · Voyager Probe (A)', href: 'https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Voyager%20Probe%20(A)' };
// 두 모형 모두 고이득 안테나 접시가 XZ 면에 놓여 +Y 로 열린다 — 순항 중에는 지구를 향한다.
const ANTENNA_TO_EARTH = { axis: [0, 1, 0], target: 'earth' } as const;

export const spacecraft: readonly Body[] = [
  {
    id: 'voyager-1',
    name: message('catalog.spacecraft.voyager-1.name'),
    kind: 'spacecraft',
    parent: 'sun',
    region: 'outer',
    tilt: 0,
    displayRadius: 0.08,
    colors: ['#6f6a5e', '#c9c1ad', '#f2ead6'],
    trajectory: { samples: VOYAGER_1_TRAJECTORY },
    shapeModel: '/models/star-systems/solar/spacecraft/voyager/voyager-nasa.glb',
    shapeModelPointing: ANTENNA_TO_EARTH,
    note: message('catalog.spacecraft.voyager-1.note'),
    sources: [HORIZONS, { label: 'NASA · Voyager', href: 'https://science.nasa.gov/mission/voyager/' }, VOYAGER_MODEL],
  },
  {
    id: 'voyager-2',
    name: message('catalog.spacecraft.voyager-2.name'),
    kind: 'spacecraft',
    parent: 'sun',
    region: 'outer',
    tilt: 0,
    displayRadius: 0.08,
    colors: ['#6f6a5e', '#c9c1ad', '#f2ead6'],
    trajectory: { samples: VOYAGER_2_TRAJECTORY },
    shapeModel: '/models/star-systems/solar/spacecraft/voyager/voyager-nasa.glb',
    shapeModelPointing: ANTENNA_TO_EARTH,
    note: message('catalog.spacecraft.voyager-2.note'),
    sources: [HORIZONS, { label: 'NASA · Voyager', href: 'https://science.nasa.gov/mission/voyager/' }, VOYAGER_MODEL],
  },
  {
    id: 'new-horizons',
    name: message('catalog.spacecraft.new-horizons.name'),
    kind: 'spacecraft',
    parent: 'sun',
    region: 'outer',
    tilt: 0,
    displayRadius: 0.08,
    colors: ['#6b5f4a', '#c7b48c', '#f0dfb8'],
    trajectory: { samples: NEW_HORIZONS_TRAJECTORY },
    shapeModel: '/models/star-systems/solar/spacecraft/new-horizons/new-horizons-nasa.glb',
    shapeModelPointing: ANTENNA_TO_EARTH,
    note: message('catalog.spacecraft.new-horizons.note'),
    sources: [
      HORIZONS,
      { label: 'NASA · New Horizons', href: 'https://science.nasa.gov/mission/new-horizons/' },
      { label: 'NASA · New Horizons 3D Model', href: 'https://science.nasa.gov/resource/new-horizons-3d-model/' },
    ],
  },
  {
    // L2 헤일로 궤도 대신, 지구에서 늘 태양 반대쪽 약 150만 km 에 두는 단순 모형(지구와 같은 주기·평균 황경).
    id: 'jwst',
    name: message('catalog.spacecraft.jwst.name'),
    aliases: ['JWST', 'Webb'],
    kind: 'spacecraft',
    parent: 'earth',
    tilt: 0,
    displayRadius: 0.012,
    colors: ['#6e5a2a', '#d8b25a', '#ffe08a'],
    orbit: { axisAu: 0.01, eccentricity: 0, inclination: 0, meanLongitude: 100.46457166, perihelionLongitude: 0, ascendingNode: 0, periodDays: 365.256 },
    // NASA 3D Resources 모형(B). 다섯 겹 차양막이 XZ 면에 펼쳐져 있고 거울은 +Y, 우주선 본체와 차양막의 태양 쪽 면은 −Y.
    shapeModel: '/models/star-systems/solar/spacecraft/jwst/jwst-nasa.glb',
    shapeModelPointing: { axis: [0, -1, 0], target: 'sun' },
    note: message('catalog.spacecraft.jwst.note'),
    sources: [
      { label: 'NASA · Webb Orbit', href: 'https://science.nasa.gov/mission/webb/orbit/' },
      { label: 'NASA 3D Resources · James Webb Space Telescope (B)', href: 'https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/James%20Webb%20Space%20Telescope%20(B)' },
    ],
  },
  {
    id: 'hubble',
    name: message('catalog.spacecraft.hubble.name'),
    aliases: ['HST', 'Hubble'],
    kind: 'spacecraft',
    parent: 'earth',
    tilt: 0,
    displayRadius: 0.012,
    colors: ['#5c5f66', '#b9bcc2', '#eef0f3'],
    orbit: {
      axisAu: HUBBLE_AXIS_KM / KM_PER_AU,
      eccentricity: 0.0003,
      inclination: 28.5,
      meanLongitude: 0,
      perihelionLongitude: 0,
      ascendingNode: 0,
      periodDays: (2 * Math.PI * Math.sqrt(HUBBLE_AXIS_KM ** 3 / EARTH_GM_KM3_S2)) / 86_400,
      referencePlane: 'parent-equator',
    },
    // NASA 3D Resources 모형(A). 경통이 +Y, 입구 뚜껑이 +Y 끝 — 뒤쪽(−Y)을 지구로 두어 입구가 지구 반대쪽 하늘을 본다(관측 방향은 단순화).
    shapeModel: '/models/star-systems/solar/spacecraft/hubble/hubble-nasa.glb',
    shapeModelPointing: { axis: [0, -1, 0], target: 'earth' },
    note: message('catalog.spacecraft.hubble.note'),
    sources: [
      { label: 'NASA · Hubble Observatory', href: 'https://science.nasa.gov/mission/hubble/observatory/' },
      { label: 'NASA 3D Resources · Hubble Space Telescope (A)', href: 'https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Hubble%20Space%20Telescope%20(A)' },
    ],
  },
];
