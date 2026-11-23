import { gaiaCounterparts, systems } from '@/constants/space';

const counterparts = gaiaCounterparts.map((entry) => ({
  ...entry,
  name: systems.find(({ id }) => id === entry.systemId)?.bodies.find(({ id }) => id === entry.bodyId)?.name,
}));

export const gaiaCounterpartsBySource = new Map(counterparts.map((entry) => [String(entry.sourceId), entry]));

const counterpartsBySystem = new Map<string, (typeof counterparts)[number][]>();
for (const entry of counterparts) {
  const entries = counterpartsBySystem.get(entry.systemId) ?? [];
  entries.push(entry);
  counterpartsBySystem.set(entry.systemId, entries);
}

export function gaiaCounterpartsForSystem(systemId: string | null) {
  return systemId ? counterpartsBySystem.get(systemId) : undefined;
}
