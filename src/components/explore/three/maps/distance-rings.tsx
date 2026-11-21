import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import { useLanguage } from '@/i18n/language';
import { formatLightYearDistance } from '../../utils/distance-scale';
import { GalacticMarker } from './galactic-marker';

const ring = Array.from({ length: 129 }, (_, index) => {
  const angle = index * Math.PI / 64;
  return new Vector3(Math.cos(angle), 0, Math.sin(angle));
});
const fractions = [0.25, 0.5, 0.75, 1];

export function DistanceRings({ center, outerRadius, lightYearsPerUnit, showReferencePlanes = false }: {
  center?: Vector3;
  outerRadius: number;
  lightYearsPerUnit: number;
  showReferencePlanes?: boolean;
}) {
  const { locale, number } = useLanguage();
  return (
    <group position={center}>
      {fractions.map((fraction, index) => {
        const radius = outerRadius * fraction;
        const anchor = ring[index === 0 ? 16 : 24];
        const label = formatLightYearDistance(radius * lightYearsPerUnit, locale, number);
        return (
          <group key={fraction}>
            <group scale={radius}>
              <Line points={ring} color="#859ad8" transparent opacity={fraction === 1 ? 0.46 : 0.16} depthWrite={false} raycast={() => {}} />
              {showReferencePlanes && fraction === 1 && (
                <>
                  <Line points={ring} rotation-x={Math.PI / 2} color="#859ad8" transparent opacity={0.24} depthWrite={false} raycast={() => {}} />
                  <Line points={ring} rotation-z={Math.PI / 2} color="#859ad8" transparent opacity={0.24} depthWrite={false} raycast={() => {}} />
                </>
              )}
            </group>
            <group position={[anchor.x * radius, 0, anchor.z * radius]}>
              <GalacticMarker name={label} labelOffset={0.27} priority={-1} distanceLabel />
            </group>
          </group>
        );
      })}
    </group>
  );
}
