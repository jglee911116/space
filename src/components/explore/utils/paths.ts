// 탐색기 경로는 여기서만 만든다 — app/[locale] 라우트 구조와 맞춘다.
export const HOME_PATH = '/';
export const LOCAL_GROUP_PATH = '/local-group';

type ExplorerQuery = Partial<Record<'system' | 'target' | 'view' | 'focus' | 'galaxy' | 'cluster' | 'gaia' | 'around', string | null>>;

export function readExplorerQuery(params: Pick<URLSearchParams, 'get'>) {
  return {
    system: params.get('system'),
    target: params.get('target'),
    view: params.get('view'),
    focus: params.get('focus'),
    galaxy: params.get('galaxy'),
    cluster: params.get('cluster'),
    gaia: params.get('gaia'),
    around: params.get('around'),
  };
}

function setExplorerQuery(params: URLSearchParams, query: ExplorerQuery) {
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
    else params.delete(key);
  }
}

function withQuery(path: string, query: ExplorerQuery) {
  const params = new URLSearchParams();
  setExplorerQuery(params, query);
  return params.size ? `${path}?${params}` : path;
}

export function updateSystemLocation(url: URL, pathname: string, system: string | null, target: string | null, view: string | null) {
  const current = readExplorerQuery(url.searchParams);
  if (url.pathname === pathname && current.system === system && current.target === target && current.view === view && current.gaia === null && current.around === null) return false;

  url.pathname = pathname;
  setExplorerQuery(url.searchParams, { focus: null, gaia: null, around: null, system, target, view });
  return true;
}

export function gaiaSourcePath(gaia?: string, around?: string) {
  return withQuery(HOME_PATH, { view: 'neighborhood', gaia, around });
}

export function galaxyPath(id: string) {
  return `/galaxies/${id}`;
}

export function localGroupPath(focusGalaxyId: string) {
  return withQuery(LOCAL_GROUP_PATH, { galaxy: focusGalaxyId });
}

export const UNIVERSE_PATH = '/universe';

export function superclusterPath(id: string) {
  return `/superclusters/${id}`;
}

export function systemPath(galaxyId: string, system?: string, target?: string, view?: 'oort' | 'outer') {
  return withQuery(galaxyPath(galaxyId), { system, target, view });
}

export function galaxyFocusPath(galaxyId: string, focus: string) {
  return withQuery(galaxyPath(galaxyId), { focus });
}

export function featuredObjectPath(galaxyId: string, id: string) {
  return withQuery(galaxyPath(galaxyId), { view: 'object', target: id });
}

export function distantObjectPath(id: string) {
  return withQuery(UNIVERSE_PATH, { target: id });
}

export function universeFocusPath(focus: string) {
  return withQuery(UNIVERSE_PATH, { focus });
}

export function associationPath(regionId: string, associationId: string) {
  return withQuery(superclusterPath(regionId), { view: 'cluster', cluster: associationId });
}
