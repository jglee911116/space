import { useEffect, useState } from 'react';

export * from './gaia-format';
import { decodeGaiaSource, gaiaCatalogPath, gaiaRecordBytes, gaiaVersion, type GaiaSource } from './gaia-format';

async function lookupGaiaSource(id: string, signal: AbortSignal) {
  const numericId = BigInt(id);
  const shard = Number((numericId >> BigInt(40)) & BigInt(63));
  const response = await fetch(`${gaiaCatalogPath}/index/${shard}.bin?v=${gaiaVersion}`, { signal });
  if (!response.ok) throw new Error('Gaia lookup unavailable');
  const data = new DataView(await response.arrayBuffer());
  if (data.byteLength % gaiaRecordBytes !== 0) throw new Error('Invalid Gaia index packet');
  let low = 0;
  let high = data.byteLength / gaiaRecordBytes - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const offset = mid * gaiaRecordBytes;
    const candidate = data.getBigUint64(offset + 16, true);
    if (candidate === numericId) return decodeGaiaSource(data, offset);
    if (candidate < numericId) low = mid + 1;
    else high = mid - 1;
  }
  return null;
}

type LookupResult = { id: string; source: GaiaSource | null; failed?: boolean };

export function useGaiaSource(id: string | null) {
  const [result, setResult] = useState<LookupResult>();
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void lookupGaiaSource(id, controller.signal)
      .then((source) => {
        if (!controller.signal.aborted) setResult({ id, source });
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ id, source: null, failed: true });
      });
    return () => controller.abort();
  }, [id]);
  return id && result?.id === id ? result : undefined;
}

export const gaiaNeighborRadii = [5, 10, 25] as const;
export type GaiaNeighborRadius = (typeof gaiaNeighborRadii)[number];

export function readGaiaNeighborRadius(value: string | null): GaiaNeighborRadius {
  return gaiaNeighborRadii.find((radius) => String(radius) === value) ?? 10;
}
const gaiaNeighborLimit = 20;

type Tile = {
  id: string;
  center: [number, number, number];
  bright: number;
  detail: number;
};

export type GaiaManifest = { tileSize: number; tiles: Tile[] };
export type GaiaNeighbor = { source: GaiaSource; separation: number };

export function gaiaPacketUrl(name: string) {
  return `${gaiaCatalogPath}/${name}?v=${gaiaVersion}`;
}

// 반경·중심을 바꿔도 이미 받은 manifest·타일은 다시 받지 않는다(실패한 요청은 지워 다시 시도). 정적 파일이라 표본 크기(3.6MB)를 넘지 않는다.
const gaiaFiles = new Map<string, Promise<Response>>();
function fetchGaiaFile(name: string) {
  let request = gaiaFiles.get(name);
  if (!request) {
    request = fetch(gaiaPacketUrl(name)).then((response) => {
      if (!response.ok) throw new Error(`Gaia file unavailable: ${name}`);
      return response;
    });
    request.catch(() => gaiaFiles.delete(name));
    gaiaFiles.set(name, request);
  }
  return request.then((response) => response.clone());
}

async function findGaiaNeighbors(center: GaiaSource['position'], radius: GaiaNeighborRadius, excludeIds: ReadonlySet<string>, signal: AbortSignal) {
  const manifest: GaiaManifest = await (await fetchGaiaFile('manifest.json')).json();
  signal.throwIfAborted();
  const tiles = manifest.tiles.filter((tile) => Math.hypot(...tile.center.map((coordinate, axis) => Math.max(0, Math.abs(coordinate - center[axis]) - manifest.tileSize / 2))) <= radius);

  const packets = await Promise.all(
    tiles.flatMap((tile) =>
      (['bright', 'detail'] as const)
        .filter((level) => tile[level] > 0)
        .map(async (level) => {
          const data = new DataView(await (await fetchGaiaFile(`${tile.id}.${level}.bin`)).arrayBuffer());
          if (data.byteLength !== tile[level] * gaiaRecordBytes) throw new Error('Invalid Gaia tile');
          return data;
        }),
    ),
  );

  signal.throwIfAborted();
  const neighbors: GaiaNeighbor[] = [];
  for (const data of packets) {
    for (let offset = 0; offset < data.byteLength; offset += gaiaRecordBytes) {
      const separation = Math.hypot(data.getFloat32(offset, true) - center[0], data.getFloat32(offset + 4, true) - center[1], data.getFloat32(offset + 8, true) - center[2]);
      if (separation > radius) continue;
      const source = decodeGaiaSource(data, offset);
      if (!excludeIds.has(source.id)) neighbors.push({ source, separation });
    }
  }
  return neighbors.sort((a, b) => a.separation - b.separation || a.source.id.localeCompare(b.source.id));
}

type NeighborsResult = { center: GaiaSource['position']; radius: GaiaNeighborRadius; entries: GaiaNeighbor[]; total: number; failed?: boolean };

export function useGaiaNeighbors(center: GaiaSource['position'] | undefined, radius: GaiaNeighborRadius, excludedSourceIds: string) {
  const [result, setResult] = useState<NeighborsResult>();
  useEffect(() => {
    if (!center) return;
    const controller = new AbortController();
    void findGaiaNeighbors(center, radius, new Set(excludedSourceIds.split(',')), controller.signal)
      .then((neighbors) => {
        if (!controller.signal.aborted) {
          setResult({ center, radius, entries: neighbors.slice(0, gaiaNeighborLimit), total: neighbors.length });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ center, radius, entries: [], total: 0, failed: true });
      });
    return () => controller.abort();
  }, [center, radius, excludedSourceIds]);
  return center && result?.center === center && result.radius === radius ? result : undefined;
}
