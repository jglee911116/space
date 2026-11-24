export const KM_PER_AU = 149_597_870.7;
export const AU_PER_KPC = (648_000 / Math.PI) * 1_000;
export const DAYS_PER_YEAR = 365.25;
export const SOLAR_RADIUS_KM = 695_700;
export const SOLAR_LUMINOSITY_W = 3.828e26;
/** IAU 2015 공칭 태양 유효온도. */
export const SOLAR_TEMPERATURE_K = 5772;
export const EARTH_RADIUS_KM = 6371;
export const KM_PER_LIGHT_DAY = 299_792.458 * 86_400;
export const KM_PER_LIGHT_YEAR = KM_PER_LIGHT_DAY * DAYS_PER_YEAR;
export const KM_PER_KPC = AU_PER_KPC * KM_PER_AU;
export const LIGHT_YEARS_PER_KPC = KM_PER_KPC / KM_PER_LIGHT_YEAR;
export const KPC_PER_MLY = 1e6 / LIGHT_YEARS_PER_KPC;
