import type { FeaturedObject } from '../types';
import { pleiades, herculesCluster, omegaCentauri, tucanae47 } from './star-clusters';
import { betaPictoris, betelgeuse, rigelA, uyScuti } from './stars';
import { j0740Pulsar, crabPulsar, rxJ1856, sgr1806, m87Star, velaPulsar, cygnusX1 } from './compact-objects';
import { ringNebula, pillarsOfCreation, crabNebula, sn1987a, ngc604, orionNebula, horseheadNebula, tychoRemnant, helixNebula, sn1006 } from './nebulae/classic';
import { webbNebulae } from './nebulae/webb';
import { hubbleNebulae } from './nebulae/hubble';

export const featuredObjects: readonly FeaturedObject[] = [
  pleiades,
  herculesCluster,
  omegaCentauri,
  tucanae47,
  ringNebula,
  helixNebula,
  betelgeuse,
  j0740Pulsar,
  pillarsOfCreation,
  crabNebula,
  crabPulsar,
  rxJ1856,
  sgr1806,
  rigelA,
  uyScuti,
  m87Star,
  sn1987a,
  ngc604,
  orionNebula,
  horseheadNebula,
  tychoRemnant,
  sn1006,
  ...webbNebulae,
  ...hubbleNebulae,
  betaPictoris,
  velaPulsar,
  cygnusX1,
];
