import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import { AdditiveBlending, BackSide, CatmullRomCurve3, Color, Quaternion, SphereGeometry, Vector3 } from 'three';
import { seededRandom } from '../../utils/random';

const boundaryVertex = /* glsl */ `
  varying vec3 viewNormal;
  varying vec3 toEye;
  void main() {
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    toEye = -p.xyz;
    viewNormal = normalMatrix * normal;
    gl_Position = projectionMatrix * p;
  }
`;
const boundaryFragment = /* glsl */ `
  varying vec3 viewNormal;
  varying vec3 toEye;
  void main() {
    float edge = 1.0 - abs(dot(normalize(viewNormal), normalize(toEye)));
    gl_FragColor = vec4(0.53, 0.26, 0.10, pow(edge, 4.0) * 0.23);
    #include <colorspace_fragment>
  }
`;
const fieldVertex = /* glsl */ `
  attribute float strength;
  varying float intensity;
  varying vec3 tint;
  void main() {
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    tint = color;
    intensity = strength;
    gl_PointSize = clamp((1.2 + 2.8 * strength) * 540.0 / -p.z, 1.0, 5.0);
    gl_Position = projectionMatrix * p;
  }
`;
const fieldFragment = /* glsl */ `
  varying float intensity;
  varying vec3 tint;
  void main() {
    vec2 p = 2.0 * gl_PointCoord - 1.0;
    float alpha = (1.0 - smoothstep(0.10, 1.0, dot(p, p))) * (0.12 + 0.48 * intensity);
    gl_FragColor = vec4(tint, alpha);
    #include <colorspace_fragment>
  }
`;

type Anchors = { norma?: Vector3; virgo?: Vector3; hydra?: Vector3; fornax?: Vector3 };

function buildFlowModel(span: number, anchors: Anchors) {
  const radius = span / 2;
  const axis = (anchors.norma ?? new Vector3(-1, -0.6, 1)).clone().normalize();
  const orientation = new Quaternion().setFromUnitVectors(new Vector3(1, 0, 0), axis);
  const center = axis.clone().multiplyScalar(radius * 0.28);
  const locate = (x: number, y: number, z: number) => new Vector3(x, y, z).multiplyScalar(radius).applyQuaternion(orientation).add(center);
  const hull = new SphereGeometry(1, 64, 40);
  const shape = hull.getAttribute('position');
  for (let i = 0; i < shape.count; i++) {
    const x = shape.getX(i),
      y = shape.getY(i),
      z = shape.getZ(i);
    const angle = Math.atan2(z, y);
    const ripple = 0.92 + 0.12 * Math.sin(4.0 * x + angle * 3.0) + 0.08 * Math.cos(angle * 5.0 - x * 5.0);
    const pinch = 0.75 + 0.25 * Math.sin(3.9 * x + 0.45);
    const p = locate(x, 0.64 * y * ripple * pinch + 0.13 * Math.sin(x * Math.PI), 0.53 * z * ripple);
    shape.setXYZ(i, p.x, p.y, p.z);
  }
  hull.computeVertexNormals();
  const hullPositions = Float32Array.from(shape.array);
  const hullNormals = Float32Array.from(hull.getAttribute('normal').array);
  const hullIndices = Uint16Array.from(hull.index!.array);
  hull.dispose();

  const convergence = anchors.norma ?? locate(0.56, 0.02, 0.05);
  const origin = new Vector3();
  const virgo = anchors.virgo ?? locate(-0.2, 0.24, 0.1);
  const hydra = anchors.hydra ?? locate(0.19, -0.26, 0.14);
  const fornax = anchors.fornax ?? locate(-0.32, -0.23, -0.18);
  // Curves are illustrative. Observed cluster positions anchor the named junctions.
  const routes = [
    [locate(-0.92, 0.14, -0.05), locate(-0.61, 0.28, -0.1), virgo, locate(0.25, 0.08, -0.11), convergence],
    [locate(-0.74, -0.18, 0.19), locate(-0.55, -0.21, 0.28), origin, locate(0.33, 0.16, 0.08), convergence],
    [locate(0.2, -0.37, 0.15), hydra, locate(0.37, -0.19, 0.12), convergence],
    [locate(-0.67, -0.23, -0.18), fornax, locate(0.1, -0.27, -0.13), convergence],
    [locate(0.91, 0.16, 0.08), locate(0.78, 0.08, 0.17), convergence],
    [locate(0.76, -0.25, -0.09), locate(0.52, -0.23, -0.15), convergence],
    [locate(-0.43, 0.25, 0.37), locate(-0.12, 0.32, 0.25), virgo],
    [locate(0.46, 0.29, -0.26), locate(0.27, 0.2, -0.31), locate(0.16, 0.07, -0.12), convergence],
  ].map((points) => new CatmullRomCurve3(points));

  const random = seededRandom(1219);
  const positions: number[] = [],
    colors: number[] = [],
    strengths: number[] = [];
  const warm = new Color('#ffd294'),
    cool = new Color('#88abcd');
  const tint = new Color();
  for (const route of routes) {
    for (let i = 0; i < 440; i++) {
      const t = random();
      const p = route.getPointAt(t);
      const width = radius * (0.015 + 0.042 * (1 - t));
      p.addScaledVector(new Vector3(random() - 0.5, random() - 0.5, random() - 0.5), width * (1 + 2 * random()));
      const strength = random() ** 2;
      tint.copy(cool).lerp(warm, Math.min(1, 0.24 + 0.58 * t + random() * 0.35));
      positions.push(p.x, p.y, p.z);
      colors.push(tint.r, tint.g, tint.b);
      strengths.push(strength);
    }
  }
  return {
    hullPositions,
    hullNormals,
    hullIndices,
    fieldPositions: Float32Array.from(positions),
    colors: Float32Array.from(colors),
    strengths: Float32Array.from(strengths),
    paths: routes.map((route) => route.getPoints(60)),
  };
}

export function LaniakeaVolume({ span, anchors, showFlows }: { span: number; anchors: Anchors; showFlows: boolean }) {
  const model = useMemo(() => buildFlowModel(span, anchors), [span, anchors]);
  return (
    <>
      <mesh raycast={() => {}}>
        <bufferGeometry>
          <bufferAttribute attach="index" args={[model.hullIndices, 1]} />
          <bufferAttribute attach="attributes-position" args={[model.hullPositions, 3]} />
          <bufferAttribute attach="attributes-normal" args={[model.hullNormals, 3]} />
        </bufferGeometry>
        <shaderMaterial vertexShader={boundaryVertex} fragmentShader={boundaryFragment} side={BackSide} transparent depthWrite={false} blending={AdditiveBlending} />
      </mesh>
      <points raycast={() => {}}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[model.fieldPositions, 3]} />
          <bufferAttribute attach="attributes-color" args={[model.colors, 3]} />
          <bufferAttribute attach="attributes-strength" args={[model.strengths, 1]} />
        </bufferGeometry>
        <shaderMaterial vertexShader={fieldVertex} fragmentShader={fieldFragment} vertexColors transparent depthWrite={false} blending={AdditiveBlending} />
      </points>
      {showFlows && model.paths.map((path, index) => <Line key={index} points={path} color="#f6c486" lineWidth={1.1} opacity={0.52} transparent depthWrite={false} raycast={() => {}} />)}
    </>
  );
}
