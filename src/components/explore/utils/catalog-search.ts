import { distantObjects, featuredObjects, galaxies, galaxyAssociations, localGroup, milkyWay, observableUniverse, superclusters, type StarSystem } from '@/constants/space';
import { translate, type CatalogText, type MessageKey } from '@/i18n/messages';
import { localeCodes } from '@/i18n/routing';
import { associationPath, distantObjectPath, featuredObjectPath, gaiaSourcePath, galaxyPath, LOCAL_GROUP_PATH, superclusterPath, systemPath, UNIVERSE_PATH } from './paths';

type Entry = {
  name: CatalogText;
  path: string;
  kind: MessageKey;
  context?: CatalogText;
  parentContext?: CatalogText;
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

function compactTerm(tokens: readonly string[]) {
  const compact = tokens.join('');
  const messier = /^(?:m|messier|메시에|메시어)0*(\d+)$/.exec(compact);
  if (messier) return `m${messier[1]}`;
  const numbered = /^(ngc|ic)0*(\d+[a-z]?)$/.exec(compact);
  return numbered ? `${numbered[1]}${numbered[2]}` : compact;
}

function indexEntry(entry: Entry) {
  const names = localeCodes.flatMap((locale) => {
    const name = translate(locale, entry.name);
    const designation = entry.designation ? translate(locale, entry.designation) : '';
    return [name, designation, ...designation.split('·')];
  });
  const nameFields = [...names, ...entry.aliases];
  const qualifiers = localeCodes.flatMap((locale) => [
    translate(locale, entry.kind),
    entry.context ? translate(locale, entry.context) : '',
    entry.parentContext ? translate(locale, entry.parentContext) : '',
  ]);
  const terms = [...new Set(nameFields.map((value) => compactTerm(words(value))).filter(Boolean))];
  const nameTokens = new Set(nameFields.flatMap(words));
  const tokens = new Set([...nameTokens, ...qualifiers.flatMap(words)]);
  return { ...entry, terms, nameTokens, tokens };
}

export function createSearchCatalog(systems: readonly StarSystem[]) {
  const entries: Entry[] = [
    { name: observableUniverse.name, path: UNIVERSE_PATH, kind: 'search.region', aliases: [] },
    { name: localGroup.name, path: LOCAL_GROUP_PATH, kind: 'search.region', aliases: [] },
    { name: milkyWay.neighborhood.name, path: gaiaSourcePath(), kind: 'search.region', context: milkyWay.name, aliases: ['solar neighborhood', 'solar neighbourhood', 'solar vicinity', '태양 근방', '태양계 근방', '태양 주변'] },
    ...galaxyAssociations.map(({ id, name, mapRegionId, aliases = [] }): Entry => ({ name, path: associationPath(mapRegionId, id), kind: 'search.region', aliases })),
    ...superclusters.map(({ name, id }): Entry => ({ name, path: superclusterPath(id), kind: 'search.region', aliases: [id] })),
    ...galaxies.map(({ name, title, id, aliases = [] }): Entry => ({ name, designation: title, path: galaxyPath(id), kind: 'search.galaxy', aliases: [id, ...aliases] })),
    {
      name: milkyWay.center.name,
      context: milkyWay.name,
      path: systemPath(milkyWay.id, undefined, milkyWay.center.id),
      kind: 'details.supermassiveBlackHole',
      aliases: ['Sgr A*', milkyWay.center.id],
    },
    ...featuredObjects.filter(({ parentObjectId }) => !parentObjectId).map(
      ({ id, name, designation, kind, galaxyId = milkyWay.id, aliases = [] }): Entry => ({
        name,
        designation,
        context: galaxies.find((galaxy) => galaxy.id === galaxyId)?.name,
        path: featuredObjectPath(galaxyId, id),
        kind:
          kind === 'pulsar' || kind === 'pulsar-wind-nebula'
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
                        : kind === 'x-ray-binary' ? 'details.xRayBinary' : 'navigation.featuredObjects',
        aliases: [id, ...aliases],
      }),
    ),
    ...distantObjects.map(
      ({ id, name, kind, aliases = [] }): Entry => ({
        name,
        path: distantObjectPath(id),
        kind: kind === 'quasar' ? 'details.quasar' : kind === 'ring-galaxy' ? 'details.ringGalaxy' : kind === 'galaxy-cluster' ? 'details.galaxyCluster' : kind === 'galaxy-group' ? 'details.galaxyGroup' : kind === 'galaxy-merger' ? 'details.galaxyMerger' : 'details.earlyGalaxy',
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
        parentContext: galaxies.find((galaxy) => galaxy.id === galaxyId)?.name,
        path: systemPath(galaxyId, system.id, body.id),
        kind: body.kind === 'dwarf-planet' ? 'body.dwarfPlanet' : body.kind === 'small-body' ? 'body.smallBody' : `body.${body.kind}`,
        aliases: [body.id],
      });
    }
    if (system.oortCloud) {
      entries.push({
        name: { key: 'navigation.oortCloud', values: [] },
        context: system.name,
        path: systemPath(galaxyId, system.id, undefined, 'oort'),
        kind: 'search.region',
        aliases: ['Oort', '오르트구름'],
      });
    }
    if (system.outerRegion) {
      entries.push({
        name: system.outerRegion.beltName,
        context: system.name,
        path: systemPath(galaxyId, system.id, undefined, 'outer'),
        kind: 'search.region',
        aliases: [],
      });
    }
  }

  return entries.map(indexEntry);
}

export function searchCatalog(catalog: ReturnType<typeof createSearchCatalog>, query: string, limit = 12) {
  const queryWords = words(query);
  const compact = compactTerm(queryWords);
  if (!compact) return [];

  return catalog
    .flatMap((item) => {
      if (item.terms.includes(compact)) return [{ item, rank: 0 }];
      if (item.terms.some((term) => term.startsWith(compact))) return [{ item, rank: 1 }];
      if (queryWords.length > 1 && queryWords.some((word) => item.nameTokens.has(word) && /\p{L}/u.test(word))
        && queryWords.every((word) => item.tokens.has(word))) return [{ item, rank: 2 }];
      if (item.terms.some((term) => term.includes(compact))) return [{ item, rank: 3 }];
      return [];
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ item }) => item);
}
