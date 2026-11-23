import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Box3, Frustum, MathUtils, Matrix4, Quaternion, Vector3 } from 'three';

const base = '/catalog/gaia-dr3-nearby';
const tileBudget = 16;
const detailBudget = 5;

type Tile = { id: string; center: [number, number, number]; bright: number; detail: number };
type Manifest = { tileSize: number; tiles: Tile[] };
type VisibleTile = { tile: Tile; detail: boolean };
type Packet = { positions: Float32Array; colors: Float32Array };

function GaiaPoints({ tile, level }: { tile: Tile; level: 'bright' | 'detail' }) {
  const [packet, setPacket] = useState<Packet>();
  const count = tile[level];
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${base}/${tile.id}.${level}.bin`, { signal: controller.signal })
      .then((response) => response.ok ? response.arrayBuffer() : Promise.reject(new Error('Gaia tile unavailable')))
      .then((bytes) => {
        if (controller.signal.aborted || bytes.byteLength !== 16 * count) return;
        const data = new DataView(bytes);
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let index = 0; index < count; index++) {
          const offset = 16 * index;
          for (let axis = 0; axis < 3; axis++) positions[index * 3 + axis] = data.getFloat32(offset + axis * 4, true);
          const magnitude = data.getFloat32(offset + 12, true);
          const light = 0.19 + 0.56 * (1 - MathUtils.smoothstep(magnitude, 4, 17));
          colors.set([light, light, light], index * 3);
        }
        setPacket({ positions, colors });
      }).catch(() => { /* A failed tile leaves the existing map available. */ });
    return () => controller.abort();
  }, [count, level, tile.id]);

  if (!packet) return null;
  return (
    <points raycast={() => {}}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[packet.positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[packet.colors, 3]} />
      </bufferGeometry>
      <pointsMaterial vertexColors size={level === 'bright' ? 2.3 : 1.25} sizeAttenuation={false} transparent opacity={level === 'bright' ? 0.82 : 0.6} depthWrite={false} />
    </points>
  );
}

export function GaiaPreview({ rotation, center, overviewDistance }: { rotation: Quaternion; center: Vector3; overviewDistance: number }) {
  const [manifest, setManifest] = useState<Manifest>();
  const [visibleTiles, setVisibleTiles] = useState<VisibleTile[]>([]);
  const selection = useRef('');
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
    void fetch(`${base}/manifest.json`, { signal: controller.signal })
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
    camera.updateMatrixWorld();
    frustum.setFromProjectionMatrix(projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const detail = camera.position.distanceTo(center) < overviewDistance * 0.84;
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
          <GaiaPoints tile={tile} level="bright" />
          {detail && <GaiaPoints tile={tile} level="detail" />}
        </group>
      ))}
    </group>
  );
}
