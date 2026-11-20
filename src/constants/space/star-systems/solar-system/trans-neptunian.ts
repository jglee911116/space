import { message } from '@/i18n/messages';
import type { Body, OrbitElements, Source } from '../../types';
import { KM_PER_AU } from '../../units';
import { JPL_SATELLITE_ELEMENTS, JPL_SATELLITE_PHYSICAL } from './sources';

export const KUIPER_BELT: Source = { label: message('catalog.trans-neptunian.kuiper-belt.source.nasa-kuiper-belt'), href: 'https://science.nasa.gov/solar-system/kuiper-belt/facts/' };
const SBDB: Source = { label: message('catalog.trans-neptunian.sbdb.source.jpl-small-body-orbits'), href: 'https://ssd.jpl.nasa.gov/sb/orbits.html' };
const HORIZONS: Source = { label: 'JPL Horizons', href: 'https://ssd.jpl.nasa.gov/horizons/' };
const PLUTO_FACTS: Source = { label: message('catalog.trans-neptunian.pluto-facts.source.nasa-pluto'), href: 'https://science.nasa.gov/dwarf-planets/pluto/facts/' };
const HAUMEA_SHAPE: Source = { label: message('catalog.trans-neptunian.haumea-shape.source.haumea-s-shape-and-rings'), href: 'https://www.nature.com/articles/nature24051' };
const DWARF_PHYSICAL: Source = { label: message('catalog.trans-neptunian.dwarf-physical.source.jpl-dwarf-planet-physical-parameters'), href: 'https://ssd.jpl.nasa.gov/planets/phys_par.html' };
const ERIS_SPIN: Source = { label: message('catalog.trans-neptunian.eris-spin.source.eris-rotation-and-radius'), href: 'https://doi.org/10.1051/0004-6361/202245234' };
const ORCUS_SIZE: Source = { label: message('catalog.trans-neptunian.orcus-size.source.orcus-size-estimate'), href: 'https://www.sciencedirect.com/science/article/abs/pii/S0019103517307996' };
const QUAOAR_RINGS: Source = { label: message('catalog.trans-neptunian.quaoar-rings.source.quaoar-s-rings'), href: 'https://doi.org/10.1051/0004-6361/202346365' };
const GONGGONG_SIZE: Source = { label: message('catalog.trans-neptunian.gonggong-size.source.gonggong-size-estimate'), href: 'https://www.hou.usra.edu/meetings/lpsc2021/pdf/2525.pdf' };
const SEDNA_SIZE: Source = {
  label: message('catalog.trans-neptunian.sedna-size.source.sedna-size-estimate'),
  href: 'https://www.research.unipd.it/retrieve/db914215-82a6-4901-b5f5-e15994cea67e/unpaywall-bitstream-1137866867.pdf',
};
const ARROKOTH_FACTS: Source = { label: message('catalog.trans-neptunian.arrokoth-facts.source.nasa-arrokoth'), href: 'https://science.nasa.gov/solar-system/kuiper-belt/arrokoth-2014-mu69/facts/' };

