import { message } from '@/i18n/messages';
import { andromeda, largeMagellanicCloud, messier110, messier32, milkyWay, smallMagellanicCloud, triangulum } from './galaxies';
import type { LocalGroup } from './types';
import { localDwarfs } from './galaxies/local-dwarfs';

export const localGroup: LocalGroup = {
  name: message('catalog.local-group.local-group.name'),
  summary: message('catalog.local-group.local-group.summary'),
  galaxies: [milkyWay, largeMagellanicCloud, smallMagellanicCloud, andromeda, triangulum, messier32, messier110, ...localDwarfs],
  source: { label: message('catalog.local-group.local-group.source.nasa-hubble-distance-to-m31'), href: 'https://science.nasa.gov/asset/hubble/compass-and-scale-image-of-andromeda/' },
};
