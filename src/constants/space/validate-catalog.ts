import { galaxyAssociations } from './galaxy-associations';
import { createSearchCatalog } from '@/components/explore/utils/catalog-search';
import { languages } from '@/i18n/messages';
import { distantObjects, featuredObjects, galaxies, localGroup, milkyWay, observableUniverse, superclusters, systems } from './index';

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Catalog: ${message}`);
}

function checkCoordinates(name: string, rightAscension: number, declination: number) {
  requireValue(rightAscension >= 0 && rightAscension < 360, `${name} has invalid right ascension`);
  requireValue(declination >= -90 && declination <= 90, `${name} has invalid declination`);
}

function checkText(value: unknown, location: string) {
  if (typeof value !== 'object' || value === null) return;
  if ('key' in value && 'values' in value && typeof value.key === 'string' && Array.isArray(value.values)) {
    const args = value.values;
    for (const [locale, { messages }] of Object.entries(languages)) {
      const text = (messages as Record<string, string>)[value.key];
      requireValue(text?.trim(), `${location}: missing ${locale} message ${value.key}`);
      requireValue(
        [...text.matchAll(/\{(\d+)\}/g)].every(([, id]) => Number(id) < args.length),
        `${location}: missing arguments for ${value.key}`,
      );
    }
    return;
  }
  if ('href' in value) {
    const href = value.href;
    requireValue(typeof href === 'string' && /^https?:\/\//.test(href) && URL.canParse(href), `${location}: invalid source URL`);
  }
  for (const [key, child] of Object.entries(value)) checkText(child, `${location}.${key}`);
}

export function validateCatalog() {
  const dictionaries = Object.entries(languages);
  const reference = dictionaries[0][1].messages;
  const placeholders = (text: string) => [...new Set([...text.matchAll(/\{\d+\}/g)].map(([token]) => token))].sort().join(',');
  for (const [locale, { messages }] of dictionaries) {
    const dictionary: Record<string, string> = messages;
    requireValue(Object.keys(dictionary).length === Object.keys(reference).length, `${locale}: dictionary key count differs`);
    for (const [key, text] of Object.entries(reference)) {
      requireValue(dictionary[key]?.trim(), `${locale}: missing translation ${key}`);
      requireValue(placeholders(dictionary[key]) === placeholders(text), `${locale}: interpolation differs for ${key}`);
    }
  }

  for (const galaxy of galaxies) {
    requireValue(galaxy.sources.length > 0 && Number.isFinite(galaxy.distanceKpc) && galaxy.distanceKpc >= 0, `${galaxy.id}: invalid distance or missing sources`);
    if (galaxy.distanceKpc > 0) requireValue(galaxy.skyPosition, `${galaxy.id}: missing sky position`);
    if (galaxy.skyPosition) checkCoordinates(galaxy.id, galaxy.skyPosition.rightAscension, galaxy.skyPosition.declination);
  }
  for (const object of [...featuredObjects, ...distantObjects]) {
    checkCoordinates(object.id, object.rightAscension, object.declination);
    requireValue(object.observationStatus && object.sources.length > 0, `${object.id}: missing observation status or sources`);
    requireValue(
      'distanceLightYears' in object ? Number.isFinite(object.distanceLightYears) && object.distanceLightYears > 0 : Number.isFinite(object.redshift) && object.redshift > 0,
      `${object.id}: missing positive distance or redshift`,
    );
  }
  requireValue(new Set(galaxies.map(({ id }) => id)).size === galaxies.length, 'duplicate galaxy id');
  requireValue(new Set(galaxyAssociations.map(({ id }) => id)).size === galaxyAssociations.length, 'duplicate association id');
  for (const group of galaxyAssociations) {
    const region = superclusters.find(({ id }) => id === group.mapRegionId);
    requireValue(
      region?.markers.some(({ clusterId }) => clusterId === group.id),
      `${group.id}: no marker in its parent map`,
    );
    requireValue(group.gridRadiusMly > 0 && group.members.length > 1 && group.members.every((member) => member.skyPosition && member.distanceKpc > 0), `${group.id}: invalid scale or members`);
  }
  checkText({ galaxyAssociations, galaxies, systems, featuredObjects, distantObjects, superclusters, localGroup, observableUniverse }, 'data');

  const search = createSearchCatalog(Object.values(systems));
  requireValue(new Set(search.map(({ path }) => path)).size === search.length, 'duplicate search destinations');
  for (const { path } of search) {
    const url = new URL(path, 'https://catalog.invalid');
    const [, segment, id] = url.pathname.split('/');
    const target = url.searchParams.get('target');
    const systemId = url.searchParams.get('system');
    const view = url.searchParams.get('view');
    if (segment === 'galaxies') {
      const galaxy = galaxies.find((item) => item.id === id);
      requireValue(galaxy, `bad search destination ${path}`);
      if (systemId) {
        const system = Object.values(systems).find((item) => item.id === systemId && (item.galaxyId ?? milkyWay.id) === id);
        requireValue(system && (!target || system.bodies.some((body) => body.id === target)), `bad system destination ${path}`);
        requireValue((view !== 'oort' || system.oortCloud) && (view !== 'outer' || system.outerRegion), `bad system view ${path}`);
      } else if (view === 'object') {
        requireValue(
          featuredObjects.some((item) => item.id === target && (item.galaxyId ?? milkyWay.id) === id),
          `bad featured destination ${path}`,
        );
      } else if (target) {
        requireValue(id === milkyWay.id && target === milkyWay.center.id, `bad galactic target ${path}`);
      }
    } else if (segment === 'superclusters') {
      requireValue(
        superclusters.some((item) => item.id === id),
        `bad region destination ${path}`,
      );
      if (view === 'cluster')
        requireValue(
          galaxyAssociations.some((item) => item.id === url.searchParams.get('cluster') && item.mapRegionId === id),
          `bad association destination ${path}`,
        );
    } else if (segment === 'universe') {
      requireValue(!target || distantObjects.some((item) => item.id === target), `bad distant destination ${path}`);
    } else {
      requireValue(segment === 'local-group', `unknown search destination ${path}`);
    }
  }
}
