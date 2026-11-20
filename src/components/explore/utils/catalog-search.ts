import { galaxyAssociations } from '@/constants/space/galaxy-associations';
import { distantObjects, featuredObjects, galaxies, localGroup, milkyWay, observableUniverse, superclusters, type StarSystem } from '@/constants/space';
import { translate, type CatalogText, type MessageKey } from '@/i18n/messages';
import { localeCodes } from '@/i18n/routing';
import { associationPath, distantObjectPath, featuredObjectPath, galaxyPath, LOCAL_GROUP_PATH, superclusterPath, systemPath, UNIVERSE_PATH } from './paths';

type Entry = {
  name: CatalogText;
  path: string;
  kind: MessageKey;
  context?: CatalogText;
  designation?: CatalogText;
  aliases: readonly string[];
};

function words(value: string) {
  return (
    value
      .normalize('NFKC')
      .toLowerCase()
      .match(/[\p{L}\p{N}*]+/gu) ?? []
  );
}

function indexEntry(entry: Entry) {
  const fields = localeCodes.flatMap((locale) => {
    const name = translate(locale, entry.name);
    const designation = entry.designation ? translate(locale, entry.designation) : '';
    return [name, designation, ...designation.split('·')];
  });
  const terms = [...new Set([...fields, ...entry.aliases].map((value) => words(value).join('')).filter(Boolean))];
  const tokens = new Set([...fields, ...entry.aliases].flatMap(words));
  return { ...entry, terms, tokens };
}

export function createSearchCatalog(systems: readonly StarSystem[]) {
  const entries: Entry[] = [
    { name: observableUniverse.name, path: UNIVERSE_PATH, kind: 'search.region', aliases: [] },
    { name: localGroup.name, path: LOCAL_GROUP_PATH, kind: 'search.region', aliases: [] },
    ...galaxyAssociations.map(({ id, name, mapRegionId, aliases = [] }): Entry => ({ name, path: associationPath(mapRegionId, id), kind: 'search.region', aliases })),
    ...superclusters.map(({ name, id }): Entry => ({ name, path: superclusterPath(id), kind: 'search.region', aliases: [id] })),
    ...galaxies.map(({ name, title, id, aliases = [] }): Entry => ({ name, designation: title, path: galaxyPath(id), kind: 'search.galaxy', aliases: [id, ...aliases] })),
    {
      name: milkyWay.center.name,
      context: milkyWay.name,
      path: `${galaxyPath(milkyWay.id)}?target=${milkyWay.center.id}`,
      kind: 'details.supermassiveBlackHole',
      aliases: ['Sgr A*', milkyWay.center.id],
    },
    ...featuredObjects.map(
      ({ id, name, designation, kind, galaxyId = milkyWay.id, aliases = [] }): Entry => ({
        name,
        designation,
        context: galaxies.find((galaxy) => galaxy.id === galaxyId)?.name,
        path: featuredObjectPath(galaxyId, id),
        kind:
          kind === 'pulsar'
            ? 'search.pulsar'
            : kind === 'neutron-star'
              ? 'search.neutronStar'
              : kind === 'magnetar'
                ? 'search.magnetar'
                : kind === 'supergiant'
                  ? 'body.star'
                  : kind === 'black-hole'
                    ? 'details.supermassiveBlackHole'
                    : kind === 'open-cluster' || kind === 'globular-cluster'
                      ? 'search.starCluster'
                      : kind === 'planetary-nebula'
                        ? 'search.planetaryNebula'
                        : 'navigation.featuredObjects',
        aliases: [id, ...aliases],
      }),
    ),
    ...distantObjects.map(
      ({ id, name, kind, aliases = [] }): Entry => ({
        name,
        path: distantObjectPath(id),
        kind: kind === 'quasar' ? 'details.quasar' : 'details.earlyGalaxy',
        aliases: [id, ...aliases],
      }),
    ),
  ];

  for (const system of systems) {
    const galaxyId = system.galaxyId ?? milkyWay.id;
    entries.push({
      name: system.name,
      context: galaxies.find((galaxy) => galaxy.id === galaxyId)?.name,
      path: systemPath(galaxyId, system.id),
      kind: 'search.starSystem',
      aliases: [system.id],
    });
    for (const body of system.bodies) {
      entries.push({
        name: body.name,
        context: system.name,
        path: systemPath(galaxyId, system.id, body.id),
        kind: body.kind === 'dwarf-planet' ? 'body.dwarfPlanet' : body.kind === 'small-body' ? 'body.smallBody' : `body.${body.kind}`,
        aliases: [body.id],
      });
    }
    if (system.oortCloud) {
      entries.push({
        name: { key: 'navigation.oortCloud', values: [] },
        context: system.name,
        path: `${systemPath(galaxyId, system.id)}&view=oort`,
        kind: 'search.region',
        aliases: ['Oort'],
      });
    }
    if (system.outerRegion) {
      entries.push({
        name: system.outerRegion.beltName,
        context: system.name,
        path: `${systemPath(galaxyId, system.id)}&view=outer`,
        kind: 'search.region',
        aliases: [],
      });
    }
  }

  return entries.map(indexEntry);
}

export function searchCatalog(catalog: ReturnType<typeof createSearchCatalog>, query: string, limit = 12) {
  const queryWords = words(query);
  const compact = queryWords.join('');
  if (!compact) return [];

  return catalog
    .flatMap((item) => {
      if (item.terms.includes(compact)) return [{ item, rank: 0 }];
      if (item.terms.some((term) => term.startsWith(compact))) return [{ item, rank: 1 }];
      if (item.terms.some((term) => term.includes(compact)) || (queryWords.length > 1 && queryWords.every((word) => item.tokens.has(word)))) return [{ item, rank: 2 }];
      return [];
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ item }) => item);
}
