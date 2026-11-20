'use client';

import { OrbitControls, Stars } from '@react-three/drei';
import { useMemo, useRef, type ComponentRef } from 'react';
import { AdditiveBlending, Color, DoubleSide } from 'three';

const diskVertex = /* glsl */ `
  varying vec2 diskPoint;
  void main() {
    diskPoint = uv * 2.0 - 1.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const diskFragment = /* glsl */ `
  varying vec2 diskPoint;
  uniform vec3 tint;
  void main() {
    float r = length(diskPoint);
    float theta = atan(diskPoint.y, diskPoint.x);
    float spiral = 0.6 + 0.4 * sin(theta * 5.0 + 24.0 * sqrt(r) + 2.0 * sin(theta * 3.0));
    float rim = exp(-pow((r - 0.22) / 0.105, 2.0));
    float dust = exp(-r * 4.1) * spiral;
    float alpha = smoothstep(0.13, 0.21, r) * (1.0 - smoothstep(0.55, 1.0, r)) * (0.8 * rim + 0.86 * dust);
    gl_FragColor = vec4(mix(tint, vec3(1.0, 0.95, 0.82), rim), alpha);
    #include <colorspace_fragment>
  }
`;

export function AccretionModel({ object, onExit, showCounterjet }: { object: { color: string; visibleJet: boolean }; onExit: () => void; showCounterjet?: boolean }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const initialDistance = useRef(0);
  const uniforms = useMemo(() => ({ tint: { value: new Color(object.color) } }), [object.color]);
  const jet = useMemo(() => {
    const points = new Float32Array(1800 * 3);
    let seed = 273;
    function random() {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 2 ** 32;
    }
    for (let i = 0; i < 1800; i++) {
      const y = random() * 5.1;
      const width = 0.035 + y * 0.044;
      points.set([Math.sin(y * 1.0) * y * 0.07 + (random() - 0.5) * width, y, (random() - 0.5) * width], i * 3);
    }
    return points;
  }, []);

  return (
    <>
      <Stars radius={65} depth={30} count={1400} factor={2.4} saturation={0} fade speed={0} />
      <group rotation-z={-0.23}>
        <mesh rotation-x={-Math.PI / 2}>
          <planeGeometry args={[12, 12]} />
          <shaderMaterial uniforms={uniforms} vertexShader={diskVertex} fragmentShader={diskFragment} side={DoubleSide} transparent depthWrite={false} blending={AdditiveBlending} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.73, 32, 24]} />
          <meshBasicMaterial color="#050611" />
        </mesh>
        {object.visibleJet &&
          (showCounterjet ? [1, -1] : [1]).map((side) => (
            <points key={side} scale={side}>
              <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[jet, 3]} />
              </bufferGeometry>
              <pointsMaterial color={object.color} size={0.048} transparent opacity={side === 1 ? 0.53 : 0.12} depthWrite={false} blending={AdditiveBlending} />
            </points>
          ))}
      </group>
      <OrbitControls
        ref={controls}
        enablePan={false}
        zoomToCursor
        minDistance={2.4}
        maxDistance={30}
        onStart={() => {
          initialDistance.current = controls.current?.getDistance() ?? 0;
        }}
        onEnd={() => {
          const radius = controls.current?.getDistance() ?? 0;
          if (radius > initialDistance.current && radius >= 25) onExit();
        }}
      />
    </>
  );
}
