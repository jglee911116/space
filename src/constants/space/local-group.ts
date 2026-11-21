import { message } from '@/i18n/messages';
import { andromeda } from './galaxies/andromeda';
import { messier110, messier32 } from './galaxies/andromeda-satellites';
import { localDwarfs } from './galaxies/local-dwarfs';
import { largeMagellanicCloud, smallMagellanicCloud } from './galaxies/magellanic-clouds';
import { milkyWay } from './galaxies/milky-way';
import { triangulum } from './galaxies/triangulum';
import type { LocalGroup } from './types';

export const localGroup: LocalGroup = {
  name: message('catalog.local-group.local-group.name'),
  summary: message('catalog.local-group.local-group.summary'),
  galaxies: [milkyWay, largeMagellanicCloud, smallMagellanicCloud, andromeda, triangulum, messier32, messier110, ...localDwarfs],
  dwarfs: localDwarfs,
  source: { label: message('catalog.local-group.local-group.source.nasa-hubble-distance-to-m31'), href: 'https://science.nasa.gov/asset/hubble/compass-and-scale-image-of-andromeda/' },
};