const NEW_HORIZONS_MOONS: Source = { label: message('catalog.trans-neptunian.new-horizons-moons.source.new-horizons-moon-observations'), href: 'https://arxiv.org/abs/1604.05366' };
const HAUMEA_MOONS: Source = { label: message('catalog.trans-neptunian.haumea-moons.source.haumea-s-moon-orbits'), href: 'https://doi.org/10.1088/0004-6256/137/6/4766' };
const HIIAKA_SPIN: Source = { label: message('catalog.trans-neptunian.hiiaka-spin.source.hi-iaka-rotation'), href: 'https://doi.org/10.3847/0004-6256/152/6/195' };
const DYSNOMIA_ORBIT: Source = { label: message('catalog.trans-neptunian.dysnomia-orbit.source.dysnomia-s-orbit'), href: 'https://ntrs.nasa.gov/citations/20210012932' };
const DYSNOMIA_SIZE: Source = { label: message('catalog.trans-neptunian.dysnomia-size.source.dysnomia-size-estimate'), href: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10651115/' };

const J2000 = 2_451_545;
const SBDB_EPOCH = 2_461_200.5;

type Elements = [axisAu: number, eccentricity: number, inclination: number, node: number, perihelion: number, meanAnomaly: number, periodDays: number];

function orbit([axisAu, eccentricity, inclination, node, perihelion, meanAnomaly, periodDays]: Elements, epoch = SBDB_EPOCH): OrbitElements {
  const perihelionLongitude = node + perihelion;
  return {
    axisAu,
    eccentricity,
    inclination,
    ascendingNode: node,
    perihelionLongitude,
    meanLongitude: perihelionLongitude + meanAnomaly - ((epoch - J2000) * 360) / periodDays,
    periodDays,
  };
}

const note = message('catalog.trans-neptunian.note.text');
const smallBodyNote = message('catalog.trans-neptunian.small-body-note.text');

export const transNeptunianBodies: Body[] = [
  {
    id: 'pluto',
    name: message('catalog.trans-neptunian.pluto.name'),
    kind: 'dwarf-planet',
    parent: 'sun',
    region: 'outer',
    radiusKm: 1188.3,
    spinDays: 6.387222,
    tilt: 119.6,
    displayRadius: 0.19,
    appearance: 'pluto',
    colors: ['#583a31', '#aa806a', '#f5e1bd'],
    orbit: orbit([39.5712615, 0.2494485, 17.235653, 110.03994, 115.178666, 14.143655, 90921.851], J2000),
    note: note,
    sources: [PLUTO_FACTS, HORIZONS],
  },
  {
    id: 'haumea',
    name: message('catalog.trans-neptunian.haumea.name'),
    kind: 'dwarf-planet',
    parent: 'sun',
    region: 'outer',
    radiusKm: 797.5,
    spinDays: 3.9154 / 24,
    tilt: 28,
    displayRadius: 0.145,
    appearance: 'rock',
    colors: ['#5a6c77', '#99b4bc', '#edf4e9'],
    orbit: orbit([43.0602902365, 0.1944430149, 28.2084739304, 121.7860561329, 240.6905472509, 223.2104118812, 103208.1173403618]),
    shape: [1161 / 797.5, 513 / 797.5, 852 / 797.5],
    rings: [{ inner: 2252 / 797.5, outer: 2322 / 797.5, color: '#bcc9cc', opacity: 0.75 }],
    focusScale: 10,
    note: note,
    sources: [HAUMEA_SHAPE, SBDB],
  },
  {
    id: 'makemake',
    name: message('catalog.trans-neptunian.makemake.name'),
    kind: 'dwarf-planet',
    parent: 'sun',
    region: 'outer',
    radiusKm: 714,
    spinDays: 22.8266 / 24,
    tilt: 0,
    displayRadius: 0.13,
    appearance: 'rock',
    colors: ['#754133', '#a96c59', '#e9b293'],
    orbit: orbit([45.570933173, 0.1588889954, 29.0278560374, 79.2948338209, 297.0922733397, 169.9379962048, 112364.8068762869]),
    note: note,
    sources: [DWARF_PHYSICAL, SBDB],
  },
  {
    id: 'eris',
    name: message('catalog.trans-neptunian.eris.name'),
    kind: 'dwarf-planet',
    parent: 'sun',
    region: 'outer',
    radiusKm: 1163,
    spinDays: 15.785899,
    tilt: 78.29,
    displayRadius: 0.185,
    appearance: 'rock',
    colors: ['#576978', '#becfd2', '#f3f7f2'],
    orbit: orbit([67.9339468785, 0.4382385348, 43.9258279472, 36.0047704442, 150.794923584, 211.774434275, 204516.6629430732]),
    note: note,
    sources: [ERIS_SPIN, SBDB],
  },
  {
    id: 'orcus',
    name: message('catalog.trans-neptunian.orcus.name'),
    kind: 'small-body',
    parent: 'sun',
    region: 'outer',
    radiusKm: 458.5,
    spinDays: 13.188 / 24,
    tilt: 0,
    displayRadius: 0.105,
    appearance: 'rock',
    colors: ['#4e4c59', '#868591', '#c4c3cf'],
    orbit: orbit([39.3768653791, 0.2205240628, 20.5568101961, 268.4053519456, 73.5684860671, 189.0972913554, 90252.6865068851]),
    note: smallBodyNote,
    sources: [ORCUS_SIZE, SBDB],
  },
  {
    id: 'quaoar',
    name: message('catalog.trans-neptunian.quaoar.name'),
    kind: 'small-body',
    parent: 'sun',
    region: 'outer',
    radiusKm: 555,
    spinDays: 8.84 / 24,
    tilt: 0,
    displayRadius: 0.116,
    appearance: 'rock',
    colors: ['#563b3a', '#976d66', '#dcb3a0'],
    orbit: orbit([43.1561762267, 0.0352001926, 7.9915758007, 188.9191248092, 163.2090461065, 292.8487574843, 103553.0425468722]),
    rings: [
      { inner: 4.52, outer: 4.57, color: '#a89a99', opacity: 0.47 },
      { inner: 7.34, outer: 7.44, color: '#c2a39b', opacity: 0.63 },
    ],
    focusScale: 24,
    note: smallBodyNote,
    sources: [QUAOAR_RINGS, SBDB],
  },
  {
    id: 'gonggong',
    name: message('catalog.trans-neptunian.gonggong.name'),
    kind: 'small-body',
    parent: 'sun',
    region: 'outer',
    radiusKm: 615,
    spinDays: 22.4 / 24,
    tilt: 0,
    displayRadius: 0.122,
    appearance: 'rock',
    colors: ['#492822', '#8f4d43', '#cf7c6d'],
    orbit: orbit([66.8666656777, 0.504251, 30.8990672117, 336.8383156186, 206.6232839774, 111.6645415685, 199716.0317096358]),
    note: smallBodyNote,
    sources: [GONGGONG_SIZE, SBDB],
  },
  {
    id: 'sedna',
    name: message('catalog.trans-neptunian.sedna.name'),
    kind: 'small-body',
    parent: 'sun',
    region: 'outer',
    radiusKm: 497.5,
    spinDays: 10.273 / 24,
    tilt: 0,
    displayRadius: 0.11,
    appearance: 'rock',
    colors: ['#4b2523', '#8d473c', '#d2856a'],
    orbit: orbit([543.7195289105, 0.8598824585, 11.9252758285, 144.5061662674, 311.098772594, 358.5956944005, 4630851.1835909151]),
    note: smallBodyNote,
    sources: [SEDNA_SIZE, SBDB],
  },
  {
    id: 'arrokoth',
    name: message('catalog.trans-neptunian.arrokoth.name'),
    kind: 'small-body',
    parent: 'sun',
    region: 'outer',
    radiusKm: 17,
    lengthKm: 34,
    spinDays: 15.918 / 24,
    tilt: 98,
    displayRadius: 0.082,
    appearance: 'rock',
    colors: ['#4e3027', '#8c5441', '#c88669'],
    orbit: orbit([44.0525783599, 0.0355571765, 2.4506139247, 159.0377267891, 188.8507463366, 310.9839309924, 106796.1078945169]),
    lobes: [
      { offset: [-0.32, 0, 0], shape: [0.67, 0.3, 0.6] },
      { offset: [0.53, 0.12, 0], shape: [0.45, 0.35, 0.42] },
    ],
    note: message('catalog.trans-neptunian.arrokoth.note'),
    sources: [ARROKOTH_FACTS, SBDB],
  },
];

type OuterMoon = Pick<Body, 'id' | 'name' | 'parent' | 'radiusKm' | 'spinDays' | 'displayRadius' | 'shape'>;

function outerMoon(
  body: OuterMoon,
  [axisKm, eccentricity, inclination, node, perihelion, meanAnomaly, periodDays]: Elements,
  sources: readonly Source[],
  referencePlane: OrbitElements['referencePlane'] | 'ecliptic' = 'parent-equator',
  tilt = 0,
): Body {
  return {
    ...body,
    kind: 'moon',
    tilt,
    appearance: 'craters',
    colors: ['#4e4e53', '#969399', '#d4cbd0'],
    orbit: { ...orbit([axisKm / KM_PER_AU, eccentricity, inclination, node, perihelion, meanAnomaly, periodDays], J2000), referencePlane: referencePlane === 'ecliptic' ? undefined : referencePlane },
    note: message('catalog.trans-neptunian.note'),
    sources,
  };
}

const plutoMoonSources = [JPL_SATELLITE_PHYSICAL, JPL_SATELLITE_ELEMENTS, NEW_HORIZONS_MOONS];
const haumeaMoonSources = [HAUMEA_MOONS, HIIAKA_SPIN];

export const transNeptunianMoons: Body[] = [
  outerMoon(
    { id: 'charon', name: message('catalog.trans-neptunian.charon.name'), parent: 'pluto', radiusKm: 606, spinDays: 6.387222, displayRadius: 0.09 },
    [19600, 0, 0, 0, 0, 304.1, 6.387222],
    [JPL_SATELLITE_PHYSICAL, JPL_SATELLITE_ELEMENTS, PLUTO_FACTS],
  ),
  outerMoon(
    { id: 'styx', name: message('catalog.trans-neptunian.styx.name'), parent: 'pluto', radiusKm: 5.2, spinDays: 3.24, displayRadius: 0.025, shape: [1.43, 0.71, 0.8] },
    [43200, 0.025, 0, 0, 322.5, 358.1, 20.16],
    plutoMoonSources,
    'parent-equator',
    85,
  ),
  outerMoon(
    { id: 'nix', name: message('catalog.trans-neptunian.nix.name'), parent: 'pluto', radiusKm: 18, spinDays: 1.829, displayRadius: 0.032, shape: [1.29, 0.85, 0.9] },
    [49300, 0.015, 0, 0, 31.4, 338.2, 24.85],
    plutoMoonSources,
    'parent-equator',
    85,
  ),
  outerMoon(
    { id: 'kerberos', name: message('catalog.trans-neptunian.kerberos.name'), parent: 'pluto', radiusKm: 6, spinDays: 5.31, displayRadius: 0.026, shape: [1.56, 0.74, 0.82] },
    [58300, 0.01, 0.4, 314.3, 32.1, 276.1, 32.17],
    plutoMoonSources,
    'parent-equator',
    85,
  ),
  outerMoon(
    { id: 'hydra', name: message('catalog.trans-neptunian.hydra.name'), parent: 'pluto', radiusKm: 18.5, spinDays: 0.4295, displayRadius: 0.033, shape: [1.55, 0.6, 1.07] },
    [65200, 0.009, 0.3, 114.3, 139.3, 335, 38.2],
    plutoMoonSources,
    'parent-equator',
    85,
  ),
  // Haumea's satellites use inclinations relative to its equator and illustrative initial phases.
  outerMoon({ id: 'namaka', name: message('catalog.trans-neptunian.namaka.name'), parent: 'haumea', radiusKm: 75, displayRadius: 0.035 }, [25657, 0.249, 13, 0, 0, 40, 18.2783], haumeaMoonSources),
  outerMoon(
    { id: 'hiiaka', name: message('catalog.trans-neptunian.hiiaka.name'), parent: 'haumea', radiusKm: 150, spinDays: 0.408, displayRadius: 0.045 },
    [49880, 0.0513, 2, 0, 0, 145, 49.462],
    haumeaMoonSources,
  ),
  // Plane from the measured ecliptic pole (49.12°, 28.41°). Phase is illustrative.
  outerMoon(
    { id: 'dysnomia', name: message('catalog.trans-neptunian.dysnomia.name'), parent: 'eris', radiusKm: 350, displayRadius: 0.06 },
    [37273, 0.0062, 61.59, 139.12, 0, 125.78, 15.785899],
    [DYSNOMIA_ORBIT, DYSNOMIA_SIZE],
    'ecliptic',
  ),
];
