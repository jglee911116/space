// Gaia 표본 파일 형식 — 서버(validate-catalog)와 클라이언트가 같이 쓰므로 React 의존이 없어야 한다.
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
  const position: GaiaSource['position'] = [data.getFloat32(offset, true), data.getFloat32(offset + 4, true), data.getFloat32(offset + 8, true)];
  return {
    id: data.getBigUint64(offset + 16, true).toString(),
    position,
    magnitude: data.getFloat32(offset + 12, true),
    distance: Math.hypot(...position),
  };
}

/** 표본 바깥 경계(manifest maxDistanceLightYears, validate-catalog 가 일치를 검사). */
export const gaiaSampleRadiusLightYears = 163;
