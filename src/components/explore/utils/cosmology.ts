import { LIGHT_YEARS_PER_KPC } from '@/constants/space/units';

const HUBBLE_KM_PER_SECOND_PER_MPC = 67.4;
const MATTER_DENSITY = 0.315;
const SPEED_OF_LIGHT_KM_PER_SECOND = 299_792.458;
const LIGHT_YEARS_PER_MPC = LIGHT_YEARS_PER_KPC * 1000;

/** Flat matter + Λ approximation, sufficient for the redshifts in this catalog. */
export function cosmologicalDistances(redshift: number) {
  const steps = 256;
  const dz = redshift / steps;
  let comoving = 0;
  let lookback = 0;
  for (let i = 0; i <= steps; i++) {
    const a = 1 + i * dz;
    const weight = i === 0 || i === steps ? 1 : i % 2 === 0 ? 2 : 4;
    const integral = weight / Math.sqrt(MATTER_DENSITY * a ** 3 + 1 - MATTER_DENSITY);
    comoving += integral;
    lookback += integral / a;
  }
  const factor = (dz / 3) * (SPEED_OF_LIGHT_KM_PER_SECOND / HUBBLE_KM_PER_SECOND_PER_MPC) * LIGHT_YEARS_PER_MPC;
  return { comovingLightYears: comoving * factor, lookbackYears: lookback * factor };
}
