// 탐색기 경로는 여기서만 만든다 — app/[locale] 라우트 구조와 맞춘다.
export const HOME_PATH = '/';
export const LOCAL_GROUP_PATH = '/local-group';

export function galaxyPath(id: string) {
  return `/galaxies/${id}`;
}

export function localGroupPath(focusGalaxyId: string) {
  return `${LOCAL_GROUP_PATH}?galaxy=${focusGalaxyId}`;
}

export const UNIVERSE_PATH = '/universe';

export function superclusterPath(id: string) {
  return `/superclusters/${id}`;
}

export function systemPath(galaxyId: string, systemId: string, target?: string) {
  const query = new URLSearchParams({ system: systemId });
  if (target) query.set('target', target);
  return `${galaxyPath(galaxyId)}?${query}`;
}

export function featuredObjectPath(galaxyId: string, id: string) {
  return `${galaxyPath(galaxyId)}?view=object&target=${encodeURIComponent(id)}`;
}

export function distantObjectPath(id: string) {
  return `${UNIVERSE_PATH}?target=${encodeURIComponent(id)}`;
}

export function associationPath(regionId: string, associationId: string) {
  return `${superclusterPath(regionId)}?view=cluster&cluster=${encodeURIComponent(associationId)}`;
}
