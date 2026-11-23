import { message } from '@/i18n/messages';
import { dwarfGalaxies, type DwarfRow } from './local-dwarfs';

export const ngc3109Study = { label: 'Kanehisa et al. · NGC 3109 association', href: 'https://academic.oup.com/mnras/article/510/2/1923/6449378' };
const leoPSources = [
  { label: 'McQuinn et al. · Leo P distance', href: 'https://doi.org/10.1088/0004-637x/812/2/158' },
  { label: 'CDS SIMBAD · Leo P position', href: 'https://simbad.u-strasbg.fr/simbad/sim-basic?Ident=Leo+P' },
];

const rows: readonly DwarfRow[] = [
  ['ngc-3109', 'NGC 3109', 150.77875, -26.159722, 1300, 1.626, 'barred-spiral', ['DDO 236', 'UGCA 194']],
  ['sextans-a', 'Sextans A', 152.753333, -4.692778, 1432, 1.029, 'irregular', ['UGCA 205', 'DDO 75']],
  ['sextans-b', 'Sextans B', 150.000417, 5.332222, 1426, 0.44, 'irregular', ['UGC 5373', 'DDO 70']],
  ['antlia-dwarf', 'Antlia Dwarf', 151.017083, -27.331111, 1349, 0.471, 'irregular', ['공기펌프자리 왜소은하']],
  ['leo-p', 'Leo P', 155.438012, 18.088025, 1620, 0.15, 'irregular', undefined, { sources: leoPSources, replacesCatalog: true }],
];

export const ngc3109Members = dwarfGalaxies(rows, message('catalog.dwarf.ngc-3109-member')).map((galaxy) => ({ ...galaxy, sources: [...galaxy.sources, ngc3109Study] }));
