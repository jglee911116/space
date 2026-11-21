import { message } from '@/i18n/messages';
import type { Galaxy, Source } from '../types';

const dwarfCatalog = { label: 'McConnachie · Nearby dwarf galaxy catalog', href: 'https://doi.org/10.26093/cds/vizier.51440004' };
const panStarrs = { label: 'Martin et al. · Lacerta I and Cassiopeia III', href: 'https://doi.org/10.1088/0004-637x/772/1/15' };

// replacesCatalog: 더 새로운 측정이 McConnachie 카탈로그 값을 대신한다.
type DwarfDetails = { summary?: Galaxy['summary']; structure?: Galaxy['structure']; sources?: readonly Source[]; replacesCatalog?: true };

export type DwarfRow = readonly [
  id: string, name: string, rightAscension: number, declination: number, distanceKpc: number, halfLightKpc: number,
  morphology: NonNullable<Galaxy['morphology']>, aliases?: readonly string[], details?: DwarfDetails,
];

// J2000 sky positions, heliocentric distances, and half-light radii from the linked catalogs.
const field: readonly DwarfRow[] = [
  ["phoenix-dwarf", "Phoenix Dwarf", 27.77625, -44.44472, 415, 0.454, "irregular", ["불사조자리 왜소은하", "불사조자리 왜소 은하"], { summary: message('catalog.dwarf.phoenix-dwarf.summary'), structure: { axis: 0.76, thickness: 0.33, core: 0.16, asymmetry: 0.19, dust: 0.08 }, sources: [{ label: 'ESA/Hubble · Phoenix Dwarf', href: 'https://esahubble.org/images/potw1143a/' }] }],
  ["ngc-6822", "NGC 6822", 296.235833, -14.789167, 459, 0.354, "irregular", ["IC 4895", "DDO 209", "Barnard's Galaxy", "바너드 은하"], { summary: message('catalog.dwarf.ngc-6822'), structure: { axis: 0.74, thickness: 0.24, core: 0.11, asymmetry: 0.52, dust: 0.68 }, sources: [{ label: 'ESA/Webb · NGC 6822', href: 'https://esawebb.org/images/potm2309a/' }] }],
  ["ic-1613", "IC 1613", 16.199167, 2.117778, 755, 1.496, "irregular", ["DDO 8", "UGC 668"]],
  ["wlm", "WLM", 0.4925, -15.460833, 933, 2.111, "irregular", ["UGCA 444", "DDO 221", "Wolf–Lundmark–Melotte", "울프 룬드마르크 멜로테"], { summary: message('catalog.dwarf.wlm'), structure: { axis: 0.43, thickness: 0.21, core: 0.10, asymmetry: 0.32 }, sources: [{ label: 'ESA/Webb · WLM', href: 'https://esawebb.org/images/WLMb/' }] }],
  ["ic-10", "IC 10", 5.072083, 59.303889, 794, 0.612, "irregular", ["UGC 192"]],
  ["leo-a", "Leo A", 149.860417, 30.746389, 798, 0.499, "irregular", ["Leo III", "UGC 5364", "DDO 69"]],
  ["pegasus-dig", "Pegasus DIG", 352.15125, 14.743056, 920, 0.562, "irregular", ["UGC 12613", "DDO 216", "페가수스자리 왜소 불규칙 은하"]],
  ["aquarius-dwarf", "Aquarius Dwarf", 311.715833, -12.848056, 1072, 0.458, "irregular", ["DDO 210", "물병자리 왜소은하"]],
  ["sag-dig", "Sagittarius DIG", 292.495833, -17.678056, 1067, 0.282, "irregular", ["UKS 1927-177", "SagDIG", "궁수자리 왜소 불규칙 은하"]],
  ["cetus-dwarf", "Cetus Dwarf", 6.545833, -11.044444, 755, 0.703, "dwarf-elliptical", ["고래자리 왜소은하"]],
  ["tucana-dwarf", "Tucana Dwarf", 340.456667, -64.419444, 887, 0.284, "dwarf-elliptical", ["큰부리새자리 왜소은하"]],
];

const milkyWay: readonly DwarfRow[] = [
  ["sagittarius-dsph", "Sagittarius dSph", 283.83125, -30.545278, 26, 2.587, "dwarf-elliptical", ["궁수자리 왜소구형은하"], { structure: { axis: 0.42, thickness: 0.45, core: 0.28, asymmetry: 0.22 } }],
  ["sculptor-dwarf", "Sculptor Dwarf", 15.039167, -33.709167, 86, 0.283, "dwarf-elliptical", ["조각가자리 왜소은하"]],
  ["fornax-dwarf", "Fornax Dwarf", 39.997083, -34.449167, 147, 0.71, "dwarf-elliptical", ["화로자리 왜소은하"]],
  ["draco-dwarf", "Draco Dwarf", 260.051667, 57.915278, 76, 0.221, "dwarf-elliptical", ["UGC 10822", "DDO 208", "용자리 왜소은하"]],
  ["ursa-minor-dwarf", "Ursa Minor Dwarf", 227.285417, 67.2225, 76, 0.181, "dwarf-elliptical", ["UGC 9749", "DDO 199", "작은곰자리 왜소은하"]],
  ["carina-dwarf", "Carina Dwarf", 100.402917, -50.966111, 105, 0.25, "dwarf-elliptical", ["용골자리 왜소은하"]],
  ["sextans-dsph", "Sextans dSph", 153.2625, -1.614722, 86, 0.695, "dwarf-elliptical", ["Sextans I", "육분의자리 왜소은하"]],
  ["leo-dwarf-i", "Leo I", 152.117083, 12.306389, 254, 0.251, "dwarf-elliptical", ["UGC 5470", "DDO 74", "Regulus Dwarf"]],
  ["leo-dwarf-ii", "Leo II", 168.37, 22.151667, 233, 0.176, "dwarf-elliptical", ["Leo B", "UGC 6253", "DDO 93"]],
];

