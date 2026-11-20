import { message } from '@/i18n/messages';
import type { OortCloud } from '../../types';

export const oortCloud: OortCloud = {
  innerEdgeAu: [2_000, 5_000],
  outerEdgeAu: [10_000, 100_000],
  source: { label: message('catalog.oort-cloud.oort-cloud.source.nasa-oort-cloud'), href: 'https://science.nasa.gov/solar-system/oort-cloud/facts/' },
};
