import { useEffect, useState } from 'react';

export const gaiaCatalogPath = '/catalog/gaia-dr3-nearby';
export const gaiaRecordBytes = 24;
export const gaiaVersion = '3';

export type GaiaSource = {
  id: string;
  position: [number, number, number];
  magnitude: number;
  distance: number;
};

export function readGaiaSourceId(value: string | null) {
  if (!value || !/^[1-9]\d{0,18}$/.test(value)) return null;
  return BigInt(value) <= BigInt('9223372036854775807') ? value : null;
}

export function decodeGaiaSource(data: DataView, offset: number): GaiaSource {
  const position: GaiaSource['position'] = [
    data.getFloat32(offset, true),
    data.getFloat32(offset + 4, true),
    data.getFloat32(offset + 8, true),
  ];
  return {
    id: data.getBigUint64(offset + 16, true).toString(),
    position,
    magnitude: data.getFloat32(offset + 12, true),
    distance: Math.hypot(...position),
  };
}

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

export const gaiaNeighborRadius = 10;
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

async function findGaiaNeighbors(center: GaiaSource['position'], excludeId: string | undefined, signal: AbortSignal) {
  const response = await fetch(gaiaPacketUrl('manifest.json'), { signal });
  if (!response.ok) throw new Error('Gaia manifest unavailable');
  const manifest: GaiaManifest = await response.json();
  const tiles = manifest.tiles.filter((tile) => Math.hypot(...tile.center.map((coordinate, axis) =>
    Math.max(0, Math.abs(coordinate - center[axis]) - manifest.tileSize / 2),
  )) <= gaiaNeighborRadius);

  const packets = await Promise.all(tiles.flatMap((tile) => (['bright', 'detail'] as const)
    .filter((level) => tile[level] > 0)
    .map(async (level) => {
      const packet = await fetch(gaiaPacketUrl(`${tile.id}.${level}.bin`), { signal });
      if (!packet.ok) throw new Error('Gaia tile unavailable');
      const data = new DataView(await packet.arrayBuffer());
      if (data.byteLength !== tile[level] * gaiaRecordBytes) throw new Error('Invalid Gaia tile');
      return data;
    })));

  const neighbors: GaiaNeighbor[] = [];
  for (const data of packets) {
    for (let offset = 0; offset < data.byteLength; offset += gaiaRecordBytes) {
      const separation = Math.hypot(
        data.getFloat32(offset, true) - center[0],
        data.getFloat32(offset + 4, true) - center[1],
        data.getFloat32(offset + 8, true) - center[2],
      );
      if (separation > gaiaNeighborRadius) continue;
      const source = decodeGaiaSource(data, offset);
      if (source.id !== excludeId) neighbors.push({ source, separation });
    }
  }
  return neighbors.sort((a, b) => a.separation - b.separation || a.source.id.localeCompare(b.source.id));
}

type NeighborsResult = { center: GaiaSource['position']; entries: GaiaNeighbor[]; total: number; failed?: boolean };

export function useGaiaNeighbors(center: GaiaSource['position'] | undefined, excludeId?: string) {
  const [result, setResult] = useState<NeighborsResult>();
  useEffect(() => {
    if (!center) return;
    const controller = new AbortController();
    void findGaiaNeighbors(center, excludeId, controller.signal)
      .then((neighbors) => {
        if (!controller.signal.aborted) {
          setResult({ center, entries: neighbors.slice(0, gaiaNeighborLimit), total: neighbors.length });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setResult({ center, entries: [], total: 0, failed: true });
      });
    return () => controller.abort();
  }, [center, excludeId]);
  return center && result?.center === center ? result : undefined;
}