const andromeda: readonly DwarfRow[] = [
  ["ngc-147", "NGC 147", 8.300417, 48.508889, 676, 0.623, "dwarf-elliptical", ["UGC 326", "DDO 3", "Caldwell 17"], { summary: message('catalog.dwarf.ngc-147'), structure: { axis: 0.71, thickness: 0.55, core: 0.24 }, sources: [{ label: 'NASA Hubble · Caldwell 17', href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/caldwell-17/' }] }],
  ["ngc-185", "NGC 185", 9.741667, 48.3375, 617, 0.458, "dwarf-elliptical", ["UGC 396", "Caldwell 18"], { summary: message('catalog.dwarf.ngc-185'), structure: { axis: 0.85, thickness: 0.63, core: 0.19 }, sources: [{ label: 'NASA Hubble · Caldwell 18', href: 'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/caldwell-18/' }] }],
  ["andromeda-i", "Andromeda I", 11.415833, 38.041111, 745, 0.672, "dwarf-elliptical", ["And I", "안드로메다 I"]],
  ["andromeda-ii", "Andromeda II", 19.124167, 33.419167, 652, 1.176, "dwarf-elliptical", ["And II", "안드로메다 II"]],
  ["andromeda-iii", "Andromeda III", 8.890833, 36.497778, 748, 0.479, "dwarf-elliptical", ["And III", "안드로메다 III"]],
  ["andromeda-v", "Andromeda V", 17.57125, 47.628056, 773, 0.315, "dwarf-elliptical", ["And V", "안드로메다 V"]],
  ["andromeda-vi", "Andromeda VI", 357.942917, 24.5825, 783, 0.524, "dwarf-elliptical", ["Pegasus dSph", "And VI", "안드로메다 VI"]],
  ["andromeda-vii", "Andromeda VII", 351.632083, 50.675833, 762, 0.776, "dwarf-elliptical", ["And VII", "안드로메다 VII", "Cassiopeia dSph"]],
  ["andromeda-ix", "Andromeda IX", 13.220833, 43.195833, 766, 0.557, "dwarf-elliptical", ["And IX", "안드로메다 IX"]],
  ["andromeda-xix", "Andromeda XIX", 4.88375, 35.043611, 933, 1.683, "dwarf-elliptical", ["And XIX", "안드로메다 XIX"]],
  ["andromeda-xxi", "Andromeda XXI", 358.69875, 42.470833, 859, 0.875, "dwarf-elliptical", ["And XXI", "안드로메다 XXI"]],
  ["andromeda-xxiii", "Andromeda XXIII", 22.340833, 38.718889, 769, 1.029, "dwarf-elliptical", ["And XXIII", "안드로메다 XXIII"]],
  ["andromeda-xxv", "Andromeda XXV", 7.537083, 46.851944, 813, 0.709, "dwarf-elliptical", ["And XXV", "안드로메다 XXV"]],
  ["andromeda-xxxi", "Andromeda XXXI", 344.567917, 41.291111, 756, 0.912, "dwarf-elliptical", ["Lacerta I", "And XXXI", "안드로메다 XXXI"], { sources: [panStarrs], replacesCatalog: true }],
  ["andromeda-xxxii", "Andromeda XXXII", 8.9975, 51.559722, 772, 1.456, "dwarf-elliptical", ["Cassiopeia III", "And XXXII", "안드로메다 XXXII"], { sources: [panStarrs], replacesCatalog: true }],
];

export function dwarfGalaxies(rows: readonly DwarfRow[], summary: Galaxy['summary'], parentGalaxyId?: string): Galaxy[] {
  return rows.map(([id, name, rightAscension, declination, distanceKpc, halfLightKpc, morphology, aliases, details], index) => {
    const colors = morphology === 'dwarf-elliptical' ? ['#efc49f', '#e3c6bf', '#e4d2aa'] : ['#aabbf3', '#b4ccf4', '#c7b3ed'];
    return {
      id, name, aliases, parentGalaxyId, distanceKpc, morphology,
      summary: details?.summary ?? summary,
      structure: details?.structure,
      skyPosition: { rightAscension, declination },
      modelRadiusKpc: Math.max(0.35, halfLightKpc * 3),
      color: colors[index % colors.length],
      sources: [...(details?.sources ?? []), ...(details?.replacesCatalog ? [] : [dwarfCatalog])],
    };
  });
}

export const localDwarfs = [
  ...dwarfGalaxies(field, message('catalog.dwarf.local-field')),
  ...dwarfGalaxies(milkyWay, message('catalog.dwarf.milky-way-satellite'), 'milky-way'),
  ...dwarfGalaxies(andromeda, message('catalog.dwarf.andromeda-satellite'), 'andromeda'),
];
