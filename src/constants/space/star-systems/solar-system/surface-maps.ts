import { message } from '@/i18n/messages';
import type { Body, Source } from '../../types';

const assetGroup = { star: 'stars', planet: 'planets', moon: 'moons', 'dwarf-planet': 'dwarf-planets', 'small-body': 'small-bodies' } as const;

const scopeSource: Source = { label: 'Solar System Scope · CC BY 4.0', href: 'https://www.solarsystemscope.com/textures/' };
const scopePlanets = new Set(['mercury', 'venus', 'earth', 'mars', 'saturn', 'uranus', 'neptune']);
const jplMoonSystems: Record<string, string> = {
  io: 'jupiter', europa: 'jupiter', ganymede: 'jupiter', callisto: 'jupiter',
  mimas: 'saturn', tethys: 'saturn', dione: 'saturn', rhea: 'saturn', iapetus: 'saturn',
  miranda: 'uranus', ariel: 'uranus', umbriel: 'uranus', titania: 'uranus', oberon: 'uranus',
  triton: 'neptune',
};

export function withSolarSurfaceMap(body: Body): Body {
  const { id, sources } = body;
  const assetDirectory = `star-systems/solar/${assetGroup[body.kind]}/${id}`;
  const textures = `/textures/${assetDirectory}`;
  if (id === 'jupiter') {
    // The photographed Great Red Spot (u ≈ 0.364) faces +Z (sphere u = 0.25).
    return { ...body, surfaceMap: { file: `${textures}/jupiter-cassini-pia07782.jpg`, longitudeOffset: 0.114 } };
  }
  if (scopePlanets.has(id)) return { ...body, surfaceMap: { file: `${textures}/${id}-sss.jpg` }, sources: [...sources, scopeSource] };
  if (id === 'moon') {
    return { ...body, surfaceMap: { file: `${textures}/moon-lroc.jpg` }, sources: [...sources, { label: 'NASA SVS / LROC · Ernie Wright', href: 'https://svs.gsfc.nasa.gov/4720/' }] };
  }
  if (id === 'pluto' || id === 'charon') {
    const mosaic = {
      label: 'NASA/JHUAPL/SwRI/USGS · New Horizons 300 m mosaic',
      href: `https://astrogeology.usgs.gov/search/map/${id}_new_horizons_lorri_mvic_global_mosaic_300m`,
    };
    const colorMap = { label: 'NASA/JHUAPL/SwRI · Pluto color map', href: 'https://science.nasa.gov/resource/pluto-global-color-map/' };
    return {
      ...body,
      note: message('catalog.trans-neptunian.new-horizons.surface'),
      surfaceMap: { file: `${textures}/${id}-new-horizons.jpg` },
      sources: [...sources, mosaic, ...(id === 'pluto' ? [colorMap] : [])],
    };
  }
  if (id === 'phobos' || id === 'deimos' || id === 'arrokoth') {
    const href = id === 'arrokoth'
      ? 'https://science.nasa.gov/resource/arrokoth-3d-model/'
      : `https://science.nasa.gov/resource/${id}-mars-moon-3d-model/`;
    return { ...body, shapeModel: `/models/${assetDirectory}/${id}-nasa.glb`, sources: [...sources, { label: 'NASA · Observed 3D model', href }] };
  }
  if (id === 'titan') {
    return { ...body, note: message('catalog.titan.surfaceNote'), surfaceMap: { file: `${textures}/titan-cassini.jpg`, fillMissing: true, hidden: true }, sources: [...sources, {
      label: 'NASA/JPL-Caltech/Univ. Arizona · Cassini ISS',
      href: 'https://science.nasa.gov/resource/titan-mosaic-the-surface-under-the-haze/',
    }] };
  }
  if (id === 'enceladus') {
    return { ...body, note: message('catalog.enceladus.surfaceNote'), surfaceMap: { file: `${textures}/enceladus-cassini.jpg`, fillMissing: true }, sources: [...sources, {
      label: 'NASA/JPL-Caltech/SSI/Lunar and Planetary Institute · Cassini',
      href: 'https://science.nasa.gov/photojournal/color-maps-of-enceladus-2014/',
    }, { label: 'NASA/JPL · Cassini south polar jets', href: 'https://science.nasa.gov/resource/bursting-at-the-seams-the-geyser-basin-of-enceladus/' }] };
  }
  const system = jplMoonSystems[id];
  if (system) {
    const source = { label: 'NASA/JPL · Solar System Simulator', href: `https://maps.jpl.nasa.gov/tmaps/${system}.html` };
    return { ...body, surfaceMap: { file: `${textures}/${id}-jpl.jpg`, fillMissing: true }, sources: [...sources, source] };
  }
  return body;
}
