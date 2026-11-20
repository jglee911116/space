import { message } from '@/i18n/messages';
import type { StarSystem } from '../../types';
import { moons } from './moons';
import { oortCloud } from './oort-cloud';
import { planets } from './planets';
import { JPL_ELEMENTS, NASA_FACTSHEET } from './sources';
import { sun } from './sun';
import { withSolarSurfaceMap } from './surface-maps';
import { KUIPER_BELT, transNeptunianBodies, transNeptunianMoons } from './trans-neptunian';

export const solarSystem: StarSystem = {
  id: 'solar',
  name: message('catalog.solar-system.solar.name'),
  overviewDistance: 875,
  outerRegion: { name: message('catalog.solar-system.outer-region.name'), beltName: message('catalog.solar-system.solar.beltName'), overviewDistance: 2950, beltAu: [30, 50], source: KUIPER_BELT },
  oortCloud,
  bodies: [sun, ...planets, ...transNeptunianBodies, ...moons, ...transNeptunianMoons].map(withSolarSurfaceMap),
  sources: [NASA_FACTSHEET, JPL_ELEMENTS],
};
