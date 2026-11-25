import { STELLAR_WIND_RADIUS } from './stellar-wind-density';

export const betelgeusePlumeDensity = /* glsl */ `
  vec4 density(vec3 p) {
    // An irregular envelope surrounds the star, with one broader extension.
    vec3 q = p * ${STELLAR_WIND_RADIUS.toFixed(1)};
    float r = length(q);
    if (r <= 1.0 || r >= 3.35) return vec4(0.0);
    vec3 direction = q / r;
    vec3 axis = normalize(vec3(-0.54, 0.80, 0.20));
    vec3 across = normalize(cross(axis, vec3(0.0, 0.0, 1.0)));
    vec3 depth = cross(across, axis);
    float distance = dot(q, axis);
    float height = max(0.0, distance - 1.0);
    float lateral = dot(q, across);
    float alongDepth = dot(q, depth);
    vec2 bend = vec2(-0.14 * height * height, 0.16 * sin(height * 1.6));
    vec2 offset = vec2(lateral, alongDepth) - bend;
    vec2 width = vec2(0.42, 0.33) + height * vec2(0.55, 0.44);
    vec2 profile = offset / width;
    float broad = noise(vec3(offset * 3.6, height * 3.4) + vec3(0.0, 0.0, -motion));
    float fine = noise(vec3(offset * 9.0, height * 7.0) - vec3(0.0, 0.0, motion * 1.7));
    float fringe = smoothstep(0.25, 0.75, broad * 0.68 + fine * 0.32);
    float strands = exp(-dot(profile, profile) * (1.15 + 0.65 * (1.0 - broad)));
    float plume = strands * smoothstep(0.68, 1.15, distance) * (1.0 - smoothstep(1.48, 3.25, distance));
    plume *= mix(0.52, 1.0, fringe);
    float limb = r - 1.0;
    float patches = noise(direction * 3.8 + vec3(1.3, -2.9, 8.1));
    float wisps = noise(direction * 12.5 + vec3(limb * 5.1 - motion * 0.65));
    float reach = mix(1.58, 2.85, smoothstep(0.28, 0.80, patches));
    float atmosphere = exp(-2.3 * limb) * (1.0 - smoothstep(reach - 0.48, reach, r));
    atmosphere *= mix(0.18, 1.0, smoothstep(0.23, 0.76, patches * 0.66 + wisps * 0.34));
    float total = 1.35 * plume + 2.7 * atmosphere;
    vec3 base = mix(vec3(1.00, 0.43, 0.18), vec3(0.59, 0.18, 0.089), smoothstep(0.0, 2.0, limb));
    vec3 color = mix(base, vec3(1.0, 0.62, 0.31), 0.36 * fringe * exp(-height));
    return vec4(color, total * (1.0 - smoothstep(2.95, 3.35, r)));
  }
`;
