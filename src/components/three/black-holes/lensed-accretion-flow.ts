import { spatialNoise } from '../shared/shaders';

export const ACCRETION_SHADOW_RADIUS = 0.73;
export const LENSED_FLOW_DIAMETER = 4.9;

export const lensedAccretionVertex = /* glsl */ `
  varying vec2 point;
  varying vec2 axis;
  varying float inclination;

  void main() {
    point = position.xy;
    vec4 center = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec3 diskNormal = normalize(modelViewMatrix[1].xyz);
    vec3 sightline = normalize(-center.xyz);
    inclination = dot(diskNormal, sightline);
    vec3 apparentNormal = diskNormal - inclination * sightline;
    axis = apparentNormal.xy;
    float scale = length(modelViewMatrix[0].xyz);
    gl_Position = projectionMatrix * (center + vec4(position.xy * scale, 0.0, 0.0));
  }
`;

export const lensedAccretionFragment = /* glsl */ `
  uniform vec3 tint;
  uniform float phase;
  varying vec2 point;
  varying vec2 axis;
  varying float inclination;
  const float shadow = ${ACCRETION_SHADOW_RADIUS.toFixed(2)};
  ${spatialNoise}

  float gaussian(float x) {
    return exp(-x * x);
  }

  void main() {
    float obliquity = 1.0 - smoothstep(0.56, 0.94, abs(inclination));
    float radius = length(point);
    if (radius <= shadow || radius >= 2.40 || obliquity <= 0.001) discard;

    vec2 up = axis / max(length(axis), 0.001);
    vec2 across = vec2(up.y, -up.x);
    vec2 p = vec2(dot(point, across), dot(point, up));
    float balance = clamp(inclination * 2.4, -0.42, 0.42);
    float side = p.y / radius;
    float arcWeight = 0.74 + side * (0.32 + balance * 0.30);
    float angle = atan(p.y, p.x);
    vec2 orbital = vec2(cos(angle - phase), sin(angle - phase));
    float grain = noise(vec3(18.0 * orbital, radius * 16.0));
    float shear = sin(24.0 * radius - 5.0 * angle + 2.0 * phase + 4.1 * grain);

    // Approximate the lensed image of the far disk with nested, tapered arcs.
    // Their ends fan outward so they merge into the direct view of the disk.
    float stretch = mix(1.38, 1.14, abs(side));
    float mainRadius = length(vec2(p.x / stretch, p.y));
    // The phase advances in radius and azimuth, carrying texture inward through the arc.
    float infall = 0.5 + 0.5 * sin(42.0 * mainRadius - 3.0 * (angle - phase) + 2.0 * phase + 1.7 * grain);
    float arcCenter = 1.01 + 0.13 * abs(side) + 0.044 * side + 0.011 * shear;
    float arcWidth = mix(0.20, 0.090, abs(side));
    float directJoin = 0.53 + 0.47 * smoothstep(0.02, 0.38, abs(side));
    float arc = gaussian((mainRadius - arcCenter) / arcWidth) * arcWeight * directJoin;
    float threads = (0.75 + 0.25 * pow(0.5 + 0.5 * shear, 2.0)) * mix(0.87, 1.09, infall);
    float shoulder = gaussian((mainRadius - arcCenter - 0.10) / (arcWidth * 1.42)) * (0.14 + 0.15 * grain) * arcWeight * mix(0.80, 1.14, infall);
    float narrow = gaussian((radius - 0.81) / 0.020) * (0.36 + 0.64 * abs(side)) * (0.58 + 0.42 * grain);
    float horizontal = 1.0 - 0.30 * smoothstep(-1.2, 0.79, p.x);
    float ribbon = gaussian((p.y - 0.073 * sin(p.x * 1.5)) / 0.10) *
      smoothstep(0.76, 1.2, abs(p.x)) * (1.0 - smoothstep(1.53, 2.35, abs(p.x)));
    float alpha = (0.96 * arc * threads + shoulder + 0.32 * narrow + 0.29 * ribbon * threads) * horizontal * obliquity;
    alpha *= smoothstep(shadow, 0.79, radius);
    if (alpha < 0.005) discard;

    vec3 warmRim = mix(tint, vec3(1.0, 0.58, 0.29), 0.31);
    vec3 hotRim = mix(tint * 0.85, vec3(1.0, 0.92, 0.76), 0.80);
    vec3 color = mix(warmRim * 0.72, hotRim, clamp(arc + 0.9 * narrow, 0.0, 1.0));
    gl_FragColor = vec4(color, min(0.88, alpha));
    #include <colorspace_fragment>
  }
`;
