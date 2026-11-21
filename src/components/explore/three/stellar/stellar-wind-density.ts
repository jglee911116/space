// The parent volume uses the same normalized photosphere for all stellar winds.
export const STELLAR_WIND_RADIUS = 3.4;

export const rigelWindDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec3 q = p * ${STELLAR_WIND_RADIUS.toFixed(1)};
    float r = length(q);
    if (r <= 1.0 || r >= 3.2) return vec4(0.0);
    vec3 direction = q / r;
    float limb = r - 1.0;
    vec3 bent = normalize(direction + vec3(0.06 * limb * direction.z, 0.0, -0.06 * limb * direction.x));
    float broad = noise(bent * 5.0 + 17.0);
    float strands = noise(bent * 33.0 + vec3(limb * 4.8 - motion * 1.65, 2.0, -3.0));
    float knots = noise(vec3(limb * 9.0 - motion * 3.1, direction.xz * 12.0));
    float flow = smoothstep(0.40, 0.76, broad * 0.34 + strands * 0.66);
    float gas = (0.16 + flow * (0.72 + 0.55 * knots)) * exp(-1.80 * limb);
    gas *= (1.0 - smoothstep(2.25, 3.2, r)) * (0.61 + 0.39 * broad);
    return vec4(mix(vec3(0.25, 0.48, 0.81), vec3(0.69, 0.83, 1.0), flow), gas * 2.0);
  }
`;

export const solarWindDensity = /* glsl */ `
  vec4 density(vec3 p) {
    vec3 q = p * ${STELLAR_WIND_RADIUS.toFixed(1)};
    float r = length(q);
    if (r <= 1.0 || r >= 3.2) return vec4(0.0);
    vec3 direction = q / r;
    float limb = r - 1.0;
    float lanes = noise(direction * 22.0 + 7.0);
    float textureFlow = noise(direction * 13.0 + vec3(limb * 6.0 - motion, 0.0, 0.0));
    float streamers = smoothstep(0.35, 0.84, 0.60 * lanes + 0.40 * textureFlow);
    float equator = 1.0 - smoothstep(0.16, 0.81, abs(direction.y + 0.18 * direction.x));
    float corona = (0.25 + 0.75 * streamers) * exp(-3.6 * limb) * (0.56 + 0.44 * equator);

    // An occasional local cloud rises through the persistent coronal streamers.
    float event = fract(motion / 10.0 + 0.035);
    float outflow = clamp(event / 0.32, 0.0, 1.0);
    float opening = mix(32.0, 12.0, outflow);
    vec3 axis = normalize(vec3(-0.91, 0.42, 0.15));
    float fan = exp(-(1.0 - dot(axis, direction)) * opening);
    float shell = (limb - outflow * 1.85) / mix(0.10, 0.29, outflow);
    float ejecta = fan * exp(-shell * shell) * smoothstep(0.01, 0.055, event) *
      (1.0 - smoothstep(0.16, 0.32, event)) * (0.35 + 0.65 * textureFlow);
    float gas = (1.22 * corona + 2.05 * ejecta) * (1.0 - smoothstep(2.72, 3.2, r));
    return vec4(mix(vec3(0.78, 0.60, 0.35), vec3(1.00, 0.51, 0.19), clamp(ejecta * 1.5, 0.0, 1.0)), gas);
  }
`;
