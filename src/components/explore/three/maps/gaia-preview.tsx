import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box3, Frustum, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';

const base = '/catalog/gaia-dr3-nearby';
const tileBudget = 16;
const detailBudget = 5;
const maxDetailPoints = 256;
const cacheBudget = 32;
const recordBytes = 24;

type Tile = { id: string; center: [number, number, number]; bright: number; detail: number };
type Manifest = { tileSize: number; tiles: Tile[] };
type VisibleTile = { tile: Tile; detail: boolean };
type Packet = { positions: Float32Array; colors: Float32Array; data: DataView };
export type GaiaSource = { id: string; magnitude: number; distance: number };

const packets = new Map<string, Packet>();

function GaiaPoints({ tile, level, onSelect }: { tile: Tile; level: 'bright' | 'detail'; onSelect: (source: GaiaSource) => void }) {
  const url = `${base}/${tile.id}.${level}.bin?v=2`;
  const [packet, setPacket] = useState<Packet | undefined>(() => packets.get(url));
  const count = Math.min(tile[level], level === 'detail' ? maxDetailPoints : tile.bright);
  useEffect(() => {
    const cached = packets.get(url);
    if (cached) {
      packets.delete(url);
      packets.set(url, cached);
      return;
    }
    const controller = new AbortController();
    void fetch(url, { signal: controller.signal })
      .then((response) => response.ok ? response.arrayBuffer() : Promise.reject(new Error('Gaia tile unavailable')))
      .then((bytes) => {
        if (controller.signal.aborted || bytes.byteLength !== recordBytes * tile[level]) return;
        const data = new DataView(bytes);
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let index = 0; index < count; index++) {
          const offset = recordBytes * index;
          for (let axis = 0; axis < 3; axis++) positions[index * 3 + axis] = data.getFloat32(offset + axis * 4, true);
          const magnitude = data.getFloat32(offset + 12, true);
          const light = 0.19 + 0.56 * (1 - MathUtils.smoothstep(magnitude, 4, 17));
          colors.set([light, light, light], index * 3);
        }
        const packet = { positions, colors, data: new DataView(bytes.slice(0, recordBytes * count)) };
        packets.set(url, packet);
        if (packets.size > cacheBudget) {
          const oldest = packets.keys().next().value;
          if (oldest !== undefined) packets.delete(oldest);
        }
        setPacket(packet);
      }).catch(() => { /* A failed tile leaves the existing map available. */ });
    return () => controller.abort();
  }, [count, level, tile, url]);

  if (!packet) return null;
  return (
    <points onClick={(event) => {
      if (event.delta > 4 || event.index === undefined) return;
      const hit = event.intersections
        .filter((intersection) => intersection.index !== undefined)
        .reduce((closest, intersection) => (intersection.distanceToRay ?? Infinity) < (closest.distanceToRay ?? Infinity) ? intersection : closest, event);
      if (hit.object !== event.object || hit.index === undefined) return;
      event.stopPropagation();
      const offset = hit.index * recordBytes;
      const { data } = packet;
      onSelect({
        id: data.getBigUint64(offset + 16, true).toString(),
        magnitude: data.getFloat32(offset + 12, true),
        distance: Math.hypot(data.getFloat32(offset, true), data.getFloat32(offset + 4, true), data.getFloat32(offset + 8, true)),
      });
    }}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[packet.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[packet.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial vertexColors size={level === 'bright' ? 2.3 : 1.25} sizeAttenuation={false} transparent opacity={level === 'bright' ? 0.82 : 0.6} depthWrite={false} />
    </points>
  );
}

export function GaiaPreview({ rotation, center, overviewDistance, onSelect, onExit }: { rotation: Quaternion; center: Vector3; overviewDistance: number; onSelect: (source: GaiaSource) => void; onExit: () => void }) {
  const [manifest, setManifest] = useState<Manifest>();
  const [visibleTiles, setVisibleTiles] = useState<VisibleTile[]>([]);
  const selection = useRef('');
  const active = useRef(false);
  const nextSample = useRef(0);
  const projection = useMemo(() => new Matrix4(), []);
  const frustum = useMemo(() => new Frustum(), []);
  const bounds = useMemo(() => {
    if (!manifest) return [];
    const transform = new Matrix4().makeRotationFromQuaternion(rotation);
    const size = new Vector3().setScalar(manifest.tileSize);
    return manifest.tiles.map((tile) => {
      const position = new Vector3(...tile.center);
      return { tile, box: new Box3().setFromCenterAndSize(position, size).applyMatrix4(transform), position: position.applyQuaternion(rotation) };
    });
  }, [manifest, rotation]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${base}/manifest.json?v=2`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<Manifest> : Promise.reject(new Error('Gaia manifest unavailable')))
      .then((data) => { if (!controller.signal.aborted) setManifest(data); })
      .catch(() => { /* The base map remains available. */ });
    return () => controller.abort();
  }, []);

  useFrame(({ camera, size }, delta) => {
    if (!manifest) return;
    nextSample.current -= delta;
    if (nextSample.current > 0) return;
    nextSample.current = 0.18;
    const distanceToCenter = camera.position.distanceTo(center);
    const wasActive = active.current;
    active.current = distanceToCenter < overviewDistance * (wasActive ? 0.94 : 0.86);
    if (!active.current) {
      if (wasActive) {
        selection.current = '';
        setVisibleTiles([]);
        onExit();
      }
      return;
    }
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const detail = distanceToCenter < overviewDistance * 0.65;
    const ranked = bounds.filter(({ box }) => frustum.intersectsBox(box)).map(({ tile, position }) => ({
      tile, distance: camera.position.distanceTo(position),
    })).sort((a, b) => a.distance - b.distance || a.tile.id.localeCompare(b.tile.id));
    let remainingDetail = detail ? detailBudget : 0;
    const next = ranked.slice(0, tileBudget).map(({ tile, distance }) => {
      const detailed = remainingDetail > 0 && tile.detail > 0 && manifest.tileSize * camera.projectionMatrix.elements[5] * size.height / distance > 38;
      if (detailed) remainingDetail--;
      return { tile, detail: detailed };
    });
    const key = next.map(({ tile, detail: detailed }) => detailed ? `${tile.id}+` : tile.id).sort().join(',');
    if (selection.current === key) return;
    selection.current = key;
    setVisibleTiles(next);
  });

  return (
    <group quaternion={rotation}>
      {visibleTiles.map(({ tile, detail }) => (
        <group key={tile.id}>
          <GaiaPoints tile={tile} level="bright" onSelect={onSelect} />
          {detail && <GaiaPoints tile={tile} level="detail" onSelect={onSelect} />}
        </group>
      ))}
    </group>
  );
}
