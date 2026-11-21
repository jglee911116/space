import { message } from '@/i18n/messages';
import type { Source } from '../../types';

export const NASA_FACTSHEET: Source = { label: message('catalog.sources.nasa-factsheet.source.nasa-physical-parameters'), href: 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/' };
export const JPL_ELEMENTS: Source = { label: message('catalog.sources.jpl-elements.source.jpl-orbital-elements'), href: 'https://ssd.jpl.nasa.gov/planets/approx_pos.html' };
export const JPL_SATELLITE_ELEMENTS: Source = { label: message('catalog.sources.jpl-satellite-elements.source.jpl-moon-orbits'), href: 'https://ssd.jpl.nasa.gov/sats/elem/' };
export const SOLAR_SYSTEM_SCOPE: Source = { label: 'Solar System Scope · CC BY 4.0', href: 'https://www.solarsystemscope.com/textures/' };
// 부모 행성별 JPL Solar System Simulator 지도 출처
export const jplSimulator = (parent: string): Source => ({ label: 'NASA/JPL · Solar System Simulator', href: `https://maps.jpl.nasa.gov/tmaps/${parent}.html` });
export const JPL_SATELLITE_PHYSICAL: Source = { label: message('catalog.sources.jpl-satellite-physical.source.jpl-moon-physical-parameters'), href: 'https://ssd.jpl.nasa.gov/sats/phys_par/' };
