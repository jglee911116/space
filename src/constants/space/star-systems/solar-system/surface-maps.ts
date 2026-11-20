import type { Body, Source } from '../../types';

const textureRoot = '/textures/galaxies/milky-way/systems/solar';

const scopeSource: Source = { label: 'Solar System Scope · CC BY 4.0', href: 'https://www.solarsystemscope.com/textures/' };
const scopePlanets = new Set(['mercury', 'venus', 'earth', 'mars', 'saturn', 'uranus', 'neptune']);
const jplMoonSystems: Record<string, string> = {
  io: 'jupiter', europa: 'jupiter', ganymede: 'jupiter', callisto: 'jupiter',
  mimas: 'saturn', enceladus: 'saturn', tethys: 'saturn', dione: 'saturn', rhea: 'saturn', iapetus: 'saturn',
  miranda: 'uranus', ariel: 'uranus', umbriel: 'uranus', titania: 'uranus', oberon: 'uranus',
  triton: 'neptune',
};

export function withSolarSurfaceMap(body: Body): Body {
  const { id, sources } = body;
  if (id === 'jupiter') {
    // The photographed Great Red Spot (u ≈ 0.364) faces +Z (sphere u = 0.25).
    return { ...body, surfaceMap: { file: `${textureRoot}/jupiter/jupiter-cassini-pia07782.jpg`, longitudeOffset: 0.114 } };
  }
  if (scopePlanets.has(id)) return { ...body, surfaceMap: { file: `${textureRoot}/${id}/${id}-sss.jpg` }, sources: [...sources, scopeSource] };
  if (id === 'moon') {
    return { ...body, surfaceMap: { file: `${textureRoot}/moon/moon-lroc.jpg` }, sources: [...sources, { label: 'NASA SVS / LROC · Ernie Wright', href: 'https://svs.gsfc.nasa.gov/4720/' }] };
  }
  if (id === 'pluto') {
    return { ...body, surfaceMap: { file: `${textureRoot}/pluto/pluto-new-horizons.jpg`, fillMissing: true }, sources: [...sources, { label: 'NASA/JHUAPL/SwRI · New Horizons', href: 'https://science.nasa.gov/resource/pluto-global-color-map/' }] };
  }
  const system = jplMoonSystems[id];
  if (system) {
    const source = { label: 'NASA/JPL · Solar System Simulator', href: `https://maps.jpl.nasa.gov/tmaps/${system}.html` };
    return { ...body, surfaceMap: { file: `${textureRoot}/${id}/${id}-jpl.jpg`, fillMissing: true }, sources: [...sources, source] };
  }
  return body;
}
