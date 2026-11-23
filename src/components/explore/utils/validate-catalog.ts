import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Vector3 } from 'three';
import { decodeGaiaSource, gaiaCatalogPath, gaiaRecordBytes, gaiaSampleRadiusLightYears, type GaiaSource } from './gaia-format';
import { nearbyPositions } from './nearby-positions';
import { gaiaSourcePath, readExplorerQuery } from './paths';
import { createSearchCatalog } from './catalog-search';
import { regionMarkers } from './cluster-markers';
import { languages } from '@/i18n/messages';
import { distantObjects, featuredObjects, gaiaCounterparts, galaxies, galaxyAssociations, localGroup, milkyWay, observableUniverse, superclusters, systems } from '@/constants/space';

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Catalog: ${message}`);
}

function checkReference(field: string, id: string | undefined, knownIds: ReadonlySet<string>) {
  requireValue(id === undefined || knownIds.has(id), `${field}: unknown ID ${id}`);
}

function checkRelationships() {
  const galaxyIds = new Set(galaxies.map(({ id }) => id));
  const regionIds = new Set(superclusters.map(({ id }) => id));
  const objectIds = new Set(featuredObjects.map(({ id }) => id));
  requireValue(objectIds.size === featuredObjects.length, 'duplicate featured object id');

  requireValue(galaxyIds.size === galaxies.length, 'duplicate galaxy id');
  const systemIds = new Set(systems.map(({ id }) => id));
  requireValue(systemIds.size === systems.length, 'duplicate system id');
  checkReference(`${milkyWay.id}.systemId`, milkyWay.systemId, systemIds);

  for (const system of systems) {
    checkReference(`${system.id}.galaxyId`, system.galaxyId, galaxyIds);

    // Orbit calculations visit bodies in catalog order and expect each parent to be available first.
    const seen = new Set<string>();
    for (const body of system.bodies) {
      const location = `${system.id}.${body.id}`;
      requireValue(!seen.has(body.id), `${location}: duplicate body id`);
      if (body.parent === null) {
        requireValue(body.kind === 'star' || (body.kind === 'planet' && body.orbit), `${location}: invalid root body`);
      } else {
        requireValue(seen.has(body.parent), `${location}: parent ${body.parent} is missing or listed later`);
        requireValue(body.orbit, `${location}: missing orbit`);
      }
      seen.add(body.id);
    }
  }

  for (const galaxy of galaxies) {
    checkReference(`${galaxy.id}.parentGalaxyId`, galaxy.parentGalaxyId, galaxyIds);
    checkReference(`${galaxy.id}.superclusterId`, galaxy.superclusterId, regionIds);
  }
  for (const object of featuredObjects) {
    checkReference(`${object.id}.galaxyId`, object.galaxyId, galaxyIds);
    checkReference(`${object.id}.parentObjectId`, object.parentObjectId, objectIds);
  }
  for (const galaxy of localGroup.galaxies) requireValue(galaxies.includes(galaxy), `${galaxy.id}: local group galaxy missing from galaxies`);
  for (const { id, members } of galaxyAssociations) {
    for (const member of members) requireValue(member.superclusterId === undefined, `${id}.${member.id}: association members must not set superclusterId`);
  }
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
  checkRelationships();

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
  requireValue(new Set(galaxyAssociations.map(({ id }) => id)).size === galaxyAssociations.length, 'duplicate association id');
  for (const group of galaxyAssociations) {
    const region = superclusters.find(({ id }) => id === group.mapRegionId);
    requireValue(
      region && regionMarkers(region).some(({ clusterId }) => clusterId === group.id),
      `${group.id}: no marker in its parent map`,
    );
    requireValue(group.gridRadiusMly > 0 && group.members.length > 1 && group.members.every((member) => member.skyPosition && member.distanceKpc > 0), `${group.id}: invalid scale or members`);
  }
  checkText({ galaxyAssociations, galaxies, systems, featuredObjects, distantObjects, superclusters, localGroup, observableUniverse }, 'data');

  const manifest = JSON.parse(readFileSync(join(process.cwd(), 'public', gaiaCatalogPath, 'manifest.json'), 'utf8'));
  requireValue(Math.abs(manifest.maxDistanceLightYears - gaiaSampleRadiusLightYears) < 1, 'gaiaSampleRadiusLightYears differs from the Gaia manifest');
  for (const region of superclusters) {
    for (const id of Object.values(region.flowAnchors ?? {})) requireValue(regionMarkers(region).some(({ clusterId }) => clusterId === id), `${region.id}.flowAnchors: ${id} is not on the map`);
  }

  const matchedSourceIds = new Set<string>();
  for (const { sourceId, systemId, bodyId } of gaiaCounterparts) {
    requireValue(/^[1-9]\d{0,18}$/.test(sourceId) && !matchedSourceIds.has(sourceId), `invalid or duplicate Gaia source ${sourceId}`);
    matchedSourceIds.add(sourceId);
    const system = systems.find(({ id }) => id === systemId);
    requireValue(system?.bodies.some((body) => body.id === bodyId && body.kind === 'star'), `unknown Gaia counterpart ${systemId}/${bodyId}`);
    // 다른 별의 ID 를 잘못 넣으면(예: 82 Eridani) 위치가 수 광년 이상 어긋난다.
    const shard = Number((BigInt(sourceId) >> BigInt(40)) & BigInt(63));
    const packet = readFileSync(join(process.cwd(), 'public', gaiaCatalogPath, 'index', `${shard}.bin`));
    const data = new DataView(packet.buffer, packet.byteOffset, packet.byteLength);
    let source: GaiaSource | undefined;
    for (let offset = 0; offset < data.byteLength && !source; offset += gaiaRecordBytes) {
      if (data.getBigUint64(offset + 16, true).toString() === sourceId) source = decodeGaiaSource(data, offset);
    }
    const expected = nearbyPositions(systems).find((item) => item.system.id === systemId)?.position;
    requireValue(source && expected && expected.distanceTo(new Vector3(...source.position)) < 1, `Gaia ${sourceId} is not at ${systemId}`);
  }

  const search = createSearchCatalog(systems);
  requireValue(new Set(search.map(({ path }) => path)).size === search.length, 'duplicate search destinations');
  for (const { path } of search) {
    const url = new URL(path, 'https://catalog.invalid');
    const [, segment, id] = url.pathname.split('/');
    const { target, system: systemId, view, cluster } = readExplorerQuery(url.searchParams);
    if (segment === 'galaxies') {
      const galaxy = galaxies.find((item) => item.id === id);
      requireValue(galaxy, `bad search destination ${path}`);
      if (systemId) {
        const system = systems.find((item) => item.id === systemId && (item.galaxyId ?? milkyWay.id) === id);
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
          galaxyAssociations.some((item) => item.id === cluster && item.mapRegionId === id),
          `bad association destination ${path}`,
        );
    } else if (segment === 'universe') {
      requireValue(!target || distantObjects.some((item) => item.id === target), `bad distant destination ${path}`);
    } else {
      requireValue(segment === 'local-group' || path === gaiaSourcePath(), `unknown search destination ${path}`);
    }
  }
}
