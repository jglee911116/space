import { message } from '@/i18n/messages';
import type { StarSystem } from '../../types';
import { bennu } from './bennu';
import { ceres } from './ceres';
import { skyEvents } from './events';
import { moons } from './moons';
import { oortCloud } from './oort-cloud';
import { planets } from './planets';
import { JPL_ELEMENTS, NASA_FACTSHEET } from './sources';
import { spacecraft } from './spacecraft';
import { sun } from './sun';
import { KUIPER_BELT, transNeptunianBodies, transNeptunianMoons } from './trans-neptunian';

export const solarSystem: StarSystem = {
  id: 'solar',
  home: true,
  name: message('catalog.solar-system.solar.name'),
  overviewDistance: 875,
  outerRegion: { name: message('catalog.solar-system.outer-region.name'), beltName: message('catalog.solar-system.solar.beltName'), overviewDistance: 2950, beltAu: [30, 50], source: KUIPER_BELT },
  oortCloud,
  events: skyEvents,
  bodies: [sun, ...planets, ceres, bennu, ...transNeptunianBodies, ...moons, ...transNeptunianMoons, ...spacecraft],
  sources: [NASA_FACTSHEET, JPL_ELEMENTS],
};
