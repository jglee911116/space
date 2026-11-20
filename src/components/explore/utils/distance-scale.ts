import type { Camera } from 'three';
import { KM_PER_AU, KM_PER_LIGHT_DAY, KM_PER_LIGHT_YEAR } from '@/constants/space/units';
import type { FormatNumber, Locale } from '@/i18n/messages';

export type ReportDistanceScale = (kmPerPixel: number) => void;

/** Horizontal distance on the plane through the orbit target, perpendicular to the camera. */
export function kmPerPixel(camera: Camera, viewportHeight: number, distanceToTarget: number, kmPerWorldUnit: number) {
  return (2 * distanceToTarget * kmPerWorldUnit) / (camera.projectionMatrix.elements[5] * Math.max(1, viewportHeight));
}

const units = {
  ko: [
    { km: 100_000_000 * KM_PER_LIGHT_YEAR, suffix: '억 광년' },
    { km: 10_000 * KM_PER_LIGHT_YEAR, suffix: '만 광년' },
    { km: KM_PER_LIGHT_YEAR, suffix: '광년' },
    { km: KM_PER_LIGHT_DAY, suffix: '광일' },
  ],
  en: [
    { km: 1e9 * KM_PER_LIGHT_YEAR, suffix: ' billion ly' },
    { km: 1e6 * KM_PER_LIGHT_YEAR, suffix: ' million ly' },
    { km: 1e3 * KM_PER_LIGHT_YEAR, suffix: ' thousand ly' },
    { km: KM_PER_LIGHT_YEAR, suffix: ' ly' },
    { km: KM_PER_LIGHT_DAY, suffix: ' light-days' },
  ],
} satisfies Record<Locale, { km: number; suffix: string }[]>;

const astronomicalUnit = { km: KM_PER_AU, suffix: ' AU' };
const kilometers = { km: 1, suffix: ' km' };

export function distanceScale(kmPerPixel: number, locale: Locale, number: FormatNumber) {
  const maxKm = kmPerPixel * 112;
  const unit = units[locale].find(({ km }) => maxKm >= km) ?? (maxKm >= KM_PER_AU ? astronomicalUnit : kilometers);
  const maximum = maxKm / unit.km;
  const power = 10 ** Math.floor(Math.log10(maximum));
  const magnitude = [5, 2, 1].find((step) => step * power <= maximum) ?? 1;
  const quantity = magnitude * power;
  return {
    label: `${number(quantity, 4)}${unit.suffix}`,
    pixels: Math.round((quantity * unit.km) / kmPerPixel),
  };
}
