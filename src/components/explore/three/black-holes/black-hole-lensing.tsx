import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BackSide, Vector2, Vector3, type Mesh } from 'three';

export const blackHoleBillboardVertex = /* glsl */ `
  varying vec2 screenPoint;
  void main() {
    screenPoint = uv * 2.0 - 1.0;
    vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec2 scale = vec2(length(modelViewMatrix[0].xyz), length(modelViewMatrix[1].xyz));
    gl_Position = projectionMatrix * (center + vec4(position.xy * scale, 0.0, 0.0));
  }
`;

const skyVertex = /* glsl */ `
  varying vec3 skyDirection;

  void main() {
    skyDirection = position;
    // Keep the sky centered on the camera while preserving its world orientation.
    gl_Position = projectionMatrix * (viewMatrix * vec4(position, 0.0));
    gl_Position.z = gl_Position.w;
  }
`;

const skyFragment = /* glsl */ `
  uniform float einsteinRadius;
  uniform vec2 fadeRange;
  uniform vec3 lensCenter;
  varying vec3 skyDirection;

  float hash(vec2 cell) {
    return fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453);
  }

  float stars(vec2 source, float width, float threshold) {
    vec2 cell = floor(source);
    vec2 center = 0.30 + 0.40 * vec2(hash(cell + 7.0), hash(cell + 19.0));
    float distanceToStar = length(fract(source) - center);
    float brightness = smoothstep(threshold, 1.0, hash(cell));
    float edge = clamp(fwidth(distanceToStar), 0.012, 0.09);
    return (1.0 - smoothstep(width, width + edge, distanceToStar)) * brightness;
  }

  vec2 skyCoordinates(vec3 direction) {
    vec3 axis = abs(direction);
    if (axis.x >= axis.y && axis.x >= axis.z) {
      return direction.yz / axis.x + vec2(direction.x > 0.0 ? 0.0 : 4.0, 0.0);
    }
    if (axis.y >= axis.z) {
      return direction.zx / axis.y + vec2(direction.y > 0.0 ? 8.0 : 12.0, 0.0);
    }
    return direction.xy / axis.z + vec2(direction.z > 0.0 ? 16.0 : 20.0, 0.0);
  }

  void main() {
    vec3 ray = normalize(skyDirection);
    vec3 offset = lensCenter - cameraPosition;
    float cameraDistance = max(length(offset), 0.00000001);
    vec3 lensDirection = offset / cameraDistance;
    float alignment = dot(ray, lensDirection);
    vec3 source = ray;
    if (alignment > 0.001) {
      vec3 imageOffset = ray / alignment - lensDirection;
      float radius = einsteinRadius / cameraDistance;
      // Trace the image-plane ray back to its source using the point-mass lens equation.
      float deflection = radius * radius / max(dot(imageOffset, imageOffset), 0.00001);
      source = normalize(lensDirection + imageOffset * (1.0 - deflection));
    }

    vec2 sky = skyCoordinates(source);
    float distantStars = stars(sky * 35.0, 0.027, 0.66);
    float brightStars = stars(sky * 18.0 + vec2(0.33, 0.71), 0.045, 0.72);
    vec3 color = vec3(0.003, 0.0035, 0.006);
    float visibility = fadeRange.y > fadeRange.x ? 1.0 - smoothstep(fadeRange.x, fadeRange.y, cameraDistance) : 1.0;
    color += visibility * (distantStars * vec3(0.21, 0.30, 0.48) + brightStars * vec3(0.74, 0.80, 0.97));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

export function LensedStarfield({ einsteinRadius, fadeRange, center }: { einsteinRadius: number; fadeRange?: readonly [number, number]; center?: readonly [number, number, number] }) {
  const sky = useRef<Mesh>(null);
  const uniforms = useMemo(() => ({
    einsteinRadius: { value: einsteinRadius },
    fadeRange: { value: new Vector2(...(fadeRange ?? [0, 0])) },
    lensCenter: { value: new Vector3(...(center ?? [0, 0, 0])) },
  }), [center, einsteinRadius, fadeRange]);
  useFrame(({ camera }) => {
    if (sky.current) sky.current.visible = !fadeRange || camera.position.distanceToSquared(uniforms.lensCenter.value) < fadeRange[1] * fadeRange[1];
  });
  return (
    <mesh ref={sky} frustumCulled={false} renderOrder={-100}>
      <sphereGeometry args={[1, 24, 16]} />
      <shaderMaterial uniforms={uniforms} vertexShader={skyVertex} fragmentShader={skyFragment} side={BackSide} depthTest={false} depthWrite={false} />
    </mesh>
  );
}
