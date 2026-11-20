import { message } from '@/i18n/messages';
import type { Body } from '../../types';
import { SOLAR_LUMINOSITY_W, SOLAR_RADIUS_KM } from '../../units';

export const sun: Body = {
  id: 'sun',
  name: message('catalog.sun.sun.name'),
  kind: 'star',
  parent: null,
  radiusKm: SOLAR_RADIUS_KM,
  spinDays: 25,
  tilt: 7.25,
  displayRadius: 1,
  colors: ['#b01102', '#ffd152', '#ffb460'],
  focusScale: 4.65,
  mass: '1.988 × 10³⁰ kg',
  spinNote: message('catalog.sun.sun.spinNote'),
  stellar: {
    evolutionaryStage: message('catalog.stellar-stage.mainSequence'),
    spectralType: 'G2 V',
    temperatureK: 5772,
    luminosityWatts: SOLAR_LUMINOSITY_W,
    emissionColor: '#ff9547',
    poleSpinDays: 36,
  },
  galacticOrbit: { radiusKpc: 8, periodYears: 230_000_000, color: '#ffc875' },
  note: message('catalog.sun.sun.note'),
  sources: [
    { label: message('catalog.sources.nasa-factsheet.source.nasa-physical-parameters'), href: 'https://science.nasa.gov/universe/glossary/' },
    { label: message('catalog.sun.sun.source.nasa-sun-facts'), href: 'https://science.nasa.gov/sun/facts/' },
    { label: message('catalog.sun.sun.source.iau-nominal-solar-irradiance'), href: 'https://www.iau.org/static/resolutions/IAU2015_English.pdf' },
  ],
};
